"use client";

import { Users, Coins, ShieldCheck, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { kpiData } from "@/data/dummy";

const kpis = [
    {
        label: "Total Active Customers",
        value: kpiData.totalActiveCustomers.toLocaleString(),
        change: "+12%",
        trend: "up" as const,
        icon: <Users size={22} />,
        color: "#3B82F6",
        bgColor: "#EFF6FF",
        borderColor: "#3B82F6",
    },
    {
        label: "Total Monthly Revenue",
        value: `GH₵ ${kpiData.totalMonthlyRevenue.toLocaleString()}`,
        change: "+8.3%",
        trend: "up" as const,
        icon: <Coins size={22} />,
        color: "#22C55E",
        bgColor: "#F0FDF4",
        borderColor: "#22C55E",
    },
    {
        label: "Revenue Leakage Prevented",
        value: `GH₵ ${kpiData.revenueLeakagePrevented.toLocaleString()}`,
        change: "+24%",
        trend: "up" as const,
        icon: <ShieldCheck size={22} />,
        color: "#ED7D31",
        bgColor: "#FFF5EC",
        borderColor: "#ED7D31",
    },
    {
        label: "Pending Deactivations",
        value: kpiData.pendingDeactivations.toString(),
        change: "-3",
        trend: "down" as const,
        icon: <AlertTriangle size={22} />,
        color: "#EF4444",
        bgColor: "#FEF2F2",
        borderColor: "#EF4444",
    },
];

export default function KPICards() {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "1rem",
            }}
        >
            {kpis.map((kpi, index) => (
                <div
                    key={kpi.label}
                    className={`kpi-card animate-fade-in-up delay-${(index + 1) * 100}`}
                    style={{ opacity: 0 }}
                >
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: 4,
                            height: "100%",
                            background: kpi.borderColor,
                            borderRadius: "0.875rem 0 0 0.875rem",
                        }}
                    />
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                        }}
                    >
                        <div>
                            <p
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    color: "#71717A",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: "0.375rem",
                                }}
                            >
                                {kpi.label}
                            </p>
                            <p
                                style={{
                                    fontSize: "1.625rem",
                                    fontWeight: 800,
                                    color: "#1A1A2E",
                                    lineHeight: 1.1,
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                {kpi.value}
                            </p>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                    marginTop: "0.375rem",
                                }}
                            >
                                {kpi.trend === "up" ? (
                                    <TrendingUp size={14} color="#22C55E" />
                                ) : (
                                    <TrendingDown size={14} color="#EF4444" />
                                )}
                                <span
                                    style={{
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        color: kpi.trend === "up" ? "#22C55E" : "#EF4444",
                                    }}
                                >
                                    {kpi.change}
                                </span>
                                <span style={{ fontSize: "0.7rem", color: "#A1A1AA" }}>vs last month</span>
                            </div>
                        </div>
                        <div
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: "0.625rem",
                                background: kpi.bgColor,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: kpi.color,
                                flexShrink: 0,
                            }}
                        >
                            {kpi.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
