"use client";

import { useEffect, useRef, useState } from "react";
import { Users, Coins, ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getVehicles, type Vehicle } from "@/lib/vehicles-api";
import { getSmsStats, type SmsStats } from "@/lib/sms-api";
import { useInView } from "@/lib/hooks";
import { computeStatus } from "@/lib/vehicle-status";

/** Smoothly counts from 0 → target using cubic ease-out, only when `start` is true */
function useCountUp(target: number, start: boolean, duration = 1400, delay = 0) {
    const [value, setValue] = useState(0);
    const rafRef = useRef<number>(0);
    useEffect(() => {
        if (!start) return;
        const timeout = setTimeout(() => {
            if (target === 0) { setValue(0); return; }
            const t0 = performance.now();
            function tick(now: number) {
                const t = Math.min((now - t0) / duration, 1);
                const eased = 1 - Math.pow(1 - t, 3);
                setValue(Math.round(target * eased));
                if (t < 1) rafRef.current = requestAnimationFrame(tick);
            }
            rafRef.current = requestAnimationFrame(tick);
        }, delay);
        return () => { clearTimeout(timeout); cancelAnimationFrame(rafRef.current); };
    }, [target, start, duration, delay]);
    return value;
}

function computeKPIs(data: Vehicle[]) {
    const activeVehicles  = data.filter((v) => computeStatus(v.expiry_date, v.status) === "Active");
    const expiredVehicles = data.filter((v) => computeStatus(v.expiry_date, v.status) === "Expired");
    const dueSoonVehicles = data.filter((v) => computeStatus(v.expiry_date, v.status) === "Due Soon");

    const activeCustomers = new Set(
        activeVehicles.map((v) => v.individual_customer_id ?? v.company_id)
    ).size;

    const monthlyRevenue      = activeVehicles.reduce((sum, v) => sum + (Number(v.monthly_amount) || 0), 0);
    const leakagePrevented    = expiredVehicles.reduce((sum, v) => sum + (Number(v.monthly_amount) || 0), 0);
    const pendingDeactivations = expiredVehicles.length + dueSoonVehicles.length;

    return { activeCustomers, monthlyRevenue, leakagePrevented, pendingDeactivations };
}

const CARD_CONFIG = [
    {
        key: "activeCustomers" as const,
        label: "Total Active Customers",
        format: (v: number) => v.toLocaleString(),
        change: null,
        suffix: "with active subscriptions",
        trend: "up" as const,
        icon: Users,
        color: "text-blue-500",
        bg: "bg-blue-50",
        accent: "#3B82F6",
    },
    {
        key: "monthlyRevenue" as const,
        label: "Monthly Revenue",
        format: (v: number) => `GH₵ ${v.toLocaleString()}`,
        change: null,
        suffix: "from active plans",
        trend: "up" as const,
        icon: Coins,
        color: "text-emerald-500",
        bg: "bg-emerald-50",
        accent: "#22C55E",
    },
    {
        key: "leakagePrevented" as const,
        label: "Revenue Leakage",
        format: (v: number) => `GH₵ ${v.toLocaleString()}`,
        change: null,
        suffix: "from expired subscriptions",
        trend: "down" as const,
        icon: ShieldCheck,
        color: "text-red-500",
        bg: "bg-red-50",
        accent: "#EF4444",
    },
    {
        key: "pendingDeactivations" as const,
        label: "Pending Renewals",
        format: (v: number) => v.toString(),
        change: null,
        suffix: "expired + due soon",
        trend: "down" as const,
        icon: AlertTriangle,
        color: "text-red-500",
        bg: "bg-red-50",
        accent: "#EF4444",
    },
];

/** One animated KPI card */
function AnimatedKPICard({
    kpi,
    target,
    index,
    loading,
    inView,
}: {
    kpi: (typeof CARD_CONFIG)[0];
    target: number;
    index: number;
    loading: boolean;
    inView: boolean;
}) {
    const animated = useCountUp(loading ? 0 : target, inView, 1400, index * 140);
    const Icon = kpi.icon;
    const TrendIcon = kpi.trend === "up" ? TrendingUp : TrendingDown;
    const trendColor = kpi.trend === "up" ? "text-emerald-500" : "text-red-500";
    const value = loading ? "—" : kpi.format(animated);

    return (
        <Card
            className="animate-fade-in-up border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden relative"
            style={{ animationDelay: `${index * 100}ms`, opacity: 0 }}
        >
            {/* Left accent bar */}
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg" style={{ background: kpi.accent }} />

            {/* Ghost watermark icon */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none select-none" aria-hidden>
                <Icon size={88} style={{ color: kpi.accent, opacity: 0.08 }} />
            </div>

            <CardContent className="pl-6 pr-5 py-5 relative z-10">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground truncate mb-1">
                            {kpi.label}
                        </p>
                        <p className="text-2xl font-extrabold text-foreground tracking-tight leading-none mb-2">
                            {value}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <TrendIcon size={13} className={trendColor} />
                            <span className="text-[0.7rem] text-muted-foreground">{kpi.suffix}</span>
                        </div>
                    </div>

                    <div className={`w-11 h-11 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center shrink-0`}>
                        <Icon size={20} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function KPICards() {
    const [stats, setStats] = useState({ activeCustomers: 0, monthlyRevenue: 0, leakagePrevented: 0, pendingDeactivations: 0 });
    const [smsStats, setSmsStats] = useState<SmsStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [gridRef, inView] = useInView<HTMLDivElement>(0.1);

    useEffect(() => {
        const load = () => {
            getVehicles()
                .then((data) => setStats(computeKPIs(data)))
                .finally(() => setLoading(false));
            getSmsStats()
                .then((data) => setSmsStats(data))
                .catch(() => {});
        };
        load();
        // Refresh every 60 s so expired/removed vehicles are reflected automatically
        const timer = setInterval(load, 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="space-y-4">
            <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {CARD_CONFIG.map((kpi, i) => (
                    <AnimatedKPICard
                        key={kpi.label}
                        kpi={kpi}
                        target={stats[kpi.key]}
                        index={i}
                        loading={loading}
                        inView={inView}
                    />
                ))}
            </div>

            {/* ── SMS Notification Stats bar ───────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare size={14} />
                    <span className="text-[0.7rem] font-semibold uppercase tracking-wide">SMS Notifications</span>
                </div>
                <div className="w-px h-4 bg-border hidden sm:block" />
                {[
                    {
                        label: "Sent Today",
                        value: smsStats?.sent_today ?? "—",
                        icon: <CheckCircle2 size={12} className="text-emerald-500" />,
                        color: "text-emerald-700",
                    },
                    {
                        label: "Total Sent",
                        value: smsStats?.total_sent ?? "—",
                        icon: <CheckCircle2 size={12} className="text-blue-500" />,
                        color: "text-blue-700",
                    },
                    {
                        label: "Due Soon",
                        value: smsStats?.due_soon_sent ?? "—",
                        icon: <MessageSquare size={12} className="text-amber-500" />,
                        color: "text-amber-700",
                    },
                    {
                        label: "Expired",
                        value: smsStats?.expired_sent ?? "—",
                        icon: <MessageSquare size={12} className="text-orange-500" />,
                        color: "text-orange-700",
                    },
                    {
                        label: "Failed",
                        value: smsStats?.total_failed ?? "—",
                        icon: <XCircle size={12} className="text-red-500" />,
                        color: "text-red-700",
                    },
                ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                        {item.icon}
                        <span className="text-[0.68rem] text-muted-foreground">{item.label}:</span>
                        <span className={`text-[0.75rem] font-bold ${item.color}`}>{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
