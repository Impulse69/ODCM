"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, ShieldOff, RotateCcw, AlertTriangle, Car, TrendingDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getRemovedVehicles, restoreVehicle, type Vehicle } from "@/lib/vehicles-api";
import { cn } from "@/lib/utils";

export default function RemovedView() {
    const [search, setSearch] = useState("");
    const [removedList, setRemovedList] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmId, setConfirmId] = useState<string | null>(null);
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

    useEffect(() => { fetchRemoved(); }, [fetchRemoved]);

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

    const confirmEntry = removedList.find((s) => s.id === confirmId);

    const handleRestore = async () => {
        if (!confirmId) return;
        setRestoring(true);
        try {
            await restoreVehicle(confirmId);
            setRemovedList((prev) => prev.filter((v) => v.id !== confirmId));
            setConfirmId(null);
        } catch {
            // silent
        } finally {
            setRestoring(false);
        }
    };

    const expiredCount  = removedList.filter((s) => {
        const expiry = new Date(s.expiry_date);
        expiry.setHours(0, 0, 0, 0);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return expiry < today;
    }).length;

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
                    {["CUSTOMER", "VEHICLE", "PLAN", "EXPIRY", "STATUS", "ACTION"].map((col) => (
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

                                    {/* Status */}
                                    <div>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[0.7rem] font-semibold px-2.5 py-0.5",
                                                isExpired
                                                    ? "bg-red-50 text-red-600 border-red-200"
                                                    : "bg-zinc-100 text-zinc-500 border-zinc-200"
                                            )}
                                        >
                                            {isExpired ? "Expired" : "Suspended"}
                                        </Badge>
                                    </div>

                                    {/* Action */}
                                    <div>
                                        <Button
                                            size="xs"
                                            onClick={() => setConfirmId(s.id)}
                                            className="h-7 px-2.5 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                                        >
                                            <RotateCcw size={11} /> Restore
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Confirm Restore Dialog ── */}
            <Dialog open={!!confirmId} onOpenChange={(open) => { if (!open) setConfirmId(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Restore Vehicle</DialogTitle>
                        <DialogDescription>
                            This will re-activate the vehicle and mark it as active in the system.
                        </DialogDescription>
                    </DialogHeader>
                    {confirmEntry && (
                        <div className="rounded-xl border border-border bg-muted/30 px-5 py-4 space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Customer</span>
                                <span className="font-semibold">{confirmEntry.customer_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Plate</span>
                                <span className="font-semibold">{confirmEntry.plate_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Plan</span>
                                <span className="font-semibold">{confirmEntry.plan}</span>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmId(null)} disabled={restoring}>Cancel</Button>
                        <Button onClick={handleRestore} disabled={restoring} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {restoring ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <RotateCcw size={14} className="mr-1.5" />}
                            Confirm Restore
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

