"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, ShieldOff, AlertTriangle, Car, TrendingDown, Loader2, CreditCard } from "lucide-react";
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getRemovedVehicles, restoreVehicle, updateVehicleExpiry, type Vehicle } from "@/lib/vehicles-api";
import { savePayment } from "@/lib/payment-history";
import { cn } from "@/lib/utils";

/** Convert any date string to YYYY-MM-DD */
function toDateStr(raw: string): string { return raw.slice(0, 10); }

function todayISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addMonths(dateStr: string, months: number): string {
    const clean = toDateStr(dateStr);
    const [y, m, d] = clean.split("-").map(Number);
    const date = new Date(y, m - 1 + months, d);
    if (date.getDate() !== d) date.setDate(0);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function RemovedView() {
    const [search, setSearch] = useState("");
    const [removedList, setRemovedList] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);

    // ── payment-then-restore dialog state ──────────────────────────────────
    const [payTarget, setPayTarget] = useState<Vehicle | null>(null);
    const [payForm, setPayForm] = useState({ year: new Date().getFullYear().toString(), months: "1", amount: "" });
    const [payError, setPayError] = useState<string | null>(null);
    const [restoring, setRestoring] = useState(false);

    const fetchRemoved = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getRemovedVehicles();
            setRemovedList(data);
        } catch {
            // silent — show empty state
        } finally {
            setLoading(false);
        }
    }, []);

    // Silent background refresh — picks up SMS status updates from the scheduler
    const silentRefresh = useCallback(async () => {
        try {
            const data = await getRemovedVehicles();
            setRemovedList(data);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchRemoved();
        const timer = setInterval(silentRefresh, 30000); // every 30 s
        return () => clearInterval(timer);
    }, [fetchRemoved, silentRefresh]);

    const filtered = useMemo(
        () =>
            removedList.filter(
                (s) =>
                    !search ||
                    s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
                    s.plate_number.toLowerCase().includes(search.toLowerCase()) ||
                    (s.phone ?? "").includes(search)
            ),
        [search, removedList]
    );

    const expiredCount  = removedList.filter((s) => {
        const expiry = new Date(s.expiry_date);
        expiry.setHours(0, 0, 0, 0);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return expiry < today;
    }).length;

    const openPayDialog = (v: Vehicle) => {
        const months = 1;
        setPayTarget(v);
        setPayForm({
            year: new Date().getFullYear().toString(),
            months: String(months),
            amount: String((v.monthly_amount ?? 0) * months),
        });
        setPayError(null);
    };

    const handleConfirmPayAndRestore = async () => {
        if (!payTarget) return;
        const months = parseInt(payForm.months) || 1;
        const year = parseInt(payForm.year) || new Date().getFullYear();
        const amount = parseFloat(payForm.amount);
        if (!amount || amount <= 0) { setPayError("Please enter a valid amount."); return; }
        setRestoring(true);
        setPayError(null);
        try {
            // Start from Jan 1 of the entered year if it's a future date, else today
            const yearStart = `${year}-01-01`;
            const startStr = yearStart > todayISO() ? yearStart : todayISO();
            const newExpiry = addMonths(startStr, months);
            await updateVehicleExpiry(payTarget.id, newExpiry);
            await restoreVehicle(payTarget.id);
            savePayment({
                vehicleId: String(payTarget.id),
                vehiclePlate: payTarget.plate_number,
                ownerName: payTarget.customer_name,
                ownerType: payTarget.company_id ? "company" : "individual",
                year,
                months,
                amountGhs: amount,
            });
            setRemovedList((prev) => prev.filter((v) => v.id !== payTarget.id));
            setPayTarget(null);
        } catch {
            setPayError("Failed to restore vehicle. Please try again.");
        } finally {
            setRestoring(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* ── Page header ── */}
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Removed List</h1>
            </div>

            {/* ── KPI cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl px-6 py-5 shadow-sm">
                    <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">TOTAL REMOVED</p>
                    <div className="flex items-end gap-2 mt-1.5">
                        <span className="text-4xl font-extrabold text-foreground leading-none">{removedList.length}</span>
                        <span className="flex items-center gap-0.5 text-xs font-semibold mb-0.5 text-red-500">
                            <TrendingDown size={12} /> vehicles
                        </span>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl px-6 py-5 shadow-sm">
                    <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">EXPIRED</p>
                    <div className="flex items-end gap-2 mt-1.5">
                        <span className="text-4xl font-extrabold text-red-500 leading-none">{expiredCount}</span>
                        <span className="text-xs text-muted-foreground mb-0.5">non-payment</span>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl px-6 py-5 shadow-sm">
                    <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">SUSPENDED</p>
                    <div className="flex items-end gap-2 mt-1.5">
                        <span className="text-4xl font-extrabold text-zinc-500 leading-none">
                            {removedList.filter((s) => s.status === "Suspended").length}
                        </span>
                        <span className="text-xs text-muted-foreground mb-0.5">deactivated</span>
                    </div>
                </div>
            </div>

            {/* ── Warning banner ── */}
            {removedList.length > 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                    <AlertTriangle size={16} className="text-red-500 shrink-0" />
                    <span>
                        <strong>{removedList.length} vehicle{removedList.length !== 1 ? "s" : ""}</strong> have been removed from active service — restore them to re-activate tracking.
                    </span>
                </div>
            )}

            {/* ── Full-width search ── */}
            <div className="relative">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by customer name, plate or phone..."
                    className="w-full pl-10 pr-4 h-11 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
                />
            </div>

            {/* ── Table ── */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-[1.5fr_1fr_0.7fr_0.8fr_0.7fr_120px] gap-4 px-6 py-3 border-b border-border bg-muted/30">
                    {["CUSTOMER", "VEHICLE", "PLAN", "EXPIRY", "SMS STATUS", "ACTION"].map((col) => (
                        <span key={col} className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{col}</span>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
                        <Loader2 size={18} className="animate-spin" /> Loading…
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                        <ShieldOff size={32} className="opacity-20" />
                        <p className="text-sm">{search ? "No records match your search." : "No removed vehicles."}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {filtered.map((s) => {
                            const expiry = new Date(s.expiry_date);
                            expiry.setHours(0,0,0,0);
                            const today = new Date(); today.setHours(0,0,0,0);
                            const isExpired = expiry < today;
                            const expiryLabel = expiry.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                            return (
                                <div
                                    key={s.id}
                                    className="grid grid-cols-[1.5fr_1fr_0.7fr_0.8fr_0.7fr_120px] gap-4 items-center px-6 py-4 hover:bg-muted/30 transition-colors"
                                >
                                    {/* Customer */}
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm text-foreground truncate">{s.customer_name}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{s.phone}</p>
                                    </div>

                                    {/* Vehicle */}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <Car size={12} className="text-muted-foreground shrink-0" />
                                            <span className="font-semibold text-sm text-foreground">{s.plate_number}</span>
                                        </div>
                                        <p className="font-mono text-[0.65rem] text-muted-foreground mt-0.5 truncate">{s.imei}</p>
                                    </div>

                                    {/* Plan */}
                                    <div>
                                        <Badge variant="outline" className="text-[0.7rem] font-semibold px-2.5 py-0.5 bg-orange-50 text-odg-orange border-orange-200">
                                            {s.plan}
                                        </Badge>
                                    </div>

                                    {/* Expiry */}
                                    <span className={cn("text-sm", isExpired ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                                        {expiryLabel}
                                    </span>

                                    {/* SMS Status */}
                                    <div>
                                        {s.sms_status === 'Sent' ? (
                                            <Badge variant="outline" className="text-[0.7rem] font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                                                ✓ Sent
                                            </Badge>
                                        ) : s.sms_status === 'Failed' ? (
                                            <Badge variant="outline" className="text-[0.7rem] font-semibold px-2.5 py-0.5 bg-red-50 text-red-700 border-red-200">
                                                ✕ Failed
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[0.7rem] font-semibold px-2.5 py-0.5 bg-zinc-100 text-zinc-500 border-zinc-200">
                                                — No SMS
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Action */}
                                    <div>
                                        <Button
                                            size="xs"
                                            onClick={() => openPayDialog(s)}
                                            className="h-7 px-2.5 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                                        >
                                            <CreditCard size={11} /> Pay & Restore
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Pay & Restore Dialog ── */}
            <Dialog open={!!payTarget} onOpenChange={(open) => { if (!open) setPayTarget(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Record Payment &amp; Restore</DialogTitle>
                        <DialogDescription>
                            Record a payment for{" "}
                            <span className="font-semibold text-foreground">{payTarget?.plate_number}</span>
                            {payTarget && <span className="text-muted-foreground"> — {payTarget.customer_name}</span>}
                            . The vehicle will be restored to the active list.
                        </DialogDescription>
                    </DialogHeader>

                    {payError && (
                        <p className="text-sm text-destructive font-medium -mt-1">{payError}</p>
                    )}

                    <div className="grid gap-4 py-1">
                        {/* Vehicle Number (read-only) */}
                        <div className="space-y-1.5">
                            <Label className="text-xs">Vehicle Number</Label>
                            <Input value={payTarget?.plate_number ?? ""} readOnly className="bg-muted/50 cursor-default" />
                        </div>

                        {/* Year */}
                        <div className="space-y-1.5">
                            <Label htmlFor="rv-pay-year" className="text-xs">Year</Label>
                            <Input
                                id="rv-pay-year"
                                type="number"
                                min={2000}
                                max={2100}
                                placeholder="2026"
                                value={payForm.year}
                                onChange={(e) => setPayForm({ ...payForm, year: e.target.value })}
                            />
                        </div>

                        {/* Number of months */}
                        <div className="space-y-1.5">
                            <Label htmlFor="rv-pay-months" className="text-xs">Number of Months</Label>
                            <Select
                                value={payForm.months}
                                onValueChange={(val) => {
                                    const base = payTarget?.monthly_amount ?? 0;
                                    setPayForm({ ...payForm, months: val, amount: String(base * parseInt(val)) });
                                }}
                            >
                                <SelectTrigger id="rv-pay-months" className="w-full">
                                    <SelectValue placeholder="Select months" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 36 }, (_, i) => i + 1).map((m) => (
                                        <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? "s" : ""}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* New expiry date — starts from Jan 1 of the entered year if future, else today */}
                        {payTarget && (() => {
                            const enteredYear = parseInt(payForm.year) || new Date().getFullYear();
                            const yearStart = `${enteredYear}-01-01`;
                            const startStr = yearStart > todayISO() ? yearStart : todayISO();
                            const newExpiryStr = addMonths(startStr, parseInt(payForm.months));
                            const [ny, nm, nd] = newExpiryStr.split("-").map(Number);
                            const newDue = new Date(ny, nm - 1, nd).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                            const startLabel = yearStart > todayISO()
                                ? `Jan ${enteredYear}`
                                : "today";
                            return (
                                <div className="space-y-1.5">
                                    <Label className="text-xs">New Expiry Date</Label>
                                    <div className="flex items-center gap-2 h-9 px-3 rounded-lg border text-sm font-semibold bg-emerald-50 border-emerald-200 text-emerald-700">
                                        <span>{newDue}</span>
                                        <span className="text-[0.65rem] font-normal text-muted-foreground ml-auto">
                                            {startLabel} + {payForm.months} mo
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Amount Due */}
                        <div className="space-y-1.5">
                            <Label htmlFor="rv-pay-amount" className="text-xs">
                                Amount Due (GH₵)
                                <span className="ml-1.5 text-muted-foreground font-normal">
                                    = GH₵{payTarget?.monthly_amount ?? 0} × {payForm.months} month{parseInt(payForm.months) > 1 ? "s" : ""}
                                </span>
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">GH₵</span>
                                <Input
                                    id="rv-pay-amount"
                                    type="number"
                                    readOnly
                                    value={payForm.amount}
                                    className="pl-10 bg-muted/50 cursor-default font-semibold text-emerald-700"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayTarget(null)} disabled={restoring}>Cancel</Button>
                        <Button onClick={handleConfirmPayAndRestore} disabled={restoring} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {restoring
                                ? <Loader2 size={14} className="mr-1.5 animate-spin" />
                                : <CreditCard size={14} className="mr-1.5" />}
                            Confirm Payment &amp; Restore
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

