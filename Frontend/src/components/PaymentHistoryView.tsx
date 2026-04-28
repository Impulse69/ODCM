"use client";

import { useMemo, useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import {
    Search,
    Receipt,
    Calendar,
    Car,
    Download,
    BarChart3,
    ArrowUpRight,
    Clock,
    FileText,
    Coins,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPayments, PAYMENT_HISTORY_KEY, type PaymentRecord } from "@/lib/payment-history";
import { getRemovedVehicles, getVehicles, type Vehicle } from "@/lib/vehicles-api";

const PAGE_SIZE = 15;
const BRAND_ORANGE: [number, number, number] = [243, 112, 33];
const BRAND_DARK: [number, number, number] = [41, 37, 36];
const BRAND_SOFT: [number, number, number] = [255, 245, 238];

type ReportPeriod = "week" | "month" | "year" | "all";

function formatCurrency(amount: number) {
    return `GHS ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function getPeriodLabel(period: ReportPeriod) {
    switch (period) {
        case "week":
            return "This Week";
        case "month":
            return "This Month";
        case "year":
            return "This Year";
        default:
            return "All Time";
    }
}

function getPeriodDateRange(period: ReportPeriod) {
    if (period === "all") return "All recorded payments";

    const now = new Date();
    const start = new Date(now);

    if (period === "week") {
        start.setDate(now.getDate() - 7);
    } else if (period === "month") {
        start.setDate(1);
    } else if (period === "year") {
        start.setMonth(0, 1);
    }

    start.setHours(0, 0, 0, 0);

    return `${start.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    })} - ${now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    })}`;
}

function loadImageAsDataUrl(src: string, opacity = 1): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("canvas context unavailable"));
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = opacity;
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = src;
    });
}

async function exportPaymentsPdf(records: PaymentRecord[], period: ReportPeriod, totalRevenue: number) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const bottomMargin = 18;
    const headerHeight = 46;
    const footerY = pageHeight - 10;
    let y = headerHeight + 16;
    let logoDataUrl: string | null = null;
    let watermarkDataUrl: string | null = null;

    try {
        [logoDataUrl, watermarkDataUrl] = await Promise.all([
            loadImageAsDataUrl("/favicon.png", 1),
            loadImageAsDataUrl("/favicon.png", 0.08),
        ]);
    } catch {
        logoDataUrl = null;
        watermarkDataUrl = null;
    }

    const addWatermark = () => {
        if (watermarkDataUrl) {
            const size = 95;
            const x = (pageWidth - size) / 2;
            const yPos = (pageHeight - size) / 2 + 8;
            doc.addImage(watermarkDataUrl, "PNG", x, yPos, size, size);
            return;
        }

        doc.setDrawColor(...BRAND_ORANGE);
        doc.setLineWidth(0.7);
        doc.circle(pageWidth / 2, pageHeight / 2 + 10, 28, "S");
    };

    const drawTableHeader = () => {
        doc.setFillColor(...BRAND_ORANGE);
        doc.roundedRect(margin, y - 6, pageWidth - margin * 2, 9, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text("Date", margin + 3, y);
        doc.text("Customer", margin + 26, y);
        doc.text("Vehicle", margin + 83, y);
        doc.text("Plan", margin + 111, y);
        doc.text("Months", margin + 162, y, { align: "right" });
        doc.text("Amount", pageWidth - margin - 3, y, { align: "right" });
        doc.setTextColor(...BRAND_DARK);
        y += 9;
    };

    const drawHeader = () => {
        addWatermark();

        doc.setFillColor(...BRAND_ORANGE);
        doc.rect(0, 0, pageWidth, 8, "F");
        doc.setFillColor(...BRAND_SOFT);
        doc.roundedRect(margin, 12, pageWidth - margin * 2, headerHeight, 4, 4, "F");
        doc.setDrawColor(...BRAND_ORANGE);
        doc.setLineWidth(0.8);
        doc.roundedRect(margin, 12, pageWidth - margin * 2, headerHeight, 4, 4, "S");

        if (logoDataUrl) {
            const logoSize = 18;
            doc.addImage(logoDataUrl, "PNG", pageWidth / 2 - logoSize / 2, 16, logoSize, logoSize);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(17);
        doc.setTextColor(...BRAND_DARK);
        doc.text("PAYMENT HISTORY REPORT", pageWidth / 2, 41, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(110, 98, 92);
        doc.text("Office Data Ghana", pageWidth / 2, 47, { align: "center" });
        doc.text("", pageWidth / 2, 52, { align: "center" });

        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, 64, pageWidth - margin * 2, 22, 3, 3, "F");
        doc.setDrawColor(235, 228, 224);
        doc.roundedRect(margin, 64, pageWidth - margin * 2, 22, 3, 3, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...BRAND_ORANGE);
        doc.text("PERIOD", margin + 4, 71);
        doc.text("TRANSACTIONS", margin + 53, 71);
        doc.text("TOTAL COLLECTED", margin + 104, 71);
        doc.text("GENERATED", margin + 157, 71);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...BRAND_DARK);
        doc.text(getPeriodLabel(period), margin + 4, 78);
        doc.text(String(records.length), margin + 53, 78);
        doc.text(formatCurrency(totalRevenue), margin + 104, 78);
        doc.text(new Date().toLocaleDateString("en-GB"), margin + 157, 78);

        y = 95;
        drawTableHeader();
    };

    const drawFooter = () => {
        doc.setDrawColor(232, 225, 220);
        doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(110, 98, 92);
        doc.text("Office Data Ghana - Payment History Report", margin, footerY);
        doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, footerY, { align: "right" });
    };

    drawHeader();

    if (records.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(...BRAND_DARK);
        doc.text("No payment records found for the selected period.", margin, y);
    } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);

        records.forEach((record, index) => {
            if (y > pageHeight - bottomMargin - 8) {
                doc.addPage();
                drawHeader();
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8.5);
            }

            const date = new Date(record.paidAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
            const planLabel = record.planName || "Unknown Plan";

            if (index % 2 === 0) {
                doc.setFillColor(255, 250, 247);
                doc.roundedRect(margin, y - 5, pageWidth - margin * 2, 8, 1.5, 1.5, "F");
            }

            doc.setTextColor(...BRAND_DARK);
            doc.text(date, margin + 3, y);
            doc.text(record.ownerName.slice(0, 24), margin + 26, y);
            doc.text(record.vehiclePlate.slice(0, 12), margin + 83, y);
            doc.text(planLabel.slice(0, 26), margin + 111, y);
            doc.text(String(record.months), margin + 162, y, { align: "right" });

            doc.setFont("helvetica", "bold");
            doc.setTextColor(...BRAND_ORANGE);
            doc.text(formatCurrency(record.amountGhs), pageWidth - margin - 3, y, { align: "right" });
            doc.setFont("helvetica", "normal");

            y += 5.5;
            doc.setDrawColor(240, 232, 228);
            doc.line(margin, y - 2, pageWidth - margin, y - 2);
        });

        if (y > pageHeight - bottomMargin - 10) {
            doc.addPage();
            drawHeader();
        }

        y += 6;
        doc.setFillColor(...BRAND_ORANGE);
        doc.roundedRect(pageWidth - 84, y - 7, 70, 15, 3, 3, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text("TOTAL COLLECTED", pageWidth - 49, y - 1.5, { align: "center" });
        doc.setFontSize(11);
        doc.text(formatCurrency(totalRevenue), pageWidth - 49, y + 4, { align: "center" });
    }

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        drawFooter();
    }

    doc.save(`payment-history-${period}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function enrichPaymentPlans(records: PaymentRecord[], vehicles: Vehicle[]) {
    const byId = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle.plan]));
    const byPlate = new Map(vehicles.map((vehicle) => [vehicle.plate_number.trim().toLowerCase(), vehicle.plan]));

    return records.map((record) => {
        if (record.planName?.trim()) return record;

        const resolvedPlan =
            byId.get(record.vehicleId) ||
            byPlate.get(record.vehiclePlate.trim().toLowerCase());

        return resolvedPlan ? { ...record, planName: resolvedPlan } : record;
    });
}

