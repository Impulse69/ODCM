"use client";

import { useMemo, useState, useEffect } from "react";
import {
    Search,
    Receipt,
    TrendingUp,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Car,
    User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PAYMENT_HISTORY_KEY, type PaymentRecord } from "@/lib/payment-history";

const PAGE_SIZE = 12;

export default function PaymentHistoryView() {
    const [records, setRecords] = useState<PaymentRecord[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    // Load from localStorage on mount (and listen for updates)
    useEffect(() => {
        const load = () => {
            try {
                const raw = localStorage.getItem(PAYMENT_HISTORY_KEY);
                setRecords(raw ? (JSON.parse(raw) as PaymentRecord[]) : []);
            } catch {
                setRecords([]);
            }
        };
        load();
        window.addEventListener("payment-recorded", load);
        return () => window.removeEventListener("payment-recorded", load);
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return records
            .filter(
                (r) =>
                    !q ||
                    r.vehiclePlate.toLowerCase().includes(q) ||
                    r.ownerName.toLowerCase().includes(q) ||
                    r.ownerType.toLowerCase().includes(q)
            )
            .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
    }, [records, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageRecords = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const totalRevenue = records.reduce((sum, r) => sum + r.amountGhs, 0);
    const now = new Date();
    const thisMonth = records
        .filter((r) => {
            const d = new Date(r.paidAt);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, r) => sum + r.amountGhs, 0);

    return (
        <div className="space-y-5">
            {/* ── Page header ── */}
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Payment History</h1>
                <p className="text-sm text-muted-foreground mt-0.5">All recorded vehicle subscription payments</p>
            </div>

            {/* ── KPI cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl px-6 py-5 shadow-sm">
                    <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">TOTAL PAYMENTS</p>
                    <div className="flex items-end gap-2 mt-1.5">
                        <span className="text-4xl font-extrabold text-foreground leading-none">{records.length}</span>
                        <span className="text-xs text-muted-foreground mb-0.5">records</span>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl px-6 py-5 shadow-sm">
                    <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">TOTAL REVENUE</p>
                    <div className="flex items-end gap-2 mt-1.5">
                        <span className="text-4xl font-extrabold text-emerald-600 leading-none">
                            GH₵{totalRevenue.toLocaleString()}
                        </span>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-xl px-6 py-5 shadow-sm">
                    <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">THIS MONTH</p>
                    <div className="flex items-end gap-2 mt-1.5">
                        <span className="text-4xl font-extrabold text-odg-orange leading-none">
                            GH₵{thisMonth.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs font-semibold mb-0.5 text-emerald-600">
                            <TrendingUp size={12} />
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Search ── */}
            <div className="relative">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search by vehicle plate or owner name..."
                    className="w-full pl-10 pr-4 h-11 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
                />
            </div>

            {/* ── Table ── */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_0.8fr_1fr_0.9fr] gap-4 px-6 py-3 border-b border-border bg-muted/30">
                    {["DATE", "OWNER", "VEHICLE PLATE", "YEAR", "MONTHS", "AMOUNT (GH₵)", "OWNER TYPE"].map((col) => (
                        <span key={col} className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{col}</span>
                    ))}
                </div>

                {records.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                        <Receipt size={32} className="opacity-20" />
                        <p className="text-sm">No payment records yet. Record a payment from the Vehicle page.</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                        <Search size={24} className="opacity-20" />
                        <p className="text-sm">No records match your search.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {pageRecords.map((r) => (
                            <div
                                key={r.id}
                                className="grid grid-cols-[1fr_1.5fr_0.8fr_0.8fr_0.8fr_1fr_0.9fr] gap-4 items-center px-6 py-4 hover:bg-muted/30 transition-colors"
                            >
                                {/* Date */}
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Calendar size={12} className="shrink-0" />
                                    {new Date(r.paidAt).toLocaleDateString("en-GB", {
                                        day: "2-digit", month: "short", year: "numeric",
                                    })}
                                </div>

                                {/* Owner */}
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <User size={12} className="text-muted-foreground shrink-0" />
                                        <span className="font-semibold text-sm text-foreground truncate">{r.ownerName}</span>
                                    </div>
                                </div>

                                {/* Vehicle plate */}
                                <div className="flex items-center gap-1.5">
                                    <Car size={12} className="text-muted-foreground shrink-0" />
                                    <span className="font-bold text-sm text-foreground">{r.vehiclePlate}</span>
                                </div>

                                {/* Year */}
                                <span className="text-sm text-foreground font-medium">{r.year}</span>

                                {/* Months */}
                                <span className="text-sm text-foreground font-medium">{r.months} mo</span>

                                {/* Amount */}
                                <span className="text-sm font-bold text-emerald-600">GH₵{r.amountGhs.toLocaleString()}</span>

                                {/* Owner type */}
                                <div>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[0.7rem] font-semibold px-2.5 py-0.5 capitalize",
                                            r.ownerType === "company"
                                                ? "bg-violet-50 text-violet-700 border-violet-200"
                                                : "bg-blue-50 text-blue-700 border-blue-200"
                                        )}
                                    >
                                        {r.ownerType}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {filtered.length > PAGE_SIZE && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)} to{" "}
                            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()} records
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                                const p = idx + 1;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={cn(
                                            "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors",
                                            page === p
                                                ? "bg-odg-orange text-white shadow-sm"
                                                : "border border-border text-muted-foreground hover:bg-muted/50"
                                        )}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                            {totalPages > 5 && <span className="text-xs text-muted-foreground px-1">…</span>}
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
