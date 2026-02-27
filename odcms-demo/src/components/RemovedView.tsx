"use client";

import { useState, useMemo } from "react";
import { ShieldOff, Power, AlertTriangle, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { subscriptions } from "@/data/dummy";
import { cn } from "@/lib/utils";

export default function RemovedView() {
    const [search, setSearch] = useState("");
    const [restored, setRestored] = useState<Set<string>>(new Set());

    // "Removed" = overdue OR suspended
    const removedList = useMemo(
        () =>
            subscriptions
                .filter((s) => s.status === "Overdue" || s.status === "Suspended")
                .filter(
                    (s) =>
                        !search ||
                        s.customerName.toLowerCase().includes(search.toLowerCase()) ||
                        s.plateNumber.toLowerCase().includes(search.toLowerCase())
                ),
        [search]
    );

    const handleRestore = (id: string) => {
        setRestored((prev) => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    return (
        <div className="space-y-5 animate-fade-in-up" style={{ opacity: 0 }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                        Removed List — Enforcement
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Vehicles deactivated due to non-payment or policy violation
                    </p>
                </div>
            </div>

            {/* Warning banner */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
                <span>
                    <strong>{removedList.length} vehicle{removedList.length !== 1 ? "s" : ""}</strong> are currently
                    deactivated or overdue. Immediate action is required to prevent further revenue leakage.
                </span>
            </div>

            <Card className="border border-border shadow-sm overflow-hidden">
                <CardHeader className="border-b border-border py-4 px-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base">Enforcement Log</CardTitle>
                            <CardDescription className="text-xs mt-0.5">{removedList.length} records</CardDescription>
                        </div>
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
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    {["Customer", "Vehicle", "Plan", "Expiry", "Status", "Action"].map((h) => (
                                        <TableHead
                                            key={h}
                                            className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground"
                                        >
                                            {h}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {removedList.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground text-sm">
                                            No enforcement records match.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {removedList.map((s) => {
                                    const isRestored = restored.has(s.id);
                                    return (
                                        <TableRow
                                            key={s.id}
                                            className={cn("hover:bg-muted/30 transition-colors", isRestored && "opacity-50")}
                                        >
                                            <TableCell className="pl-5 py-3.5">
                                                <div className="font-semibold text-sm">{s.customerName}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{s.phone}</div>
                                            </TableCell>
                                            <TableCell className="py-3.5">
                                                <div className="font-semibold text-sm">{s.plateNumber}</div>
                                                <div className="text-[0.7rem] font-mono text-muted-foreground mt-0.5">{s.imei}</div>
                                            </TableCell>
                                            <TableCell className="py-3.5">
                                                <Badge variant="outline" className="text-[0.65rem] font-semibold px-2 py-0.5 bg-[#FFF5EC] text-[#C9651B] border-orange-200">
                                                    {s.plan}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3.5 text-sm text-muted-foreground">{s.expiryDate}</TableCell>
                                            <TableCell className="py-3.5">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[0.65rem] font-semibold px-2 py-0.5",
                                                        s.status === "Overdue"
                                                            ? "bg-red-50 text-red-700 border-red-200"
                                                            : "bg-zinc-100 text-zinc-500 border-zinc-200"
                                                    )}
                                                >
                                                    {isRestored ? "Restored" : s.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3.5 pr-5">
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        className={cn(
                                                            "text-xs h-7 px-2.5 gap-1",
                                                            isRestored
                                                                ? "text-primary border-primary/30 hover:bg-primary/5"
                                                                : "text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                                                        )}
                                                        onClick={() => handleRestore(s.id)}
                                                    >
                                                        {isRestored ? (
                                                            <><Power size={11} /> Undo</>
                                                        ) : (
                                                            <><ShieldOff size={11} /> Enforce</>
                                                        )}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
