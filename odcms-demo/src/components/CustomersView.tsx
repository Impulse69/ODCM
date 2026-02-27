"use client";

import { useState, useMemo } from "react";
import { Search, UserPlus, MoreHorizontal, Phone, Car } from "lucide-react";
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
import { subscriptions } from "@/data/dummy";
import { cn } from "@/lib/utils";

// Derive customers from subscriptions data
const customers = Array.from(
    subscriptions.reduce((map, sub) => {
        if (!map.has(sub.customerName)) {
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

    const filtered = useMemo(
        () =>
            customers.filter(
                (c) =>
                    !search ||
                    c.name.toLowerCase().includes(search.toLowerCase()) ||
                    c.phone.includes(search)
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
                        {customers.length} registered customers
                    </p>
                </div>
                <Button size="sm" className="gap-2">
                    <UserPlus size={15} /> Add Customer
                </Button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total", value: customers.length, color: "text-foreground" },
                    { label: "Active", value: customers.filter((c) => c.status === "Active").length, color: "text-emerald-600" },
                    { label: "Due Soon", value: customers.filter((c) => c.status === "Due Soon").length, color: "text-amber-600" },
                    { label: "Overdue / Suspended", value: customers.filter((c) => c.status === "Overdue" || c.status === "Suspended").length, color: "text-red-500" },
                ].map((s) => (
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
                            <CardTitle className="text-base">Customers</CardTitle>
                            <CardDescription className="text-xs mt-0.5">{filtered.length} shown</CardDescription>
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
                        {filtered.map((c, i) => {
                            const grad = avatarColors[i % avatarColors.length];
                            return (
                                <div
                                    key={c.id}
                                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group"
                                >
                                    <Avatar className="w-10 h-10 flex-shrink-0">
                                        <AvatarFallback
                                            className={`bg-gradient-to-br ${grad} text-white text-xs font-bold`}
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

                                    <div className="text-right flex-shrink-0">
                                        <p className="text-xs font-semibold text-foreground">GH₵ {c.totalMonthly}/mo</p>
                                        <p className="text-[0.65rem] text-muted-foreground mt-0.5">{c.plan} plan</p>
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
                                            <DropdownMenuItem className="text-xs cursor-pointer">View Profile</DropdownMenuItem>
                                            <DropdownMenuItem className="text-xs cursor-pointer">Edit Details</DropdownMenuItem>
                                            <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive">
                                                Suspend Account
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
