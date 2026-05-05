"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, ShieldOff, AlertTriangle, Car, TrendingDown, Loader2, CreditCard, CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getVehicles, updateTrakzee, updateVehicleExpiry, getRemovedVehicles, type Vehicle } from "@/lib/vehicles-api";
import { sendVehicleSms } from "@/lib/sms-api";
import { savePayment } from "@/lib/payment-history";
import { getPlans, type Plan } from "@/lib/plans-api";
import { cn } from "@/lib/utils";
import { computeStatus, calculateOwed } from "@/lib/vehicle-status";

/** Utility: Add months to YYYY-MM-DD */
function addMonths(dateStr: string, months: number): string {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split("T")[0];
}

/** Utility: Today as YYYY-MM-DD */
function todayISO(): string {
    return new Date().toISOString().split("T")[0];
}

export default function RemovedView() {
    const [search, setSearch] = useState("");
    const [removedList, setRemovedList] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [trakzeeLoading, setTrakzeeLoading] = useState<string | null>(null);
    const [viewFilter, setViewFilter] = useState<"all" | "pending">("all");

    // ── pay dialog state ──────────────────────────────────────────────────
    const [payTarget, setPayTarget] = useState<Vehicle | null>(null);
    const [restoring, setRestoring] = useState(false);
    const [payError, setPayError] = useState<string | null>(null);
    const [payForm, setPayForm] = useState({
        year: new Date().getFullYear().toString(),
        months: "1",
        amount: "0",
        plan: "",
        manualDebt: "0",
    });

    const [smsLoading, setSmsLoading] = useState<string | null>(null);

    const [plans, setPlans] = useState<Plan[]>([]);

    const fetchRemoved = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch both active and removed to ensure we catch everything that should be removed
            const [activeData, removedData] = await Promise.all([
                getVehicles(), 
                getRemovedVehicles()
            ]);

            const all = [...(activeData || []), ...(removedData || [])];
            const unique = Array.from(new Map(all.map(v => [v.id, v])).values());

            const filtered = unique.filter(v => {
                const s = computeStatus(v.expiry_date, v.status);
                // Strict: Only show Removed or Expired vehicles here
                return s === "Removed" || s === "Expired" || s === "Suspended" || v.status === "Removed";
            });
            setRemovedList(filtered);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSendSms = async (v: Vehicle) => {
        setSmsLoading(v.id);
        try {
            const result = await sendVehicleSms(v.id);
            setRemovedList(prev => prev.map(item => 
                item.id === v.id ? { ...item, sms_status: result.smsStatus, sms_sent_at: new Date().toISOString() } : item
            ));
        } catch {
            // silent fail
        } finally {
            setSmsLoading(null);
        }
    };

    useEffect(() => {
        fetchRemoved();
        getPlans().then(setPlans).catch(() => {});
    }, [fetchRemoved]);

    const filtered = useMemo(() => {
        let list = removedList;
        if (viewFilter === "pending") {
            list = list.filter(v => v.trakzee_status === "Active");
        }
        if (!search) return list;
        const s = search.toLowerCase();
        return list.filter(v => 
            v.plate_number.toLowerCase().includes(s) ||
            (v.customer_name || "").toLowerCase().includes(s) ||
            v.imei.toLowerCase().includes(s)
        );
    }, [removedList, search, viewFilter]);

    const handleToggleTrakzee = async (v: Vehicle) => {
        setTrakzeeLoading(v.id);
        try {
            const next = v.trakzee_status === "Active" ? "Deactivated" : "Active";
            const updated = new Date().toISOString();
            await updateTrakzee(v.id, next);
            setRemovedList(prev => prev.map(item => item.id === v.id ? { ...item, trakzee_status: next, updated_at: updated } : item));
        } finally {
            setTrakzeeLoading(null);
        }
    };

    const openPayDialog = (v: Vehicle) => {
        const currentPrice = plans.find(p => p.name === v.plan)?.price || v.monthly_amount;
        const debt = calculateOwed(v.expiry_date, Number(currentPrice), v.trakzee_status);
        setPayTarget(v);
        setPayError(null);
        setPayForm({
            year: new Date().getFullYear().toString(),
            months: "1",
            plan: v.plan,
            manualDebt: String(Math.max(0, debt)), // Ensure no negative debt
            amount: (Math.max(0, debt) + Number(currentPrice)).toFixed(2)
        });
    };

    const handleRestore = async () => {
        if (!payTarget) return;
        setRestoring(true);
        setPayError(null);
        try {
            const sp = plans.find(p => p.name === payForm.plan) || { price: payTarget.monthly_amount };
            const selectedMonths = parseInt(payForm.months);
            const subAmount = sp.price * selectedMonths;
            const debtAmount = parseFloat(payForm.manualDebt) || 0;
            const total = subAmount + debtAmount;

            // 1. Update Expiry Date on Backend
            const enteredYear = parseInt(payForm.year) || new Date().getFullYear();
            const yearStart = `${enteredYear}-01-01`;
            const startStr = yearStart > todayISO() ? yearStart : todayISO();
            const newExpiryStr = addMonths(startStr, selectedMonths);

            await updateVehicleExpiry(payTarget.id, newExpiryStr);

            // 2. Save Payment History
            await savePayment({
                vehicleId: payTarget.id,
                vehiclePlate: payTarget.plate_number,
                ownerName: payTarget.customer_name,
                ownerType: payTarget.company_id ? "company" : "individual",
                planName: payTarget.plan,
                year: enteredYear,
                months: selectedMonths,
                amountGhs: total,
                paidAt: new Date().toISOString()
            });

            setPayTarget(null);
            fetchRemoved();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to restore vehicle.";
            setPayError(message);
        } finally {
            setRestoring(false);
        }
    };

    const pendingDeactivation = removedList.filter(v => v.trakzee_status === "Active").length;
    const frozenArrears = removedList.filter(v => v.trakzee_status === "Deactivated").length;
    const totalArrears = removedList.reduce((sum, v) => {
        const p = plans.find(pl => pl.name === v.plan)?.price || v.monthly_amount;
        return sum + calculateOwed(v.expiry_date, Number(p), v.trakzee_status);
    }, 0);

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
            {/* Header section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2 flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5 text-foreground">
                            <div className="p-2 rounded-xl bg-red-100 text-red-600">
                                <ShieldOff size={22} />
                            </div>
                            Expired Vehicles
                        </h1>
                        <p className="text-muted-foreground text-sm font-medium">Manage expired subscriptions and track deactivation status.</p>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by plate..."
                            className="pl-10 h-11 bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-red-500/20 rounded-xl"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 lg:col-span-2">
                    <button 
                        onClick={() => setViewFilter("all")}
                        className={cn(
                            "bg-card border p-4 rounded-2xl shadow-sm flex flex-col justify-center text-left transition-all hover:scale-[1.02] active:scale-[0.98]",
                            viewFilter === "all" ? "border-foreground ring-1 ring-foreground" : "border-border"
                        )}
                    >
                        <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-widest">Total Expired</p>
                        <p className="text-2xl font-black text-foreground">{removedList.length}</p>
                    </button>
                    <button 
                        onClick={() => setViewFilter(viewFilter === "pending" ? "all" : "pending")}
                        className={cn(
                            "bg-card border p-4 rounded-2xl shadow-sm flex flex-col justify-center text-left transition-all hover:scale-[1.02] active:scale-[0.98]",
                            viewFilter === "pending" ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500" : 
                            (pendingDeactivation > 0 ? "border-amber-200 bg-amber-50" : "border-border")
                        )}
                    >
                        <div className="flex items-center gap-1.5 mb-1">
                            <p className={cn("text-[0.6rem] font-bold uppercase tracking-widest", pendingDeactivation > 0 ? "text-amber-700" : "text-muted-foreground")}>Pending Deactivation</p>
                            {pendingDeactivation > 0 && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />}
                        </div>
                        <p className={cn("text-2xl font-black", pendingDeactivation > 0 ? "text-amber-700" : "text-foreground")}>{pendingDeactivation}</p>
                    </button>
                </div>
            </div>

            {/* Arrears Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-red-100 text-red-600">
                            <TrendingDown size={16} />
                        </div>
                        <div>
                            <p className="text-[0.65rem] font-bold text-red-700 uppercase tracking-widest">Total Arrears</p>
                            <p className="text-xl font-black text-red-600 tabular-nums">GH₵{totalArrears.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-emerald-100 text-emerald-600">
                            <CheckCircle2 size={16} />
                        </div>
                        <div>
                            <p className="text-[0.65rem] font-bold text-emerald-700 uppercase tracking-widest">Frozen Arrears (Deactivated)</p>
                            <p className="text-xl font-black text-emerald-700">{frozenArrears} <span className="text-xs font-medium opacity-70">Vehicles</span></p>
                        </div>
                    </div>
                    <Badge variant="outline" className="bg-white/50 border-emerald-200 text-emerald-700 font-bold uppercase text-[0.6rem]">Cost Stopped</Badge>
                </div>
            </div>

            {/* List Section */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="hidden sm:grid grid-cols-[1.5fr_1fr_0.6fr_0.7fr_0.8fr_0.6fr_0.6fr_0.6fr_120px] gap-4 px-6 py-4 border-b border-border bg-muted/30">
                    {["Customer", "Vehicle", "Plan", "Expiry", "Owed", "Trakzee", "SMS", "Status", "Action"].map((col) => (
                        <span key={col} className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">{col}</span>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground text-sm font-medium">
                        <Loader2 size={18} className="animate-spin text-red-500" /> Loading…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                        <div className="p-4 rounded-full bg-muted/50">
                            <ShieldOff size={32} className="opacity-20" />
                        </div>
                        <p className="text-sm font-medium">{search ? "No records match your search." : "Registry is clear. No removed vehicles."}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {filtered.map((s) => {
                            const expiry = new Date(s.expiry_date);
                            expiry.setHours(0,0,0,0);
                            const today = new Date(); today.setHours(0,0,0,0);
                            const isExpired = expiry < today;
                            const expiryLabel = expiry.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                            const currentPrice = plans.find(p => p.name === s.plan)?.price || s.monthly_amount;
                            const owed = calculateOwed(s.expiry_date, Number(currentPrice), s.trakzee_status);

                            return (
                                <div key={s.id} className="hover:bg-muted/10 transition-colors">
                                    <div className="hidden sm:grid grid-cols-[1.5fr_1fr_0.6fr_0.7fr_0.8fr_0.6fr_0.6fr_0.6fr_120px] gap-4 items-center px-6 py-5">
                                        {/* Customer */}
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-foreground truncate">{s.customer_name}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{s.phone}</p>
                                        </div>

                                        {/* Vehicle */}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <Car size={12} className="text-muted-foreground shrink-0" />
                                                <span className="font-black text-sm text-foreground">{s.plate_number}</span>
                                            </div>
                                            <p className="font-mono text-[0.65rem] text-muted-foreground mt-1 truncate tracking-tight">{s.imei}</p>
                                        </div>

                                        {/* Plan */}
                                        <div>
                                            <Badge variant="outline" className="text-[0.65rem] font-black px-2 py-0.5 bg-orange-50 text-odg-orange border-orange-200 uppercase tracking-tighter">
                                                {s.plan}
                                            </Badge>
                                        </div>

                                        {/* Expiry */}
                                        <div className="flex flex-col">
                                            <span className={cn("text-xs font-bold whitespace-nowrap", isExpired ? "text-red-500" : "text-muted-foreground")}>
                                                {expiryLabel}
                                            </span>
                                            <span className="text-[0.6rem] text-muted-foreground uppercase font-medium">Expired Date</span>
                                        </div>

                                        {/* Owed */}
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-red-600 tabular-nums">GH₵{owed.toFixed(2)}</span>
                                            <span className="text-[0.6rem] text-red-400 font-bold uppercase tracking-tighter">Arrears Due</span>
                                        </div>

                                        {/* Trakzee */}
                                        <div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggleTrakzee(s)}
                                                disabled={trakzeeLoading === s.id}
                                                className={cn(
                                                    "h-7 px-2 rounded-lg gap-1 font-bold text-[0.65rem] transition-all border",
                                                    s.trakzee_status === "Active" 
                                                        ? "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 animate-pulse" 
                                                        : "text-zinc-500 bg-zinc-50 border-zinc-200 hover:bg-zinc-100"
                                                )}
                                            >
                                                {trakzeeLoading === s.id ? <Loader2 size={10} className="animate-spin" /> : s.trakzee_status}
                                            </Button>
                                        </div>

                                        {/* SMS Status */}
                                        <div>
                                            <div className="flex flex-col items-center gap-1">
                                                {s.sms_status === 'Sent' ? (
                                                    <Badge variant="outline" className="text-[0.6rem] font-bold px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 whitespace-nowrap">✓ Sent</Badge>
                                                ) : s.sms_status === 'Failed' ? (
                                                    <Badge variant="outline" className="text-[0.6rem] font-bold px-1.5 py-0 bg-red-50 text-red-700 border-red-200 whitespace-nowrap">✕ Failed</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[0.6rem] font-bold px-1.5 py-0 bg-zinc-50 text-zinc-500 border-zinc-200 whitespace-nowrap">Pending</Badge>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleSendSms(s)}
                                                    disabled={smsLoading === s.id}
                                                    className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                                                >
                                                    {smsLoading === s.id ? <Loader2 size={10} className="animate-spin" /> : <MessageSquare size={10} />}
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <Badge variant="outline" className="text-[0.6rem] font-black px-2 py-0 bg-red-600 text-white border-red-600 shadow-sm uppercase tracking-wider">
                                                {s.status === "Suspended" ? "Suspended" : "Removed"}
                                            </Badge>
                                        </div>

                                        {/* Action */}
                                        <Button
                                            size="sm"
                                            onClick={() => openPayDialog(s)}
                                            className="h-9 px-4 text-[0.65rem] font-black gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-md uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        >
                                            <CreditCard size={12} /> Pay
                                        </Button>
                                    </div>

                                    {/* Mobile card logic preserved but simplified */}
                                    <div className="sm:hidden px-4 py-5 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-black text-foreground">{s.plate_number}</p>
                                                <p className="text-xs text-muted-foreground">{s.customer_name}</p>
                                            </div>
                                            <Badge variant="outline" className="text-[0.6rem] font-black bg-red-600 text-white border-red-600 uppercase">
                                                Removed
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 py-3 border-y border-border/50">
                                            <div>
                                                <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-widest">Amount Owed</p>
                                                <p className="text-sm font-black text-red-600 tabular-nums">GH₵{owed.toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-widest">Expired On</p>
                                                <p className="text-sm font-bold text-foreground">{expiryLabel}</p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => openPayDialog(s)}
                                            className="w-full h-11 text-xs font-black gap-2 bg-emerald-600 hover:bg-emerald-700 text-white uppercase tracking-widest shadow-lg"
                                        >
                                            <CreditCard size={14} /> Record Payment &amp; Restore
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Pay Dialog */}
            <Dialog open={!!payTarget} onOpenChange={(open) => { if (!open) setPayTarget(null); }}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0 border-0 shadow-2xl">
                    <div className="overflow-y-auto flex-1 p-6 space-y-6">
                        <DialogHeader className="space-y-1">
                            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                                    <CreditCard size={18} />
                                </div>
                                Record Payment &amp; Restore
                            </DialogTitle>
                            <DialogDescription className="text-xs font-medium">
                                Restoring service for <span className="text-foreground font-bold underline decoration-emerald-500/30">{payTarget?.plate_number}</span>
                            </DialogDescription>
                        </DialogHeader>

                        {payError && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-[0.7rem] text-red-600 font-bold flex items-center gap-2 animate-pulse">
                                <AlertTriangle size={14} /> {payError}
                            </div>
                        )}

                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-widest">Subscription Year</Label>
                                    <Input
                                        type="number"
                                        value={payForm.year}
                                        onChange={(e) => setPayForm({ ...payForm, year: e.target.value })}
                                        className="h-11 font-bold focus:ring-emerald-500/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-widest">Months to Add</Label>
                                    <Select
                                        value={payForm.months}
                                        onValueChange={(val) => {
                                            const sp = plans.find(p => p.name === payForm.plan) || { price: payTarget?.monthly_amount ?? 0 };
                                            const debt = parseFloat(payForm.manualDebt) || 0;
                                            const months = parseInt(val);
                                            setPayForm({ ...payForm, months: val, amount: (debt + sp.price * months).toFixed(2) });
                                        }}
                                    >
                                        <SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Months" /></SelectTrigger>
                                        <SelectContent>
                                            {[1,2,3,4,5,6,12].map(m => (
                                                <SelectItem key={m} value={String(m)}>{m} Month{m > 1 ? 's' : ''}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[0.65rem] font-bold uppercase tracking-widest text-red-500">Unpaid Debt (Arrears)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-red-400">GH₵</span>
                                    <Input
                                        type="number"
                                        value={payForm.manualDebt}
                                        onChange={(e) => {
                                            const debt = e.target.value;
                                            const sp = plans.find(p => p.name === payForm.plan) || { price: payTarget?.monthly_amount ?? 0 };
                                            const months = parseInt(payForm.months);
                                            setPayForm({ ...payForm, manualDebt: debt, amount: (parseFloat(debt || "0") + sp.price * months).toFixed(2) });
                                        }}
                                        className="h-11 pl-12 font-black text-red-600 bg-red-50 border-red-100 focus:ring-red-500/20"
                                    />
                                </div>
                                <p className="text-[0.6rem] text-muted-foreground italic">Calculated automatically based on expiry date.</p>
                            </div>

                            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col gap-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground font-medium">New Subscription ({payForm.months} mo)</span>
                                    <span className="font-bold">GH₵{((plans.find(p => p.name === payForm.plan)?.price || Number(payTarget?.monthly_amount || 0)) * parseInt(payForm.months)).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground font-medium">Arrears</span>
                                    <span className="font-bold text-red-500">GH₵{(parseFloat(payForm.manualDebt) || 0).toFixed(2)}</span>
                                </div>
                                <div className="h-px bg-border my-1" />
                                <div className="flex justify-between items-center">
                                    <span className="text-[0.65rem] font-black uppercase tracking-widest text-foreground">Total to Pay</span>
                                    <span className="text-lg font-black text-emerald-600 tabular-nums">GH₵{payForm.amount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-muted/20 border-t border-border">
                        <Button 
                            className="w-full h-12 text-sm font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                            disabled={restoring}
                            onClick={handleRestore}
                        >
                            {restoring ? <><Loader2 size={16} className="animate-spin mr-2" /> Restoring…</> : <><CheckCircle2 size={16} className="mr-2" /> Confirm &amp; Restore Vehicle</>}
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="w-full h-10 mt-2 text-xs font-bold text-muted-foreground uppercase tracking-widest"
                            onClick={() => setPayTarget(null)}
                            disabled={restoring}
                        >
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
