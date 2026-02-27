"use client";

import { useState, useMemo } from "react";
import { Search, Car, Wifi, WifiOff, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { subscriptions } from "@/data/dummy";
import { cn } from "@/lib/utils";

export default function VehiclesView() {
    const [search, setSearch] = useState("");

    const vehicles = useMemo(
        () =>
            subscriptions.filter(
                (s) =>
                    !search ||
                    s.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
                    s.imei.includes(search) ||
                    s.customerName.toLowerCase().includes(search.toLowerCase())
            ),
        [search]
    );

    const syncedCount = subscriptions.filter((s) => s.trakzeeStatus === "Active").length;
    const desyncedCount = subscriptions.filter((s) => s.trakzeeStatus === "Deactivated").length;

    return (
        <div className="space-y-5 animate-fade-in-up" style={{ opacity: 0 }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                        Vehicle Registry
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {subscriptions.length} vehicles tracked with IMEI
                    </p>
                </div>
                <Button size="sm" className="gap-2">
                    <Car size={15} /> Register Vehicle
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                    { label: "Total Vehicles", value: subscriptions.length, color: "text-foreground" },
                    { label: "Trakzee Synced", value: syncedCount, color: "text-blue-600" },
                    { label: "Desynced / Off", value: desyncedCount, color: "text-red-500" },
                ].map((s) => (
                    <Card key={s.label} className="border border-border shadow-sm">
                        <CardContent className="py-4 px-4">
                            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground font-semibold">{s.label}</p>
                            <p className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border border-border shadow-sm overflow-hidden">
                <CardHeader className="border-b border-border py-4 px-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base">All Vehicles</CardTitle>
                            <CardDescription className="text-xs mt-0.5">{vehicles.length} shown</CardDescription>
                        </div>
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Plate, IMEI or owner…"
                                className="pl-7 h-8 text-xs w-56 bg-muted/50 border-border focus-visible:ring-primary/30"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    {["Plate Number", "Owner", "IMEI", "Plan", "Trakzee", "Expiry", ""].map((h) => (
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
                                {vehicles.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground text-sm">
                                            No vehicles match your search.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {vehicles.map((v) => (
                                    <TableRow key={v.id} className="hover:bg-muted/30 group">
                                        <TableCell className="font-bold text-sm pl-5">{v.plateNumber}</TableCell>
                                        <TableCell>
                                            <div className="font-medium text-sm">{v.customerName}</div>
                                            <div className="text-xs text-muted-foreground">{v.phone}</div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">{v.imei}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className="text-[0.65rem] font-semibold px-2 py-0.5 bg-[#FFF5EC] text-[#C9651B] border-orange-200"
                                            >
                                                {v.plan}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[0.65rem] font-semibold px-2 py-0.5 gap-1.5",
                                                    v.trakzeeStatus === "Active"
                                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                                        : "bg-red-50 text-red-600 border-red-200"
                                                )}
                                            >
                                                {v.trakzeeStatus === "Active"
                                                    ? <Wifi size={10} />
                                                    : <WifiOff size={10} />
                                                }
                                                {v.trakzeeStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{v.expiryDate}</TableCell>
                                        <TableCell className="pr-5">
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
                                                    <DropdownMenuItem className="text-xs cursor-pointer">View Details</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-xs cursor-pointer">Sync Trakzee</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive">
                                                        Remove Vehicle
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
