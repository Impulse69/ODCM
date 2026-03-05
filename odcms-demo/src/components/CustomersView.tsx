"use client";

import { useState, useMemo } from "react";
import { Search, UserPlus, MoreHorizontal, Phone, Car } from "lucide-react";
import IndividualProfile from "@/components/IndividualProfile"
import CompanyProfile from "@/components/CompanyProfile"
import AddCustomerForm from "@/components/AddCustomerForm"
import AddCompanyForm from "@/components/AddCompanyForm"
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { subscriptions, companies } from "@/data/dummy";
import { cn } from "@/lib/utils";

// Derive individual customers from subscriptions — aggregate multi-vehicle owners
const customers = Array.from(
    subscriptions
        .filter((sub) => !companies.some((co) => co.companyName === sub.customerName))
        .reduce((map, sub) => {
            const existing = map.get(sub.customerName);
            if (existing) {
                existing.vehicles += 1;
                existing.totalMonthly += sub.monthlyAmount;
                // keep worst status
                const priority: Record<string, number> = { Suspended: 0, Overdue: 1, "Due Soon": 2, Active: 3 };
                if ((priority[sub.status] ?? 3) < (priority[existing.status] ?? 3)) {
                    existing.status = sub.status;
                }
            } else {
                map.set(sub.customerName, {
                    id: sub.id,
                    name: sub.customerName,
                    phone: sub.phone,
                    vehicles: 1,
                    plan: sub.plan,
                    status: sub.status,
                    initials: sub.customerName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
                    totalMonthly: sub.monthlyAmount,
                });
            }
            return map;
        }, new Map<string, {
            id: string; name: string; phone: string; vehicles: number; plan: string;
            status: string; initials: string; totalMonthly: number;
        }>())
).map(([, v]) => v);

// Derive company vehicle counts from subscriptions
const companyRows = companies.map((co) => {
    const coVehicles = subscriptions.filter((s) => s.customerName === co.companyName);
    const vehicleCount = coVehicles.length;
    const totalMonthly = coVehicles.reduce((sum, v) => sum + v.monthlyAmount, 0);
    // derive worst status across fleet
    const priority: Record<string, number> = { Suspended: 0, Overdue: 1, "Due Soon": 2, Active: 3 };
    let worstStatus = co.status ?? "Active";
    for (const v of coVehicles) {
        if ((priority[v.status] ?? 3) < (priority[worstStatus] ?? 3)) {
            worstStatus = v.status;
        }
    }
    // Minimal override: consider a company "Active" if it has at least 7 active vehicles.
    const activeCount = coVehicles.filter((v) => v.status === "Active").length;
    if (activeCount >= 7) {
        worstStatus = "Active";
    }
    return { ...co, vehicleCount, totalMonthly, derivedStatus: worstStatus };
});

const statusColors: Record<string, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Due Soon": "bg-amber-50 text-amber-700 border-amber-200",
    Overdue: "bg-red-50 text-red-700 border-red-200",
    Suspended: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const avatarColors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-600",
    "from-[#ED7D31] to-[#C9651B]",
    "from-pink-500 to-rose-500",
];

