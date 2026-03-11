"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useInView } from "@/lib/hooks";
import { getRevenueSummary } from "@/lib/payment-history";

const CHART_LEFT = 48;
const CHART_RIGHT = 590;
const CHART_TOP = 12;
const CHART_BOTTOM = 190;
const PERIODS = ["12 Months", "6 Months", "30 Days"] as const;

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function periodToMonths(p: string): number {
    if (p === "6 Months") return 6;
    if (p === "30 Days") return 1;
    return 12;
}

function formatMonth(ym: string): string {
    const [, m] = ym.split("-");
    return MONTH_LABELS[parseInt(m, 10) - 1] ?? ym;
}

function niceMax(max: number): number {
    if (max <= 0) return 10000;
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const normalized = max / magnitude;
    if (normalized <= 1) return magnitude;
    if (normalized <= 2) return 2 * magnitude;
    if (normalized <= 5) return 5 * magnitude;
    return 10 * magnitude;
}

export default function RevenueChart() {
    const [period, setPeriod] = useState<string>("12 Months");
    const [data, setData] = useState<{ month: string; value: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const lineRef = useRef<SVGPolylineElement>(null);
    const [cardRef, inView] = useInView<HTMLDivElement>(0.2);

    const [dashLen, setDashLen] = useState(700);
    const [dashOffset, setDashOffset] = useState(700);
    const [areaVisible, setAreaVisible] = useState(false);
    const [dotsVisible, setDotsVisible] = useState(false);

    const fetchData = useCallback(async (p: string) => {
        setLoading(true);
        const months = periodToMonths(p);
        const rows = await getRevenueSummary(months);
        setData(rows.map(r => ({ month: formatMonth(r.month), value: r.total })));
        setLoading(false);
    }, []);

    // Fetch on mount and when period changes
    const [fetchTrigger, setFetchTrigger] = useState(0);
    const handlePeriod = useCallback((p: string) => {
        setPeriod(p);
        setFetchTrigger(t => t + 1);
    }, []);

    // Initial fetch on mount
    useEffect(() => { fetchData("12 Months"); }, [fetchData]);

    // Re-fetch when period changes via button
    useEffect(() => {
        if (fetchTrigger === 0) return;
        fetchData(period);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchTrigger]);

    // Listen for new payments
    useEffect(() => {
        const handler = () => fetchData(period);
        window.addEventListener("payment-recorded", handler);
        return () => window.removeEventListener("payment-recorded", handler);
    }, [period, fetchData]);

    const maxVal = niceMax(Math.max(...data.map(d => d.value), 0));
    const gridVals = [maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25];

    function yOf(v: number) {
        return CHART_BOTTOM - (v / maxVal) * (CHART_BOTTOM - CHART_TOP);
    }

    function buildPoints(items: { month: string; value: number }[]) {
        if (items.length < 2) {
            return items.map((d) => ({
                x: CHART_LEFT + (CHART_RIGHT - CHART_LEFT) / 2,
                y: yOf(d.value),
                month: d.month,
            }));
        }
        const w = CHART_RIGHT - CHART_LEFT;
        return items.map((d, i) => ({
            x: CHART_LEFT + (i / (items.length - 1)) * w,
            y: yOf(d.value),
            month: d.month,
        }));
    }

    const points = buildPoints(data);
    const lineStr = points.map(p => `${p.x},${p.y}`).join(" ");
    const areaStr = points.length >= 2
        ? `${points[0].x},${CHART_BOTTOM} ${lineStr} ${points[points.length - 1].x},${CHART_BOTTOM}`
        : "";

    useEffect(() => {
        if (!inView || data.length < 2) return;
        const len = lineRef.current?.getTotalLength() ?? 700;
        const reset = setTimeout(() => { setDashLen(len); setDashOffset(len); setAreaVisible(false); setDotsVisible(false); }, 0);
        const t1 = setTimeout(() => setDashOffset(0), 80);
        const t2 = setTimeout(() => setAreaVisible(true), 380);
        const t3 = setTimeout(() => setDotsVisible(true), 730);
        return () => { clearTimeout(reset); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [period, inView, data]);

    function formatLabel(v: number): string {
        if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
        return v.toString();
    }

    return (
        <Card ref={cardRef} className="border border-border shadow-sm xl:col-span-2">
            <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <CardTitle className="text-base font-bold">Revenue Performance</CardTitle>
                        <CardDescription className="text-xs mt-0.5">Monthly trend analysis</CardDescription>
                    </div>
                    <div className="flex gap-1.5">
                        {PERIODS.map((p) => (
                            <button
                                key={p}
                                onClick={() => handlePeriod(p)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                                    period === p
                                        ? "bg-odg-orange text-white shadow-sm scale-105"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-5 pb-5 px-5">
                {loading || data.length === 0 ? (
                    /* Skeleton chart — shown while loading OR when there is no data yet */
                    <div style={{ height: 230 }} className="w-full relative overflow-hidden">
                        <svg viewBox="0 0 640 230" className="w-full" style={{ height: 230 }}>
                            {/* Skeleton grid lines */}
                            {[0.25, 0.5, 0.75, 1].map((frac) => {
                                const y = CHART_BOTTOM - frac * (CHART_BOTTOM - CHART_TOP);
                                return (
                                    <g key={frac}>
                                        <line x1={CHART_LEFT} y1={y} x2={CHART_RIGHT} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 3" />
                                        <rect x={0} y={y - 5} width={36} height={10} rx={3} fill="#e5e7eb" className="animate-pulse" />
                                    </g>
                                );
                            })}
                            <line x1={CHART_LEFT} y1={CHART_BOTTOM} x2={CHART_RIGHT} y2={CHART_BOTTOM} stroke="#e5e7eb" strokeWidth="1" />
                            <rect x={0} y={CHART_BOTTOM - 5} width={36} height={10} rx={3} fill="#e5e7eb" className="animate-pulse" />

                            {/* Skeleton wavy line as a flat pulse bar */}
                            <rect x={CHART_LEFT} y={CHART_BOTTOM - 6} width={CHART_RIGHT - CHART_LEFT} height={6} rx={3} fill="#e5e7eb" className="animate-pulse" />

                            {/* Skeleton gradient area */}
                            <rect x={CHART_LEFT} y={CHART_TOP + 40} width={CHART_RIGHT - CHART_LEFT} height={CHART_BOTTOM - CHART_TOP - 40} rx={4} fill="#f3f4f6" className="animate-pulse" />

                            {/* Skeleton x-axis labels */}
                            {Array.from({ length: 6 }).map((_, i) => {
                                const x = CHART_LEFT + (i / 5) * (CHART_RIGHT - CHART_LEFT) - 14;
                                return <rect key={i} x={x} y={CHART_BOTTOM + 8} width={28} height={8} rx={3} fill="#e5e7eb" className="animate-pulse" />;
                            })}
                        </svg>
                    </div>
                ) : (
                    <svg viewBox="0 0 640 230" className="w-full" style={{ height: 230 }}>
                        <defs>
                            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ED7D31" stopOpacity="0.28" />
                                <stop offset="100%" stopColor="#ED7D31" stopOpacity="0.02" />
                            </linearGradient>
                        </defs>

                        {gridVals.map((v) => {
                            const y = yOf(v);
                            return (
                                <g key={v}>
                                    <line x1={CHART_LEFT} y1={y} x2={CHART_RIGHT} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 3" />
                                    <text x={CHART_LEFT - 6} y={y} fontSize="10" fill="#9ca3af" textAnchor="end" dominantBaseline="middle">
                                        {formatLabel(v)}
                                    </text>
                                </g>
                            );
                        })}

                        <line x1={CHART_LEFT} y1={CHART_BOTTOM} x2={CHART_RIGHT} y2={CHART_BOTTOM} stroke="#e5e7eb" strokeWidth="1" />
                        <text x={CHART_LEFT - 6} y={CHART_BOTTOM} fontSize="10" fill="#9ca3af" textAnchor="end" dominantBaseline="middle">0</text>

                        {data.length >= 2 && (
                            <>
                                <polygon
                                    points={areaStr}
                                    fill="url(#areaFill)"
                                    style={{ opacity: areaVisible ? 1 : 0, transition: "opacity 0.6s ease" }}
                                />
                                <polyline
                                    ref={lineRef}
                                    points={lineStr}
                                    fill="none"
                                    stroke="#ED7D31"
                                    strokeWidth="2.5"
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                    strokeDasharray={dashLen}
                                    strokeDashoffset={dashOffset}
                                    style={{ transition: `stroke-dashoffset 1.1s cubic-bezier(0.4, 0, 0.2, 1)` }}
                                />
                            </>
                        )}

                        {points.map((p, i) => (
                            <circle
                                key={`${period}-${i}`}
                                cx={p.x}
                                cy={p.y}
                                r="4.5"
                                fill="#ED7D31"
                                stroke="white"
                                strokeWidth="2"
                                style={{
                                    opacity: dotsVisible || data.length < 2 ? 1 : 0,
                                    transform: dotsVisible || data.length < 2 ? "scale(1)" : "scale(0)",
                                    transformOrigin: `${p.x}px ${p.y}px`,
                                    transition: `opacity 0.25s ease ${0.08 * i}s, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.08 * i}s`,
                                }}
                            />
                        ))}

                        {points.map((p) => (
                            <text key={p.month} x={p.x} y={CHART_BOTTOM + 18} fontSize="10" fill="#9ca3af" textAnchor="middle">
                                {p.month}
                            </text>
                        ))}
                    </svg>
                )}
            </CardContent>
        </Card>
    );
}
