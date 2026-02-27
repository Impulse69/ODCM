"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

// Simple sparkline bar chart using pure CSS/SVG – no external chart lib needed
const monthlyData = [
    { month: "Sep", revenue: 142000 },
    { month: "Oct", revenue: 155800 },
    { month: "Nov", revenue: 163400 },
    { month: "Dec", revenue: 171200 },
    { month: "Jan", revenue: 178900 },
    { month: "Feb", revenue: 186450 },
];

export default function RevenueChart() {
    const max = Math.max(...monthlyData.map((d) => d.revenue));
    const min = Math.min(...monthlyData.map((d) => d.revenue));

    // Normalise to SVG height 100
    const points = monthlyData.map((d, i) => {
        const x = (i / (monthlyData.length - 1)) * 340;
        const y = 80 - ((d.revenue - min) / (max - min)) * 70;
        return `${x},${y}`;
    });

    const polylinePoints = points.join(" ");
    const areaPoints = `0,80 ${polylinePoints} 340,80`;

    const fmt = (v: number) =>
        v >= 1000 ? `GH₵ ${(v / 1000).toFixed(0)}k` : `GH₵ ${v}`;

    const growthPct = (
        ((monthlyData[5].revenue - monthlyData[0].revenue) /
            monthlyData[0].revenue) *
        100
    ).toFixed(1);

    return (
        <Card className="border border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-base font-bold">Revenue Trend</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            Monthly revenue over the past 6 months
                        </CardDescription>
                    </div>
                    <Badge className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold" variant="outline">
                        <TrendingUp size={12} /> +{growthPct}% growth
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-5 pb-4 px-5">
                <svg
                    viewBox="0 0 340 90"
                    className="w-full"
                    style={{ height: 90, overflow: "visible" }}
                    preserveAspectRatio="none"
                >
                    {/* Gradient fill */}
                    <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ED7D31" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#ED7D31" stopOpacity="0.01" />
                        </linearGradient>
                    </defs>
                    <polygon points={areaPoints} fill="url(#revGrad)" />
                    <polyline
                        points={polylinePoints}
                        fill="none"
                        stroke="#ED7D31"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                    {/* Data points */}
                    {points.map((pt, i) => {
                        const [x, y] = pt.split(",").map(Number);
                        return <circle key={i} cx={x} cy={y} r="3.5" fill="#ED7D31" stroke="white" strokeWidth="1.5" />;
                    })}
                </svg>

                {/* Month labels */}
                <div className="flex justify-between mt-2">
                    {monthlyData.map((d) => (
                        <div key={d.month} className="flex flex-col items-center gap-0.5">
                            <span className="text-[0.6rem] font-semibold text-muted-foreground">{d.month}</span>
                            <span className="text-[0.6rem] text-muted-foreground/60">{fmt(d.revenue)}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