export default function CustomersView() {
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<"individuals" | "companies">("individuals")
    const [selectedIndividual, setSelectedIndividual] = useState<string | null>(null)
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null)

    const filteredIndividuals = useMemo(
        () =>
            customers.filter(
                (c) =>
                    !search ||
                    c.name.toLowerCase().includes(search.toLowerCase()) ||
                    c.phone.includes(search)
            ),
        [search]
    );

    const filteredCompanies = useMemo(
        () =>
            companyRows.filter(
                (co) =>
                    !search ||
                    co.companyName.toLowerCase().includes(search.toLowerCase()) ||
                    (co.contactPhone ?? "").includes(search) ||
                    (co.billingContactName ?? "").toLowerCase().includes(search.toLowerCase())
            ),
        [search]
    );

    return (
        <div className="space-y-5 animate-fade-in-up" style={{ opacity: 0 }}>
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                        Customer Management
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {tab === "individuals" ? `${customers.length} registered individuals` : `${companyRows.length} registered companies`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <nav className="flex items-center rounded-md bg-muted/50 p-1">
                        <button
                            onClick={() => setTab("individuals")}
                            className={`px-3 py-1 text-sm font-medium rounded ${tab === "individuals" ? "bg-odg-orange text-white shadow-sm" : "hover:bg-odg-orange/10"}`}
                        >
                            Individuals
                        </button>
                        <button
                            onClick={() => setTab("companies")}
                            className={`px-3 py-1 text-sm font-medium rounded ${tab === "companies" ? "bg-odg-orange text-white shadow-sm" : "hover:bg-odg-orange/10"}`}
                        >
                            Companies
                        </button>
                    </nav>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-2 bg-odg-orange text-white hover:brightness-95">
                                <UserPlus size={15} /> {tab === "individuals" ? "Add Individual" : "Add Company"}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>{tab === "individuals" ? "Add Individual" : "Add Company"}</DialogTitle>
                            </DialogHeader>
                            {tab === "individuals" ? (
                                <AddCustomerForm onCreated={() => { }} />
                            ) : (
                                <AddCompanyForm onCreated={() => { }} />
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                    { label: "Total", value: tab === "individuals" ? customers.length : companyRows.length, color: "text-foreground" },
                    { label: "Active", value: tab === "individuals" ? customers.filter((c) => c.status === "Active").length : companyRows.filter((c) => c.derivedStatus === "Active").length, color: "text-emerald-600" },
                    { label: "Due Soon", value: tab === "individuals" ? customers.filter((c) => c.status === "Due Soon").length : companyRows.filter((c) => c.derivedStatus === "Due Soon").length, color: "text-amber-600" },
                    { label: "Overdue / Suspended", value: tab === "individuals" ? customers.filter((c) => c.status === "Overdue" || c.status === "Suspended").length : companyRows.filter((c) => c.derivedStatus === "Overdue" || c.derivedStatus === "Suspended").length, color: "text-red-500" },
                ] as const).map((s) => (
                    <Card key={s.label} className="border border-border shadow-sm">
                        <CardContent className="py-4 px-4">
                            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground font-semibold">{s.label}</p>
                            <p className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border border-border shadow-sm">
                <CardHeader className="border-b border-border py-4 px-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base">{tab === "individuals" ? "Individuals" : "Companies"}</CardTitle>
                            <CardDescription className="text-xs mt-0.5">{tab === "individuals" ? `${filteredIndividuals.length} shown` : `${filteredCompanies.length} shown`}</CardDescription>
                        </div>
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or phone…"
                                className="pl-7 h-8 text-xs w-56 bg-muted/50 border-border focus-visible:ring-primary/30"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border">
                        {tab === "individuals" ? (
                            filteredIndividuals.map((c, i) => {
                                const grad = avatarColors[i % avatarColors.length];
                                return (
                                    <div
                                        key={c.id}
                                        className="flex items-center gap-4 px-5 py-4 transition-colors group hover:bg-odg-orange/10"
                                    >
                                        <Avatar className="w-10 h-10 shrink-0">
                                            <AvatarFallback
                                                className={`bg-linear-to-br ${grad} text-white text-xs font-bold`}
                                            >
                                                {c.initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-foreground">{c.name}</p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Phone size={11} /> {c.phone}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Car size={11} /> {c.vehicles} vehicle{c.vehicles !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                        </div>

                                        <Badge
                                            variant="outline"
                                            className={cn("text-[0.65rem] font-semibold px-2 py-0.5", statusColors[c.status] ?? "")}
                                        >
                                            {c.status}
                                        </Badge>

                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-semibold text-foreground">GH₵ {c.totalMonthly}</p>
                                            <p className="text-[0.65rem] text-muted-foreground mt-0.5">Total Amount Owed • {c.vehicles} vehicle{c.vehicles !== 1 ? "s" : ""}</p>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-xs"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                                                >
                                                    <MoreHorizontal size={15} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setSelectedIndividual(c.name)}>View Vehicles</DropdownMenuItem>
                                                <DropdownMenuItem className="text-xs cursor-pointer">Edit Details</DropdownMenuItem>
                                                <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive">
                                                    Suspend Account
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                );
                            })
                        ) : (
                            filteredCompanies.map((co, i) => (
                                <div key={co.id} className="flex items-center gap-4 px-5 py-4 transition-colors group hover:bg-odg-orange/10">
                                    <Avatar className="w-10 h-10 shrink-0">
                                        <AvatarFallback className={`bg-linear-to-br ${avatarColors[i % avatarColors.length]} text-white text-xs font-bold`}>
                                            {co.companyName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-foreground">{co.companyName}</p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Phone size={11} /> {co.contactPhone}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Car size={11} /> {co.vehicleCount} vehicle{co.vehicleCount !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    </div>

                                    <Badge variant="outline" className={cn("text-[0.65rem] font-semibold px-2 py-0.5", statusColors[co.derivedStatus] ?? "")}>
                                        {co.derivedStatus}
                                    </Badge>

                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-semibold text-foreground">GH₵ {co.totalMonthly}</p>
                                        <p className="text-[0.65rem] text-muted-foreground mt-0.5">Total Amount Owed • {co.vehicleCount} vehicle{co.vehicleCount !== 1 ? "s" : ""}</p>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
                                            >
                                                <MoreHorizontal size={15} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setSelectedCompany(co.id)}>View Vehicles</DropdownMenuItem>
                                            <DropdownMenuItem className="text-xs cursor-pointer">Edit Details</DropdownMenuItem>
                                            <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive">
                                                Suspend Account
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ))
                        )}
                    </div>

                    {selectedIndividual && (
                        <IndividualProfile name={selectedIndividual} onClose={() => setSelectedIndividual(null)} />
                    )}
                    {selectedCompany && (
                        <CompanyProfile id={selectedCompany} onClose={() => setSelectedCompany(null)} />
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
