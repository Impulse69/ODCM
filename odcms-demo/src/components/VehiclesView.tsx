"use client";

import { useState, useMemo } from "react";
import { Search, Car, Wifi, WifiOff, MoreHorizontal, Check, ChevronsUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { subscriptions as initialSubscriptions, type Subscription } from "@/data/dummy";
import { cn } from "@/lib/utils";

const PLAN_AMOUNTS: Record<string, number> = {
    Basic: 99,
    Standard: 199,
    Premium: 299,
    Fleet: 499,
};

const emptyForm = {
    plateNumber: "",
    customerName: "",
    phone: "",
    imei: "",
    plan: "",
    trakzeeStatus: "" as "" | "Active" | "Deactivated",
    installationDate: "",
    expiryDate: "",
};

export default function VehiclesView() {
    const [search, setSearch] = useState("");
    const [vehicleList, setVehicleList] = useState<Subscription[]>(initialSubscriptions);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);

    // Popover state
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");

    const vehicles = useMemo(
        () =>
            vehicleList.filter(
                (s) =>
                    !search ||
                    s.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
                    s.imei.includes(search) ||
                    s.customerName.toLowerCase().includes(search.toLowerCase())
            ),
        [search, vehicleList]
    );

    // Derive unique customers from the current vehicleList
    const uniqueCustomers = useMemo(() => {
        const map = new Map<string, { name: string; phone: string }>();
        vehicleList.forEach((sub) => {
            if (!map.has(sub.customerName)) {
                map.set(sub.customerName, { name: sub.customerName, phone: sub.phone });
            }
        });
        return Array.from(map.values());
    }, [vehicleList]);

    const filteredCustomers = useMemo(() => {
        return uniqueCustomers.filter(c =>
            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.phone.includes(customerSearch)
        );
    }, [uniqueCustomers, customerSearch]);

    const syncedCount = vehicleList.filter((s) => s.trakzeeStatus === "Active").length;
    const desyncedCount = vehicleList.filter((s) => s.trakzeeStatus === "Deactivated").length;

    const handleOpenForm = () => {
        setForm(emptyForm);
        setCustomerSearch("");
        setShowForm(true);
    };

    const handleSave = () => {
        // Basic validation — all fields required
        if (
            !form.plateNumber ||
            !form.customerName ||
            !form.phone ||
            !form.imei ||
            !form.plan ||
            !form.trakzeeStatus ||
            !form.installationDate ||
            !form.expiryDate
        ) {
            return;
        }

        const newVehicle: Subscription = {
            id: `SUB-${String(vehicleList.length + 1).padStart(3, "0")}`,
            plateNumber: form.plateNumber,
            customerName: form.customerName,
            phone: form.phone,
            imei: form.imei,
            plan: form.plan,
            trakzeeStatus: form.trakzeeStatus as "Active" | "Deactivated",
            installationDate: form.installationDate,
            expiryDate: form.expiryDate,
            status: "Active",
            monthlyAmount: PLAN_AMOUNTS[form.plan] ?? 99,
        };

        setVehicleList((prev) => [newVehicle, ...prev]);
        setShowForm(false);
    };

    const selectCustomer = (name: string, phone: string) => {
        setForm({ ...form, customerName: name, phone: phone });
        setCustomerDropdownOpen(false);
        setCustomerSearch("");
    };

    return (
        <div className="space-y-5 animate-fade-in-up" style={{ opacity: 0 }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                        Vehicle Registry
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {vehicleList.length} vehicles tracked with IMEI
                    </p>
                </div>
                <Button size="sm" className="gap-2" onClick={handleOpenForm}>
                    <Car size={15} /> Register Vehicle
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                    { label: "Total Vehicles", value: vehicleList.length, color: "text-foreground" },
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
                                    {["Plate Number", "Owner", "IMEI", "Plan", "Trakzee", "Installation Date", "Expiry", ""].map((h) => (
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
                                        <TableCell colSpan={8} className="py-10 text-center text-muted-foreground text-sm">
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
                                                className="text-[0.65rem] font-semibold px-2 py-0.5 bg-odg-orange-bg text-odg-orange-dark border-orange-200"
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
                                        <TableCell className="text-sm text-muted-foreground">
                                            {v.installationDate ?? "—"}
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

            {/* ── Register Vehicle Dialog ────────────────────────────────────── */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Register New Vehicle</DialogTitle>
                        <DialogDescription>
                            Fill in the vehicle and owner details below.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2">
                        {/* Row 1 — Plate & Owner */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <Label htmlFor="reg-plate" className="text-xs">Plate Number</Label>
                                <Input
                                    id="reg-plate"
                                    placeholder="GP ABC 123"
                                    value={form.plateNumber}
                                    onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <Label htmlFor="reg-owner" className="text-xs">Owner Name</Label>
                                <Popover open={customerDropdownOpen} onOpenChange={setCustomerDropdownOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="reg-owner"
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={customerDropdownOpen}
                                            className="w-full justify-between font-normal"
                                        >
                                            {form.customerName ? form.customerName : "Select customer..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-h-[300px] overflow-hidden p-0" align="start">
                                        <div className="flex items-center border-b px-3">
                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                            <input
                                                placeholder="Search customers..."
                                                value={customerSearch}
                                                onChange={(e) => setCustomerSearch(e.target.value)}
                                                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                        </div>
                                        <div className="max-h-[200px] overflow-y-auto p-1">
                                            {filteredCustomers.length === 0 ? (
                                                <div className="py-6 text-center text-sm text-muted-foreground">
                                                    No customers found.
                                                </div>
                                            ) : (
                                                filteredCustomers.map((customer) => (
                                                    <div
                                                        key={customer.name}
                                                        className={cn(
                                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                                            form.customerName === customer.name ? "bg-accent/50" : ""
                                                        )}
                                                        onClick={() => selectCustomer(customer.name, customer.phone)}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                form.customerName === customer.name ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-foreground">{customer.name}</span>
                                                            <span className="text-xs text-muted-foreground">{customer.phone}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        {/* Allow creating a new customer if search doesn't match exactly */}
                                        {customerSearch && !uniqueCustomers.some(c => c.name.toLowerCase() === customerSearch.toLowerCase()) && (
                                            <div className="border-t p-1">
                                                <div
                                                    className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm text-primary font-medium hover:bg-accent hover:text-accent-foreground"
                                                    onClick={() => selectCustomer(customerSearch, form.phone)} // Keep phone if they already typed one, otherwise empty
                                                >
                                                    Add "{customerSearch}" as new...
                                                </div>
                                            </div>
                                        )}
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Row 2 — Phone & IMEI */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <Label htmlFor="reg-phone" className="text-xs">Phone</Label>
                                <Input
                                    id="reg-phone"
                                    placeholder="+27 61 234 5678"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <Label htmlFor="reg-imei" className="text-xs">IMEI</Label>
                                <Input
                                    id="reg-imei"
                                    placeholder="356938035643809"
                                    value={form.imei}
                                    onChange={(e) => setForm({ ...form, imei: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Row 3 — Plan & Trakzee Status */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <Label className="text-xs">Plan</Label>
                                <Select
                                    value={form.plan}
                                    onValueChange={(val) => setForm({ ...form, plan: val })}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Basic">Basic</SelectItem>
                                        <SelectItem value="Standard">Standard</SelectItem>
                                        <SelectItem value="Premium">Premium</SelectItem>
                                        <SelectItem value="Fleet">Fleet</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <Label className="text-xs">Trakzee Status</Label>
                                <Select
                                    value={form.trakzeeStatus}
                                    onValueChange={(val) =>
                                        setForm({ ...form, trakzeeStatus: val as "Active" | "Deactivated" })
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Deactivated">Deactivated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 4 — Installation Date & Expiry Date */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <Label htmlFor="reg-install-date" className="text-xs">Installation Date</Label>
                                <Input
                                    id="reg-install-date"
                                    type="date"
                                    value={form.installationDate}
                                    onChange={(e) => setForm({ ...form, installationDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5 flex flex-col justify-end">
                                <Label htmlFor="reg-expiry" className="text-xs">Expiry Date</Label>
                                <Input
                                    id="reg-expiry"
                                    type="date"
                                    value={form.expiryDate}
                                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowForm(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>Save Vehicle</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
