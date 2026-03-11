"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
    ChevronUp,
    ChevronDown,
    Download,
    Search,
    RefreshCw,
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getVehicles, type Vehicle } from "@/lib/vehicles-api";

// ── Compute display status from expiry date ──────────────────────────────────
function computeStatus(expiryDate: string, backendStatus: string): string {
    if (backendStatus === "Suspended") return "Suspended";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    if (expiry < today) return "Expired";
    const twoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    if (expiry <= twoWeeks) return "Due Soon";
    return "Active";
}

// ── Status badge config ──────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
    Active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    "Due Soon": { label: "Due Soon", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
    Expired: { label: "Expired", className: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
    Suspended: { label: "Suspended", className: "bg-zinc-100 text-zinc-500 border-zinc-200", dot: "bg-zinc-400" },
};

const trakzeeConfig: Record<string, { className: string }> = {
    Active: { className: "bg-blue-50 text-blue-700 border-blue-200" },
    Deactivated: { className: "bg-red-50 text-red-600 border-red-200" },
};

const planColors: Record<string, string> = {
    Basic: "bg-zinc-100 text-zinc-600 border-zinc-200",
    Standard: "bg-[#FFF5EC] text-[#C9651B] border-orange-200",
    Premium: "bg-violet-50 text-violet-700 border-violet-200",
};

type SortField = "customer_name" | "expiry_date" | "status" | "plan";
type SortDir = "asc" | "desc";
type FilterTab = "All" | "Active" | "Due Soon" | "Expired" | "Suspended";

const FILTER_TABS: FilterTab[] = ["All", "Active", "Due Soon", "Expired", "Suspended"];

// ── ThCell — declared outside component to avoid re-creation on render ───────
function ThCell({
    field,
    children,
    align = "left",
    sortable = false,
    sortField,
    sortDir,
    onSort,
}: {
    field?: SortField;
    children: React.ReactNode;
    align?: "left" | "right";
    sortable?: boolean;
    sortField?: SortField;
    sortDir?: SortDir;
    onSort?: (f: SortField) => void;
}) {
    const active = field && sortField === field;
    return (
        <TableHead
            className={cn(
                "text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground select-none",
                align === "right" && "text-right",
                sortable && "cursor-pointer hover:text-foreground transition-colors"
            )}
            onClick={sortable && field && onSort ? () => onSort(field) : undefined}
        >
            <span className="inline-flex items-center gap-1">
                {children}
                {sortable && field && (
                    active && sortDir === "asc"
                        ? <ChevronUp size={12} className="text-primary" />
                        : active && sortDir === "desc"
                            ? <ChevronDown size={12} className="text-primary" />
                            : <ChevronDown size={12} className="opacity-25" />
                )}
            </span>
        </TableHead>
    );
}

export default function SubscriptionTable() {
    const [data, setData] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTab, setFilterTab] = useState<FilterTab>("All");
    const [search, setSearch] = useState("");
    const [sortField, setSortField] = useState<SortField>("expiry_date");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    const fetchData = useCallback(() => {
        getVehicles().then(setData).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Re-fetch when a payment is recorded from VehiclesView
    useEffect(() => {
        const handler = () => { setLoading(true); fetchData(); };
        window.addEventListener("payment-recorded", handler);
        return () => window.removeEventListener("payment-recorded", handler);
    }, [fetchData]);

    const handleRefresh = () => {
        setSearch("");
        setFilterTab("All");
        setLoading(true);
        fetchData();
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortField(field); setSortDir("asc"); }
    };

    const counts = useMemo(
        () => ({
            All: data.length,
            Active: data.filter((s) => computeStatus(s.expiry_date, s.status) === "Active").length,
            "Due Soon": data.filter((s) => computeStatus(s.expiry_date, s.status) === "Due Soon").length,
            Expired: data.filter((s) => computeStatus(s.expiry_date, s.status) === "Expired").length,
            Suspended: data.filter((s) => s.status === "Suspended").length,
        }),
        [data]
    );

    const filtered = useMemo(() => {
        return data
            .filter((s) => filterTab === "All" || computeStatus(s.expiry_date, s.status) === filterTab)
            .filter(
                (s) =>
                    !search ||
                    s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
                    s.plate_number.toLowerCase().includes(search.toLowerCase()) ||
                    s.imei.includes(search) ||
                    s.phone.includes(search)
            )
            .sort((a, b) => {
                let cmp = 0;
                if (sortField === "customer_name") cmp = a.customer_name.localeCompare(b.customer_name);
                if (sortField === "expiry_date") cmp = a.expiry_date.localeCompare(b.expiry_date);
                if (sortField === "status") cmp = computeStatus(a.expiry_date, a.status).localeCompare(computeStatus(b.expiry_date, b.status));
                if (sortField === "plan") cmp = a.plan.localeCompare(b.plan);
                return sortDir === "asc" ? cmp : -cmp;
            });
    }, [data, filterTab, search, sortField, sortDir]);

    const handleExport = () => {
        const headers = ["ID", "Customer", "Phone", "Plate", "IMEI", "Plan", "Amount", "Expiry", "Status", "Trakzee"];
        const rows = filtered.map((s) => [
            s.id, s.customer_name, s.phone, s.plate_number, s.imei,
            s.plan, `GH₵${s.monthly_amount}`, s.expiry_date, s.status, s.trakzee_status,
        ]);
        const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), { href: url, download: "odcms-subscriptions.csv" });
        a.click(); URL.revokeObjectURL(url);
    };

    const thProps = { sortField, sortDir, onSort: handleSort };

    return (
        <Card className="border border-border shadow-sm overflow-hidden">
            {/* ── Header ── */}
            <CardHeader className="border-b border-border pb-0 pt-5 px-5">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div>
                        <CardTitle className="text-base font-bold">Due Subscriptions</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            {loading ? "Loading…" : `${filtered.length} subscription${filtered.length !== 1 ? "s" : ""} found`}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefresh}
                                    className="h-8 gap-1.5 text-xs border-border hover:border-primary/50"
                                >
                                    <RefreshCw size={13} />
                                    Refresh
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Refresh data &amp; clear filters</TooltipContent>
                        </Tooltip>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            className="h-8 gap-1.5 text-xs border-border hover:border-primary/50 hover:text-primary"
                        >
                            <Download size={13} />
                            Export CSV
                        </Button>
                    </div>
                </div>

                {/* Tabs + search row */}
                <div className="flex items-center justify-between gap-3 flex-wrap pb-1">
                    <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)}>
                        <TabsList className="h-8 bg-muted/60 p-0.5 gap-0.5">
                            {FILTER_TABS.map((tab) => (
                                <TabsTrigger
                                    key={tab}
                                    value={tab}
                                    className="h-7 px-3 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                                >
                                    {tab}
                                    <span className="ml-1.5 text-[0.6rem] text-muted-foreground">
                                        ({counts[tab]})
                                    </span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search…"
                            className="pl-7 h-8 text-xs w-48 bg-muted/50 border-border focus-visible:ring-primary/30"
                        />
                    </div>
                </div>
            </CardHeader>

            {/* ── Table ── */}
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <ThCell field="customer_name" sortable {...thProps}>Customer Info</ThCell>
                                <ThCell {...thProps}>Vehicle</ThCell>
                                <ThCell {...thProps}>Installed</ThCell>
                                <ThCell field="expiry_date" sortable {...thProps}>Expiry & Status</ThCell>
                                <ThCell {...thProps}>Trakzee Sync</ThCell>
                                <ThCell field="plan" sortable {...thProps}>Plan</ThCell>
                                <ThCell {...thProps}>SMS Status</ThCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                                        Loading subscriptions…
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                                        No subscriptions match your current filters.
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && filtered.map((sub) => {
                                const computedStatus = computeStatus(sub.expiry_date, sub.status);
                                const statusCfg = statusConfig[computedStatus] ?? statusConfig.Active;
                                const trakzeeCfg = trakzeeConfig[sub.trakzee_status] ?? trakzeeConfig.Deactivated;
                                const planColor = planColors[sub.plan] ?? planColors.Standard;
                                const formattedExpiry = new Date(sub.expiry_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                                const formattedInstall = sub.installation_date
                                    ? new Date(sub.installation_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                    : "—";

                                return (
                                    <TableRow key={sub.id} className="group hover:bg-muted/30 transition-colors">
                                        {/* Customer */}
                                        <TableCell className="py-3.5 pl-5">
                                            <div className="font-semibold text-sm text-foreground">{sub.customer_name}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">{sub.phone}</div>
                                            <div className="text-[0.65rem] text-muted-foreground/60 font-mono mt-0.5">{sub.id}</div>
                                        </TableCell>

                                        {/* Vehicle */}
                                        <TableCell className="py-3.5">
                                            <div className="font-semibold text-sm">{sub.plate_number}</div>
                                            <div className="text-[0.7rem] font-mono text-muted-foreground mt-0.5">{sub.imei}</div>
                                        </TableCell>

                                        {/* Installed */}
                                        <TableCell className="py-3.5">
                                            <span className="text-sm text-foreground">{formattedInstall}</span>
                                        </TableCell>

                                        {/* Expiry & Status */}
                                        <TableCell className="py-3.5">
                                            <div className="text-sm text-foreground mb-1.5">{formattedExpiry}</div>
                                            <Badge variant="outline" className={cn("text-[0.65rem] font-semibold px-2 py-0.5 gap-1.5", statusCfg.className)}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                                                {statusCfg.label}
                                            </Badge>
                                        </TableCell>

                                        {/* Trakzee */}
                                        <TableCell className="py-3.5">
                                            <Badge variant="outline" className={cn("text-[0.65rem] font-semibold px-2 py-0.5", trakzeeCfg.className)}>
                                                {sub.trakzee_status}
                                            </Badge>
                                        </TableCell>

                                        {/* Plan */}
                                        <TableCell className="py-3.5">
                                            <Badge variant="outline" className={cn("text-[0.65rem] font-semibold px-2 py-0.5 mb-1", planColor)}>
                                                {sub.plan}
                                            </Badge>
                                            <div className="text-[0.7rem] text-muted-foreground">GH₵{sub.monthly_amount}/mo</div>
                                        </TableCell>

                                        {/* SMS Status */}
                                        <TableCell className="py-3.5">
                                            {computedStatus === "Due Soon" ? (
                                                <Badge variant="outline" className="text-[0.65rem] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                                                    Sent
                                                </Badge>
                                            ) : (computedStatus === "Expired" || computedStatus === "Suspended") ? (
                                                <Badge variant="outline" className="text-[0.65rem] font-semibold px-2 py-0.5 bg-red-50 text-red-700 border-red-200">
                                                    Failed
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{" "}
                        <span className="font-semibold text-foreground">{data.length}</span> subscriptions
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
