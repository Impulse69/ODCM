"use client";

import { useState, useMemo } from "react";
import {
    CreditCard,
    Power,
    ChevronUp,
    ChevronDown,
    Download,
    CheckCircle,
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
import { subscriptions, Subscription, SubscriptionStatus } from "@/data/dummy";

// ── Status badge config ──────────────────────────────────────────────────────
const statusConfig: Record<
    SubscriptionStatus,
    { label: string; className: string; dot: string }
> = {
    Active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
    "Due Soon": { label: "Due Soon", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
    Overdue: { label: "Overdue", className: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
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
    Fleet: "bg-sky-50 text-sky-700 border-sky-200",
};

type SortField = "customerName" | "expiryDate" | "status" | "plan";
type SortDir = "asc" | "desc";
type FilterTab = SubscriptionStatus | "All";

const FILTER_TABS: FilterTab[] = ["All", "Active", "Due Soon", "Overdue", "Suspended"];

// ── Row action feedback ──────────────────────────────────────────────────────
type ActionFeedback = "paid" | "deactivated" | null;

export default function SubscriptionTable() {
    const [filterTab, setFilterTab] = useState<FilterTab>("All");
    const [search, setSearch] = useState("");
    const [sortField, setSortField] = useState<SortField>("expiryDate");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [actionMap, setActionMap] = useState<Record<string, ActionFeedback>>({});

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortField(field); setSortDir("asc"); }
    };

    const SortChevron = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ChevronDown size={12} className="opacity-25" />;
        return sortDir === "asc"
            ? <ChevronUp size={12} className="text-primary" />
            : <ChevronDown size={12} className="text-primary" />;
    };

    const counts = useMemo(
        () => ({
            All: subscriptions.length,
            Active: subscriptions.filter((s) => s.status === "Active").length,
            "Due Soon": subscriptions.filter((s) => s.status === "Due Soon").length,
            Overdue: subscriptions.filter((s) => s.status === "Overdue").length,
            Suspended: subscriptions.filter((s) => s.status === "Suspended").length,
        }),
        []
    );

    const filtered = useMemo(() => {
        return subscriptions
            .filter((s) => filterTab === "All" || s.status === filterTab)
            .filter(
                (s) =>
                    !search ||
                    s.customerName.toLowerCase().includes(search.toLowerCase()) ||
                    s.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
                    s.imei.includes(search) ||
                    s.phone.includes(search)
            )
            .sort((a, b) => {
                let cmp = 0;
                if (sortField === "customerName") cmp = a.customerName.localeCompare(b.customerName);
                if (sortField === "expiryDate") cmp = a.expiryDate.localeCompare(b.expiryDate);
                if (sortField === "status") cmp = a.status.localeCompare(b.status);
                if (sortField === "plan") cmp = a.plan.localeCompare(b.plan);
                return sortDir === "asc" ? cmp : -cmp;
            });
    }, [filterTab, search, sortField, sortDir]);

    const triggerAction = (id: string, action: "paid" | "deactivated") => {
        setActionMap((prev) => ({ ...prev, [id]: action }));
        setTimeout(() => {
            setActionMap((prev) => { const n = { ...prev }; delete n[id]; return n; });
        }, 2500);
    };

    const handleExport = () => {
        const headers = ["ID", "Customer", "Phone", "Plate", "IMEI", "Plan", "Amount", "Expiry", "Status", "Trakzee"];
        const rows = filtered.map((s) => [
            s.id, s.customerName, s.phone, s.plateNumber, s.imei,
            s.plan, `GH₵${s.monthlyAmount}`, s.expiryDate, s.status, s.trakzeeStatus,
        ]);
        const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement("a"), { href: url, download: "odcms-subscriptions.csv" });
        a.click(); URL.revokeObjectURL(url);
    };

    const ThCell = ({
        field,
        children,
        align = "left",
        sortable = false,
    }: {
        field?: SortField;
        children: React.ReactNode;
        align?: "left" | "right";
        sortable?: boolean;
    }) => (
        <TableHead
            className={cn(
                "text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground select-none",
                align === "right" && "text-right",
                sortable && "cursor-pointer hover:text-foreground transition-colors"
            )}
            onClick={sortable && field ? () => handleSort(field) : undefined}
        >
            <span className="inline-flex items-center gap-1">
                {children}
                {sortable && field && <SortChevron field={field} />}
            </span>
        </TableHead>
    );

    return (
        <Card className="border border-border shadow-sm overflow-hidden">
            {/* ── Header ── */}
            <CardHeader className="border-b border-border pb-0 pt-5 px-5">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div>
                        <CardTitle className="text-base font-bold">Due Subscriptions</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            {filtered.length} subscription{filtered.length !== 1 ? "s" : ""} found
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSearch("")}
                                    className="h-8 gap-1.5 text-xs border-border hover:border-primary/50"
                                >
                                    <RefreshCw size={13} />
                                    Reset
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Clear filters</TooltipContent>
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
                    <Tabs
                        value={filterTab}
                        onValueChange={(v) => setFilterTab(v as FilterTab)}
                    >
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
                                <ThCell field="customerName" sortable>Customer Info</ThCell>
                                <ThCell>Vehicle</ThCell>
                                <ThCell field="expiryDate" sortable>Expiry & Status</ThCell>
                                <ThCell>Trakzee Sync</ThCell>
                                <ThCell field="plan" sortable>Plan</ThCell>
                                <ThCell align="right">Actions</ThCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                                        No subscriptions match your current filters.
                                    </TableCell>
                                </TableRow>
                            )}
                            {filtered.map((sub) => {
                                const feedback = actionMap[sub.id];
                                const statusCfg = statusConfig[sub.status];
                                const trakzeeCfg = trakzeeConfig[sub.trakzeeStatus];
                                const planColor = planColors[sub.plan] ?? planColors.Standard;

                                return (
                                    <TableRow
                                        key={sub.id}
                                        className="group hover:bg-muted/30 transition-colors"
                                    >
                                        {/* Customer */}
                                        <TableCell className="py-3.5 pl-5">
                                            <div className="font-semibold text-sm text-foreground">{sub.customerName}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">{sub.phone}</div>
                                            <div className="text-[0.65rem] text-muted-foreground/60 font-mono mt-0.5">{sub.id}</div>
                                        </TableCell>

                                        {/* Vehicle */}
                                        <TableCell className="py-3.5">
                                            <div className="font-semibold text-sm">{sub.plateNumber}</div>
                                            <div className="text-[0.7rem] font-mono text-muted-foreground mt-0.5">
                                                {sub.imei}
                                            </div>
                                        </TableCell>

                                        {/* Expiry & Status */}
                                        <TableCell className="py-3.5">
                                            <div className="text-sm text-foreground mb-1.5">{sub.expiryDate}</div>
                                            <Badge
                                                variant="outline"
                                                className={cn("text-[0.65rem] font-semibold px-2 py-0.5 gap-1.5", statusCfg.className)}
                                            >
                                                <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                                                {statusCfg.label}
                                            </Badge>
                                        </TableCell>

                                        {/* Trakzee */}
                                        <TableCell className="py-3.5">
                                            <Badge
                                                variant="outline"
                                                className={cn("text-[0.65rem] font-semibold px-2 py-0.5", trakzeeCfg.className)}
                                            >
                                                {sub.trakzeeStatus}
                                            </Badge>
                                        </TableCell>

                                        {/* Plan */}
                                        <TableCell className="py-3.5">
                                            <Badge
                                                variant="outline"
                                                className={cn("text-[0.65rem] font-semibold px-2 py-0.5 mb-1", planColor)}
                                            >
                                                {sub.plan}
                                            </Badge>
                                            <div className="text-[0.7rem] text-muted-foreground">GH₵{sub.monthlyAmount}/mo</div>
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="py-3.5 pr-5 text-right">
                                            {feedback === "paid" ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                                    <CheckCircle size={13} /> Payment Recorded
                                                </span>
                                            ) : feedback === "deactivated" ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                                                    <Power size={13} /> Deactivated
                                                </span>
                                            ) : (
                                                <div className="flex gap-1.5 justify-end">
                                                    {sub.status !== "Suspended" && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="xs"
                                                                    onClick={() => triggerAction(sub.id, "paid")}
                                                                    className="h-7 px-2.5 text-xs gap-1 bg-primary hover:bg-primary/90"
                                                                >
                                                                    <CreditCard size={12} /> Pay
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Record payment for {sub.customerName}</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                    {(sub.status === "Overdue" || sub.status === "Suspended") && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="xs"
                                                                    variant="outline"
                                                                    onClick={() => triggerAction(sub.id, "deactivated")}
                                                                    className="h-7 px-2.5 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                                                                >
                                                                    <Power size={12} /> Deactivate
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Force deactivate {sub.customerName}</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
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
                        <span className="font-semibold text-foreground">{subscriptions.length}</span> subscriptions
                    </span>
                    <div className="flex gap-1">
                        {[1, 2, 3].map((p) => (
                            <button
                                key={p}
                                className={cn(
                                    "w-7 h-7 rounded-md text-xs font-medium border transition-colors",
                                    p === 1
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                                )}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