function sortPaymentsNewestFirst(records: PaymentRecord[]) {
    return [...records].sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
}

export default function PaymentHistoryView() {
    const [records, setRecords] = useState<PaymentRecord[]>([]);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [period, setPeriod] = useState<ReportPeriod>("all");
    const [viewMode, setViewMode] = useState<"list" | "grouped">("grouped");

    useEffect(() => {
        const load = async () => {
            try {
                const [payments, activeVehicles, removedVehicles] = await Promise.all([
                    getPayments(),
                    getVehicles().catch(() => []),
                    getRemovedVehicles().catch(() => []),
                ]);
                const enrichedPayments = enrichPaymentPlans(payments, [...activeVehicles, ...removedVehicles]);
                const sortedPayments = sortPaymentsNewestFirst(enrichedPayments);
                setRecords(sortedPayments);
                localStorage.setItem(PAYMENT_HISTORY_KEY, JSON.stringify(sortedPayments));
            } catch {
                try {
                    const raw = localStorage.getItem(PAYMENT_HISTORY_KEY);
                    const stored = raw ? (JSON.parse(raw) as PaymentRecord[]) : [];
                    setRecords(sortPaymentsNewestFirst(stored));
                } catch {
                    setRecords([]);
                }
            }
        };

        load();
        window.addEventListener("payment-recorded", load);
        return () => window.removeEventListener("payment-recorded", load);
    }, []);

    const filtered = useMemo(() => {
        let list = [...records];
        const q = search.toLowerCase();

        if (q) {
            list = list.filter((r) =>
                r.vehiclePlate.toLowerCase().includes(q) ||
                r.ownerName.toLowerCase().includes(q) ||
                r.ownerType.toLowerCase().includes(q)
            );
        }

        const now = new Date();
        if (period === "week") {
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            list = list.filter((r) => new Date(r.paidAt) >= weekAgo);
        } else if (period === "month") {
            list = list.filter((r) => {
                const d = new Date(r.paidAt);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
        } else if (period === "year") {
            list = list.filter((r) => new Date(r.paidAt).getFullYear() === now.getFullYear());
        }

        return sortPaymentsNewestFirst(list);
    }, [records, search, period]);

    const grouped = useMemo(() => {
        const groups: Record<string, Record<string, PaymentRecord[]>> = {};
        filtered.forEach((r) => {
            const date = new Date(r.paidAt);
            const year = date.getFullYear().toString();
            const month = date.toLocaleString("default", { month: "long" });

            if (!groups[year]) groups[year] = {};
            if (!groups[year][month]) groups[year][month] = [];
            groups[year][month].push(r);
        });
        return groups;
    }, [filtered]);

    const totalRevenue = filtered.reduce((sum, r) => sum + r.amountGhs, 0);
    const avgPayment = filtered.length > 0 ? totalRevenue / filtered.length : 0;

    const handleExport = async () => {
        await exportPaymentsPdf(filtered, period, totalRevenue);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                        <Receipt className="text-odg-orange" size={28} />
                        Financial Reporting
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">Transaction history, grouping and period reports.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2 h-10 px-4 font-bold border-2" onClick={handleExport}>
                        <Download size={16} /> Export PDF
                    </Button>
                </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-2 shadow-sm flex flex-col lg:flex-row items-center gap-2">
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-full lg:w-auto">
                    {(["all", "week", "month", "year"] as ReportPeriod[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => {
                                setPeriod(p);
                                setPage(1);
                            }}
                            className={cn(
                                "flex-1 lg:flex-none px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                                period === p ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:bg-white/50"
                            )}
                        >
                            {p}
                        </button>
                    ))}
                </div>
                <div className="h-6 w-px bg-border hidden lg:block mx-2" />
                <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search transactions..."
                        className="w-full pl-11 pr-4 h-12 text-sm rounded-xl border-none bg-transparent focus:outline-none"
                    />
                </div>
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl w-full lg:w-auto">
                    <button
                        onClick={() => {
                            setViewMode("list");
                            setPage(1);
                        }}
                        className={cn(
                            "flex-1 lg:flex-none px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                            viewMode === "list" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:bg-white/50"
                        )}
                    >
                        List
                    </button>
                    <button
                        onClick={() => {
                            setViewMode("grouped");
                            setPage(1);
                        }}
                        className={cn(
                            "flex-1 lg:flex-none px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                            viewMode === "grouped" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:bg-white/50"
                        )}
                    >
                        Grouped
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-5 py-4 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-emerald-700">
                            Total Amount Collected
                        </p>
                        <p className="text-2xl font-black text-emerald-700">{formatCurrency(totalRevenue)}</p>
                    </div>
                    <div className="text-sm text-emerald-800">
                        <span className="font-semibold">{getPeriodLabel(period)}</span> report
                        <span className="mx-2 hidden md:inline">•</span>
                        <span className="block md:inline">{filtered.length} transaction{filtered.length === 1 ? "" : "s"}</span>
                        <span className="mx-2 hidden md:inline">•</span>
                        <span className="block md:inline">{getPeriodDateRange(period)}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: Coins, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Total Transactions", value: filtered.length, icon: Receipt, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Avg. Transaction", value: formatCurrency(avgPayment), icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
                    { label: "Active Period", value: getPeriodLabel(period), icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
                ].map((s, i) => (
                    <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                        <div className={cn("absolute right-[-10%] top-[-10%] opacity-10 group-hover:scale-110 transition-transform duration-500", s.color)}>
                            <s.icon size={80} />
                        </div>
                        <p className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-2xl font-black text-foreground tabular-nums leading-none">{s.value}</p>
                    </div>
                ))}
            </div>

            {viewMode === "grouped" ? (
                <div className="space-y-8">
                    {Object.entries(grouped).map(([year, months]) => (
                        <div key={year} className="space-y-6">
                            <div className="flex items-center gap-4">
                                <h2 className="text-xl font-black text-foreground">{year}</h2>
                                <div className="h-px flex-1 bg-linear-to-r from-border to-transparent" />
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {Object.entries(months).map(([month, transactions]) => (
                                    <div key={month} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                                        <div className="bg-muted/30 px-6 py-3 border-b border-border flex items-center justify-between">
                                            <h3 className="font-bold text-sm flex items-center gap-2">
                                                <Calendar size={14} className="text-odg-orange" />
                                                {month}
                                            </h3>
                                            <Badge className="bg-white text-foreground shadow-xs border-border">
                                                {transactions.length} Transactions • {formatCurrency(transactions.reduce((sum, transaction) => sum + transaction.amountGhs, 0))}
                                            </Badge>
                                        </div>
                                        <div className="divide-y divide-border">
                                            {transactions.map((r) => (
                                                <TransactionItem key={r.id} r={r} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <EmptyState />}
                </div>
            ) : (
                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                    <div className="divide-y divide-border">
                        {filtered.slice(0, PAGE_SIZE * page).map((r) => (
                            <TransactionItem key={r.id} r={r} />
                        ))}
                    </div>
                    {filtered.length > PAGE_SIZE * page && (
                        <div className="p-4 flex justify-center border-t border-border">
                            <Button variant="ghost" size="sm" className="font-bold text-xs uppercase tracking-widest" onClick={() => setPage((p) => p + 1)}>
                                Load More Transactions
                            </Button>
                        </div>
                    )}
                    {filtered.length === 0 && <EmptyState />}
                </div>
            )}
        </div>
    );
}

function TransactionItem({ r }: { r: PaymentRecord }) {
    return (
        <div className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-white transition-colors shadow-xs">
                <FileText size={18} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-1">
                    <p className="font-bold text-sm text-foreground truncate">{r.ownerName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className={cn("text-[0.6rem] h-4 px-1.5 font-bold uppercase", r.ownerType === "company" ? "text-violet-600 bg-violet-50 border-violet-100" : "text-blue-600 bg-blue-50 border-blue-100")}>
                            {r.ownerType}
                        </Badge>
                        <span className="text-[0.65rem] text-muted-foreground font-medium flex items-center gap-1">
                            <Car size={10} /> {r.vehiclePlate}
                        </span>
                    </div>
                </div>
                <div className="hidden md:block">
                    <p className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Service Plan</p>
                    <p className="text-xs font-semibold text-foreground uppercase">{r.months} Month Subscription</p>
                </div>
                <div className="hidden md:block">
                    <p className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Date Paid</p>
                    <p className="text-xs font-semibold text-foreground">
                        {new Date(r.paidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-emerald-600 tabular-nums">{formatCurrency(r.amountGhs)}</p>
                    <p className="text-[0.65rem] font-medium text-muted-foreground flex items-center justify-end gap-1">
                        Success <ArrowUpRight size={10} />
                    </p>
                </div>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <Receipt size={40} className="text-muted-foreground/30" />
            </div>
            <div>
                <h3 className="text-lg font-bold">No Transactions Found</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Try adjusting your filters or search query to find the records you&apos;re looking for.
                </p>
            </div>
        </div>
    );
}
