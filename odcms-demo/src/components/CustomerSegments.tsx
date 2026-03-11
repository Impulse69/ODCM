"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInView } from "@/lib/hooks";
import { getPlans, type Plan } from "@/lib/plans-api";

const COLORS = [
    { bar: "bg-blue-500",    tooltip: "bg-blue-500"    },
    { bar: "bg-orange-500",  tooltip: "bg-orange-500"  },
    { bar: "bg-emerald-500", tooltip: "bg-emerald-500" },
    { bar: "bg-purple-500",  tooltip: "bg-purple-500"  },
    { bar: "bg-pink-500",    tooltip: "bg-pink-500"    },
];

export default function CustomerSegments() {
    const [cardRef, inView] = useInView<HTMLDivElement>(0.2);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);

    useEffect(() => {
        getPlans().then(setPlans).catch(() => {});
    }, []);

    const total = plans.reduce((s, p) => s + (p.subscriber_count ?? 0), 0);

    const rows = plans.map((p, i) => ({
        name:       p.name,
        count:      p.subscriber_count ?? 0,
        percentage: total > 0 ? Math.round(((p.subscriber_count ?? 0) / total) * 100) : 0,
        color:      (COLORS[i] ?? COLORS[0]).bar,
        tooltip:    (COLORS[i] ?? COLORS[0]).tooltip,
    }));

    return (
        <Card ref={cardRef} className="border border-border shadow-sm flex flex-col">
            <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-base font-bold">Subscription Plans</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5 flex-1">
                {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No plan data yet.</p>
                ) : (
                    rows.map((plan, i) => (
                        <div key={plan.name} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">{plan.name}</span>
                                <span
                                    className="text-sm font-bold text-foreground tabular-nums"
                                    style={{
                                        opacity: inView ? 1 : 0,
                                        transition: `opacity 0.4s ease ${0.15 + i * 0.12}s`,
                                    }}
                                >
                                    {plan.percentage}%
                                </span>
                            </div>
                            <div
                                className="relative w-full"
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            >
                                <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-full ${plan.color} rounded-full`}
                                        style={{
                                            width: inView ? `${plan.percentage}%` : "0%",
                                            transition: `width 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.13}s`,
                                        }}
                                    />
                                </div>
                                {hoveredIndex === i && (
                                    <div
                                        className="absolute -top-9 z-10 pointer-events-none"
                                        style={{ left: `${Math.max(0, plan.percentage / 2)}%` }}
                                    >
                                        <div className={`${plan.tooltip} text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap`}>
                                            {plan.count.toLocaleString()} subscriber{plan.count !== 1 ? "s" : ""}
                                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-current" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
