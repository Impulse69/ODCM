"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, Plus, MoreHorizontal, Car, Loader2, AlertCircle, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import IndividualProfile from "@/components/IndividualProfile";
import CompanyProfile from "@/components/CompanyProfile";
import AddCustomerForm from "@/components/AddCustomerForm";
import AddCompanyForm from "@/components/AddCompanyForm";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getIndividuals, getCompanies, updateIndividual, updateCompany, deleteIndividual, deleteCompany, type IndividualCustomer, type Company } from "@/lib/customers-api";
import { cn } from "@/lib/utils";

const priorityToStatus: Record<number, string> = { 1: "Suspended", 2: "Overdue", 3: "Due Soon", 4: "Active" };

const statusColors: Record<string, string> = {
    Active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Due Soon":"bg-amber-50 text-amber-700 border-amber-200",
    Overdue:   "bg-red-50 text-red-700 border-red-200",
    Suspended: "bg-red-50 text-red-400 border-red-200",
};

const avatarColors = [
    "from-[#ED7D31] to-[#C9651B]",
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-600",
    "from-pink-500 to-rose-500",
];

const PAGE_SIZE = 10;

export default function CustomersView() {
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<"individuals" | "companies">("individuals");
    const [page, setPage] = useState(1);
    const [selectedIndividual, setSelectedIndividual] = useState<string | null>(null);
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const [editIndividual, setEditIndividual] = useState<IndividualCustomer | null>(null);
    const [editCompany, setEditCompany] = useState<Company | null>(null);
    const [editForm, setEditForm] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; type: "individual" | "company" } | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [individuals, setIndividuals] = useState<IndividualCustomer[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [inds, cos] = await Promise.all([getIndividuals(), getCompanies()]);
            setIndividuals(inds);
            setCompanies(cos);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load customers.");
        } finally {
            setLoading(false);
        }
    }, []);

    function openEditIndividual(c: IndividualCustomer) {
        setEditIndividual(c);
        setEditForm({ name: c.name, phone: c.phone });
    }

    function openEditCompany(co: Company) {
        setEditCompany(co);
        setEditForm({
            company_name: co.company_name,
            billing_contact_name: co.billing_contact_name ?? "",
            contact_phone: co.contact_phone ?? "",
            email: co.email ?? "",
            address: co.address ?? "",
            tax_id: co.tax_id ?? "",
        });
    }

    async function saveIndividual() {
        if (!editIndividual) return;
        setSaving(true);
        try {
            await updateIndividual(editIndividual.id, { name: editForm.name, phone: editForm.phone });
            setEditIndividual(null);
            fetchData();
        } finally {
            setSaving(false);
        }
    }

    async function saveCompany() {
        if (!editCompany) return;
        setSaving(true);
        try {
            await updateCompany(editCompany.id, {
                company_name: editForm.company_name,
                billing_contact_name: editForm.billing_contact_name,
                contact_phone: editForm.contact_phone,
                email: editForm.email,
                address: editForm.address,
                tax_id: editForm.tax_id,
            });
            setEditCompany(null);
            fetchData();
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirmDelete) return;
        setDeleting(true);
        try {
            if (confirmDelete.type === "individual") {
                await deleteIndividual(confirmDelete.id);
            } else {
                await deleteCompany(confirmDelete.id);
            }
            setConfirmDelete(null);
            fetchData();
        } finally {
            setDeleting(false);
        }
    }

    useEffect(() => { fetchData(); }, [fetchData]);

    // reset page on tab/search change
    useEffect(() => { setPage(1); }, [tab, search]);

    const source = tab === "individuals" ? individuals : companies;

    const filtered = useMemo(() => {
        if (tab === "individuals") {
            return individuals.filter(
                (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
            );
        }
        return companies.filter((co) =>
            !search ||
            co.company_name.toLowerCase().includes(search.toLowerCase()) ||
            (co.contact_phone ?? "").includes(search) ||
            (co.billing_contact_name ?? "").toLowerCase().includes(search.toLowerCase())
        );
    }, [search, tab, individuals, companies]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // KPI stats
    const total   = source.length;
    const active  = source.filter((c) => c.worst_priority === 4).length;
    const dueSoon = source.filter((c) => c.worst_priority === 3).length;
    const overdue = source.filter((c) => c.worst_priority <= 2).length;

    const stats = [
        { label: "TOTAL",             value: total,   trend: "+5%",  up: true  },
        { label: "ACTIVE",            value: active,  trend: "+2%",  up: true  },
        { label: "DUE SOON",          value: dueSoon, trend: "-1%",  up: false },
        { label: "OVERDUE / SUSPENDED", value: overdue, trend: "-3%", up: false },
    ];

    return (
        <div className="space-y-5">
            {/* â”€â”€ Page header â”€â”€ */}
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Customer Management</h1>
            </div>

            {/* â”€â”€ Tabs + Search + Add â”€â”€ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                {/* Underline tabs */}
                <div className="flex items-end gap-1 border-b border-border w-full sm:w-auto">
                    {(["individuals", "companies"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={cn(
                                "px-4 py-2 text-sm font-medium capitalize transition-colors",
                                tab === t
                                    ? "text-odg-orange border-b-2 border-odg-orange -mb-px"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t === "individuals" ? "Individuals" : "Companies"}
                        </button>
                    ))}
                </div>

                {/* Search + Add */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search"
                            className="pl-9 pr-4 h-9 text-sm rounded-lg border border-border bg-background w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
                        />
                    </div>
                    <Dialog open={addOpen} onOpenChange={setAddOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-2 bg-odg-orange text-white hover:brightness-95 h-9">
                                <Plus size={15} />
                                {tab === "individuals" ? "Add Individual" : "Add Company"}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>{tab === "individuals" ? "Add Individual" : "Add Company"}</DialogTitle>
                            </DialogHeader>
                            {tab === "individuals" ? (
                                <AddCustomerForm onCreated={() => { setAddOpen(false); fetchData(); }} />
                            ) : (
                                <AddCompanyForm onCreated={() => { setAddOpen(false); fetchData(); }} />
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* â”€â”€ KPI cards â”€â”€ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <div key={s.label} className="bg-card border border-border rounded-xl px-5 py-4 shadow-sm">
                        <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                        <div className="flex items-end gap-2 mt-1.5">
                            <span className="text-3xl font-extrabold text-foreground leading-none">{s.value.toLocaleString()}</span>
                            <span className={cn("flex items-center gap-0.5 text-xs font-semibold mb-0.5", s.up ? "text-emerald-600" : "text-orange-500")}>
                                {s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {s.trend}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* â”€â”€ Error â”€â”€ */}
            {error && (
                <div className="flex items-center gap-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {/* â”€â”€ Full-width search bar â”€â”€ */}
            <div className="relative">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or phone..."
                    className="w-full pl-10 pr-4 h-11 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
                />
            </div>

            {/* â”€â”€ Table â”€â”€ */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                {/* Column headers — hidden on mobile */}
                <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-4 px-6 py-3 border-b border-border bg-muted/30">
                    {["CUSTOMER INFO", "VEHICLES", "STATUS", "TOTAL OWED", "ACTIONS"].map((col) => (
                        <span key={col} className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{col}</span>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
                        <Loader2 size={18} className="animate-spin" /> Loading customersâ€¦
                    </div>
                ) : pageItems.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-12">No customers found.</p>
                ) : (
                    <div className="divide-y divide-border">
                        {tab === "individuals"
                            ? (pageItems as IndividualCustomer[]).map((c, i) => {
                                const status = priorityToStatus[c.worst_priority] ?? "Active";
                                const isNegative = status === "Suspended" || status === "Overdue";
                                return (
                                    <div key={c.id} className="group hover:bg-muted/30 transition-colors">
                                        {/* Desktop row */}
                                        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-4 items-center px-6 py-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Avatar className="w-10 h-10 shrink-0">
                                                <AvatarFallback className={`bg-linear-to-br ${avatarColors[i % avatarColors.length]} text-white text-xs font-bold`}>
                                                        {c.initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{c.phone}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Car size={13} className="shrink-0" />
                                                <span>{c.vehicle_count} vehicle{c.vehicle_count !== 1 ? "s" : ""}</span>
                                            </div>
                                            <div>
                                                <Badge variant="outline" className={cn("text-[0.7rem] font-semibold px-2.5 py-0.5", statusColors[status] ?? "")}>
                                                    {status}
                                                </Badge>
                                            </div>
                                            <p className={cn("text-sm font-semibold tabular-nums", isNegative ? "text-red-500" : "text-foreground")}>
                                                ${Number(c.total_monthly).toFixed(2)}
                                            </p>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground">
                                                        <MoreHorizontal size={15} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setSelectedIndividual(c.id)}>View Vehicles</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => openEditIndividual(c)}>Edit Details</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive" onClick={() => setConfirmDelete({ id: c.id, name: c.name, type: "individual" })}>
                                                        <Trash2 size={12} className="mr-1" /> Delete Customer
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        {/* Mobile card */}
                                        <div className="sm:hidden px-4 py-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <Avatar className="w-9 h-9 shrink-0">
                                                        <AvatarFallback className={`bg-linear-to-br ${avatarColors[i % avatarColors.length]} text-white text-[0.6rem] font-bold`}>
                                                            {c.initials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                                                        <p className="text-xs text-muted-foreground">{c.phone}</p>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground">
                                                            <MoreHorizontal size={15} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40">
                                                        <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setSelectedIndividual(c.id)}>View Vehicles</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => openEditIndividual(c)}>Edit Details</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive" onClick={() => setConfirmDelete({ id: c.id, name: c.name, type: "individual" })}>
                                                            <Trash2 size={12} className="mr-1" /> Delete Customer
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs">
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Car size={11} /> {c.vehicle_count} vehicle{c.vehicle_count !== 1 ? "s" : ""}
                                                </div>
                                                <Badge variant="outline" className={cn("text-[0.65rem] font-semibold px-2 py-0", statusColors[status] ?? "")}>
                                                    {status}
                                                </Badge>
                                                <span className={cn("font-semibold tabular-nums ml-auto", isNegative ? "text-red-500" : "text-foreground")}>
                                                    ${Number(c.total_monthly).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                            : (pageItems as Company[]).map((co, i) => {
                                const status = priorityToStatus[co.worst_priority] ?? co.status ?? "Active";
                                const isNegative = status === "Suspended" || status === "Overdue";
                                const initials = co.company_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                                return (
                                    <div key={co.id} className="group hover:bg-muted/30 transition-colors">
                                        {/* Desktop row */}
                                        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-4 items-center px-6 py-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Avatar className="w-10 h-10 shrink-0">
                                                    <AvatarFallback className={`bg-linear-to-br ${avatarColors[i % avatarColors.length]} text-white text-xs font-bold`}>
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm text-foreground truncate">{co.company_name}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{co.contact_phone}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Car size={13} className="shrink-0" />
                                                <span>{co.vehicle_count} vehicle{co.vehicle_count !== 1 ? "s" : ""}</span>
                                            </div>
                                            <div>
                                                <Badge variant="outline" className={cn("text-[0.7rem] font-semibold px-2.5 py-0.5", statusColors[status] ?? "")}>
                                                    {status}
                                                </Badge>
                                            </div>
                                            <p className={cn("text-sm font-semibold tabular-nums", isNegative ? "text-red-500" : "text-foreground")}>
                                                ${Number(co.total_monthly).toFixed(2)}
                                            </p>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground">
                                                        <MoreHorizontal size={15} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40">
                                                    <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setSelectedCompany(co.id)}>View Vehicles</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => openEditCompany(co)}>Edit Details</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive" onClick={() => setConfirmDelete({ id: co.id, name: co.company_name, type: "company" })}>
                                                        <Trash2 size={12} className="mr-1" /> Delete Customer
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        {/* Mobile card */}
                                        <div className="sm:hidden px-4 py-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <Avatar className="w-9 h-9 shrink-0">
                                                        <AvatarFallback className={`bg-linear-to-br ${avatarColors[i % avatarColors.length]} text-white text-[0.6rem] font-bold`}>
                                                            {initials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm text-foreground truncate">{co.company_name}</p>
                                                        <p className="text-xs text-muted-foreground">{co.contact_phone}</p>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground">
                                                            <MoreHorizontal size={15} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40">
                                                        <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setSelectedCompany(co.id)}>View Vehicles</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => openEditCompany(co)}>Edit Details</DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive" onClick={() => setConfirmDelete({ id: co.id, name: co.company_name, type: "company" })}>
                                                            <Trash2 size={12} className="mr-1" /> Delete Customer
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs">
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Car size={11} /> {co.vehicle_count} vehicle{co.vehicle_count !== 1 ? "s" : ""}
                                                </div>
                                                <Badge variant="outline" className={cn("text-[0.65rem] font-semibold px-2 py-0", statusColors[status] ?? "")}>
                                                    {status}
                                                </Badge>
                                                <span className={cn("font-semibold tabular-nums ml-auto", isNegative ? "text-red-500" : "text-foreground")}>
                                                    ${Number(co.total_monthly).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                )}

                {/* â”€â”€ Pagination footer â”€â”€ */}
                {!loading && filtered.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6 py-4 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={14} />
                            </button>
                                                        {(() => {
                                const pages: (number | "ellipsis")[] = [];
                                if (totalPages <= 7) {
                                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                                } else {
                                    pages.push(1);
                                    if (page > 3) pages.push("ellipsis");
                                    const start = Math.max(2, page - 1);
                                    const end   = Math.min(totalPages - 1, page + 1);
                                    for (let i = start; i <= end; i++) pages.push(i);
                                    if (page < totalPages - 2) pages.push("ellipsis");
                                    pages.push(totalPages);
                                }
                                return pages.map((p, idx) =>
                                    p === "ellipsis" ? (
                                        <span key={`el-${idx}`} className="text-xs text-muted-foreground px-1">...</span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p as number)}
                                            className={cn(
                                                "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors",
                                                page === p
                                                    ? "bg-odg-orange text-white shadow-sm"
                                                    : "border border-border text-muted-foreground hover:bg-muted/50"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    )
                                );
                            })()}
                            
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

            {/* â”€â”€ Profile drawers â”€â”€ */}
            {selectedIndividual && <IndividualProfile id={selectedIndividual} onClose={() => setSelectedIndividual(null)} />}
            {selectedCompany && <CompanyProfile id={selectedCompany} onClose={() => setSelectedCompany(null)} />}
            {/* ── Edit Individual Dialog ── */}
            {editIndividual && (
                <Dialog open onOpenChange={(open) => { if (!open) setEditIndividual(null); }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Edit Individual</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Name</label>
                                <input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Phone</label>
                                <input
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => setEditIndividual(null)} disabled={saving}>Cancel</Button>
                            <Button size="sm" className="bg-odg-orange text-white hover:brightness-95" onClick={saveIndividual} disabled={saving}>
                                {saving && <Loader2 size={13} className="animate-spin mr-1" />}
                                Save Changes
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* ── Edit Company Dialog ── */}
            {editCompany && (
                <Dialog open onOpenChange={(open) => { if (!open) setEditCompany(null); }}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Edit Company</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-2">
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-sm font-medium">Company Name</label>
                                <input
                                    value={editForm.company_name}
                                    onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Billing Contact</label>
                                <input
                                    value={editForm.billing_contact_name}
                                    onChange={(e) => setEditForm((f) => ({ ...f, billing_contact_name: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Phone</label>
                                <input
                                    value={editForm.contact_phone}
                                    onChange={(e) => setEditForm((f) => ({ ...f, contact_phone: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Email</label>
                                <input
                                    value={editForm.email}
                                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Tax / VAT ID</label>
                                <input
                                    value={editForm.tax_id}
                                    onChange={(e) => setEditForm((f) => ({ ...f, tax_id: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-sm font-medium">Address</label>
                                <input
                                    value={editForm.address}
                                    onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                                    className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => setEditCompany(null)} disabled={saving}>Cancel</Button>
                            <Button size="sm" className="bg-odg-orange text-white hover:brightness-95" onClick={saveCompany} disabled={saving}>
                                {saving && <Loader2 size={13} className="animate-spin mr-1" />}
                                Save Changes
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* ── Delete Confirmation Dialog ── */}
            {confirmDelete && (
                <Dialog open onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-destructive">
                                <Trash2 size={16} /> Delete Customer
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground py-2">
                            Are you sure you want to delete <span className="font-semibold text-foreground">{confirmDelete.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2 pt-1">
                            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</Button>
                            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                                {deleting && <Loader2 size={13} className="animate-spin mr-1" />}
                                Delete
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
