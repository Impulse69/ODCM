"use client";

import { Users, Coins, ShieldCheck, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { kpiData } from "@/data/dummy";

const kpis = [
    {
        label: "Total Active Customers",
        value: kpiData.totalActiveCustomers.toLocaleString(),
        change: "+12%",
        suffix: "vs last month",
        trend: "up" as const,
        icon: Users,
        color: "text-blue-500",
        bg: "bg-blue-50",
        accent: "#3B82F6",
    },
    {
        label: "Monthly Revenue",
        value: `GH₵ ${kpiData.totalMonthlyRevenue.toLocaleString()}`,
        change: "+8.3%",
        suffix: "vs last month",
        trend: "up" as const,
        icon: Coins,
        color: "text-emerald-500",
        bg: "bg-emerald-50",
        accent: "#22C55E",
    },
    {
        label: "Revenue Leakage Prevented",
        value: `GH₵ ${kpiData.revenueLeakagePrevented.toLocaleString()}`,
        change: "+24%",
        suffix: "this quarter",
        trend: "up" as const,
        icon: ShieldCheck,
        color: "text-[#ED7D31]",
        bg: "bg-orange-50",
        accent: "#ED7D31",
    },
    {
        label: "Pending Deactivations",
        value: kpiData.pendingDeactivations.toString(),
        change: "-3",
        suffix: "from last week",
        trend: "down" as const,
        icon: AlertTriangle,
        color: "text-red-500",
        bg: "bg-red-50",
        accent: "#EF4444",
    },
];

export default function KPICards() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpis.map((kpi, i) => {
                const Icon = kpi.icon;
                const TrendIcon = kpi.trend === "up" ? TrendingUp : TrendingDown;
                const trendColor = kpi.trend === "up" ? "text-emerald-500" : "text-red-500";

                return (
                    <Card
                        key={kpi.label}
                        className="animate-fade-in-up border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden relative"
                        style={{ animationDelay: `${i * 75}ms`, opacity: 0 }}
                    >
                        {/* Left accent bar */}
                        <div
                            className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
                            style={{ background: kpi.accent }}
                        />

                        <CardContent className="pl-6 pr-5 py-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground truncate mb-1">
                                        {kpi.label}
                                    </p>
                                    <p className="text-2xl font-extrabold text-foreground tracking-tight leading-none mb-2">
                                        {kpi.value}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <TrendIcon size={13} className={trendColor} />
                                        <span className={`text-xs font-semibold ${trendColor}`}>{kpi.change}</span>
                                        <span className="text-[0.7rem] text-muted-foreground">{kpi.suffix}</span>
                                    </div>
                                </div>

                                <div
                                    className={`w-11 h-11 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center flex-shrink-0`}
                                >
                                    <Icon size={20} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
