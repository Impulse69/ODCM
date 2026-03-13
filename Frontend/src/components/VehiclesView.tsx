"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Wifi,
  WifiOff,
  MoreHorizontal,
  Check,
  ChevronsUpDown,
  Loader2,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { getVehicles, addVehicle, updateTrakzee, updateVehicleExpiry, deleteVehicle, type Vehicle } from "@/lib/vehicles-api";
import { sendVehicleSms } from "@/lib/sms-api";
import { getIndividuals, getCompanies, type IndividualCustomer, type Company } from "@/lib/customers-api";
import { savePayment } from "@/lib/payment-history";
import { getPlans, type Plan } from "@/lib/plans-api";
import { cn } from "@/lib/utils";
import { computeStatus } from "@/lib/vehicle-status";

/** Convert any date string (ISO timestamp or YYYY-MM-DD) to plain YYYY-MM-DD */
function toDateStr(raw: string): string {
  return raw.slice(0, 10);
}

function addMonths(dateStr: string, months: number): string {
  const clean = toDateStr(dateStr);
  const [y, m, d] = clean.split("-").map(Number);
  const date = new Date(y, m - 1 + months, d);
  if (date.getDate() !== d) date.setDate(0);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type OwnerOption = {
  id: string;
  name: string;
  phone: string;
  type: "individual" | "company";
};

const emptyForm = {
  plateNumber: "",
  ownerId: "",
  ownerName: "",
  ownerType: "" as "" | "individual" | "company",
  phone: "",
  imei: "",
  plan: "",
  trakzeeStatus: "" as "" | "Active" | "Deactivated",
  installationDate: "",
  expiryDate: "",
};

export default function VehiclesView() {
  const [search, setSearch] = useState("");
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Subscription plans from DB
  const [dbPlans, setDbPlans] = useState<Plan[]>([]);

  // Owner dropdown
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  // ── Fetch vehicles ──────────────────────────────────────────────────────────
  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVehicles();
      setVehicleList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vehicles.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Silent background refresh — no loading spinner, just updates the list
  const silentRefetch = useCallback(async () => {
    try {
      const data = await getVehicles();
      setVehicleList(data);
    } catch {
      // silent — don't disrupt the UI
    }
  }, []);

  // ── Fetch owners for dropdown ───────────────────────────────────────────────
  const fetchOwners = useCallback(async () => {
    try {
      const [inds, cos] = await Promise.all([getIndividuals(), getCompanies()]);
      const options: OwnerOption[] = [
        ...inds.map((c: IndividualCustomer) => ({ id: c.id, name: c.name, phone: c.phone, type: "individual" as const })),
        ...cos.map((c: Company) => ({ id: c.id, name: c.company_name, phone: c.contact_phone ?? "", type: "company" as const })),
      ];
      setOwners(options);
    } catch {
      // non-critical — dropdown just stays empty
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchOwners();
    getPlans().then(p => setDbPlans(p.filter(pl => pl.is_active))).catch(() => {});
    // Auto-refresh every 60 s so vehicles moved to Removed by the scheduler disappear
    const timer = setInterval(silentRefetch, 60000);
    return () => clearInterval(timer);
  }, [fetchVehicles, fetchOwners, silentRefetch]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const vehicles = useMemo(
    () =>
      vehicleList.filter(
        (s) =>
          !search ||
          s.plate_number.toLowerCase().includes(search.toLowerCase()) ||
          s.imei.includes(search) ||
          s.customer_name.toLowerCase().includes(search.toLowerCase()),
      ),
    [search, vehicleList],
  );

  const filteredOwners = useMemo(
    () =>
      owners.filter(
        (o) =>
          o.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          o.phone.includes(customerSearch),
      ),
    [owners, customerSearch],
  );

  const syncedCount   = vehicleList.filter((s) => s.trakzee_status === "Active").length;
  const desyncedCount = vehicleList.filter((s) => s.trakzee_status === "Deactivated").length;
  const expiredCount  = vehicleList.filter((s) => computeStatus(s.expiry_date, s.status) === "Expired").length;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleOpenForm = () => {
    setForm(emptyForm);
    setCustomerSearch("");
    setSaveError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (
      !form.plateNumber || !form.ownerId || !form.imei ||
      !form.plan || !form.trakzeeStatus || !form.installationDate || !form.expiryDate
    ) {
      setSaveError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await addVehicle({
        plate_number: form.plateNumber,
        imei: form.imei,
        plan: form.plan,
        expiry_date: form.expiryDate,
        installation_date: form.installationDate,
        trakzee_status: form.trakzeeStatus as "Active" | "Deactivated",
        individual_customer_id: form.ownerType === "individual" ? form.ownerId : undefined,
        company_id: form.ownerType === "company" ? form.ownerId : undefined,
      });
      setShowForm(false);
      fetchVehicles();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save vehicle.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTrakzee = async (v: Vehicle) => {
    const next = v.trakzee_status === "Active" ? "Deactivated" : "Active";
    try {
      await updateTrakzee(v.id, next);
      fetchVehicles();
    } catch {
      // silent — could add toast later
    }
  };

  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setConfirmRemoveId(id);
  };

  // ── Send SMS ───────────────────────────────────────────────────────────────
  const [smsSending, setSmsSending] = useState<string | null>(null);

  const handleSendSms = async (v: Vehicle) => {
    setSmsSending(v.id);
    try {
      const result = await sendVehicleSms(v.id);
      setVehicleList((prev) =>
        prev.map((vehicle) =>
          vehicle.id === v.id
            ? { ...vehicle, sms_status: result.smsStatus, sms_sent_at: new Date().toISOString() }
            : vehicle,
        ),
      );
    } catch {
      setVehicleList((prev) =>
        prev.map((vehicle) =>
          vehicle.id === v.id ? { ...vehicle, sms_status: 'Failed' } : vehicle,
        ),
      );
    } finally {
      setSmsSending(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!confirmRemoveId) return;
    try {
      await deleteVehicle(confirmRemoveId);
      setVehicleList((prev) => prev.filter((v) => v.id !== confirmRemoveId));
    } catch {
      // silent
    } finally {
      setConfirmRemoveId(null);
    }
  };

  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());

  // ── Payment dialog ────────────────────────────────────────────────────────
  const [payTarget, setPayTarget] = useState<Vehicle | null>(null);
  const [payForm, setPayForm] = useState({ year: new Date().getFullYear().toString(), months: "1", amount: "" });
  const [payError, setPayError] = useState<string | null>(null);

  const handleOpenPay = (v: Vehicle) => {
    setPayTarget(v);
    const base = v.monthly_amount ?? 0;
    setPayForm({ year: new Date().getFullYear().toString(), months: "1", amount: String(base) });
    setPayError(null);
  };

  const handleConfirmPay = async () => {
    if (!payTarget) return;
    const year = parseInt(payForm.year);
    const months = parseInt(payForm.months);
    const amount = parseFloat(payForm.amount);
    if (!payForm.year || isNaN(year) || year < 2000 || year > 2100) {
      setPayError("Enter a valid year (e.g. 2026).");
      return;
    }
    if (isNaN(months) || months < 1 || months > 36) {
      setPayError("Number of months must be between 1 and 24.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setPayError("Enter a valid amount greater than 0.");
      return;
    }

    // Calculate new expiry date
    const todayStr = todayISO();
    const expiryStr = toDateStr(payTarget.expiry_date);
    const startStr = expiryStr < todayStr ? todayStr : expiryStr;
    const newExpiryISO = addMonths(startStr, months);

    savePayment({
      vehicleId: payTarget.id,
      vehiclePlate: payTarget.plate_number,
      ownerName: payTarget.customer_name,
      ownerType: payTarget.company_id ? "company" : "individual",
      year,
      months,
      amountGhs: amount,
    });
    setPaidIds((prev) => new Set([...prev, payTarget.id]));

    // Patch backend + update local state immediately
    try {
      await updateVehicleExpiry(payTarget.id, newExpiryISO);
    } catch {
      // best-effort — local state still updates
    }
    setVehicleList((prev) =>
      prev.map((v) =>
        v.id === payTarget.id
          ? { ...v, expiry_date: newExpiryISO, status: "Active" }
          : v
      )
    );
    setPayTarget(null);
  };

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const selectOwner = (owner: OwnerOption) => {
    setForm({ ...form, ownerId: owner.id, ownerName: owner.name, ownerType: owner.type, phone: owner.phone });
    setCustomerDropdownOpen(false);
    setCustomerSearch("");
  };

  const totalPages = Math.max(1, Math.ceil(vehicles.length / PAGE_SIZE));
  const pageVehicles = vehicles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // reset page on search change
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Vehicle Registry</h1>
      </div>

      {/* ── Search + Add ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="h-9" /> {/* spacer to match customer tab row height */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="pl-9 pr-4 h-9 text-sm rounded-lg border border-border bg-background w-48 focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
            />
          </div>
          <Button size="sm" className="gap-2 bg-odg-orange text-white hover:brightness-95 h-9" onClick={handleOpenForm}>
            <Plus size={15} /> Register Vehicle
          </Button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "TOTAL VEHICLES",   value: vehicleList.length, color: "text-foreground",  trend: "+5%",  up: true  },
          { label: "TRAKZEE ACTIVE",   value: syncedCount,        color: "text-foreground",  trend: "+2%",  up: true  },
          { label: "DESYNCED / OFF",   value: desyncedCount,      color: "text-foreground",  trend: "-1%",  up: false },
          { label: "EXPIRED",          value: expiredCount,       color: "text-red-500",     trend: null,   up: false },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl px-5 py-4 shadow-sm">
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <div className="flex items-end gap-2 mt-1.5">
              <span className={cn("text-3xl font-extrabold leading-none", s.color)}>{s.value.toLocaleString()}</span>
              {s.trend && (
                <span className={cn("flex items-center gap-0.5 text-xs font-semibold mb-0.5", s.up ? "text-emerald-600" : "text-orange-500")}>
                  {s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {s.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* ── Full-width search bar ── */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by plate, IMEI or owner..."
          className="w-full pl-10 pr-4 h-11 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
        />
      </div>

      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_1.5fr_1.5fr_0.8fr_0.8fr_0.9fr_0.9fr_0.8fr_40px] gap-3 px-6 py-3 border-b border-border bg-muted/30">
          {["PLATE", "OWNER", "IMEI", "PLAN", "TRAKZEE", "INSTALLED", "EXPIRY / STATUS", "SMS STATUS", ""].map((col) => (
            <span key={col} className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{col}</span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
            <Loader2 size={18} className="animate-spin" /> Loading vehicles…
          </div>
        ) : pageVehicles.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">No vehicles found.</p>
        ) : (
          <div className="divide-y divide-border">
            {pageVehicles.map((v) => (
              <div key={v.id} className="grid grid-cols-[1fr_1.5fr_1.5fr_0.8fr_0.8fr_0.9fr_0.9fr_0.8fr_40px] gap-3 items-center px-6 py-4 hover:bg-muted/30 transition-colors">
                {/* Plate */}
                <span className="font-bold text-sm text-foreground">{v.plate_number}</span>
                {/* Owner */}
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{v.customer_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.phone}</p>
                </div>
                {/* IMEI */}
                <span className="font-mono text-xs text-muted-foreground truncate">{v.imei}</span>
                {/* Plan */}
                <div>
                  <Badge variant="outline" className="text-[0.7rem] font-semibold px-2.5 py-0.5 bg-orange-50 text-odg-orange border-orange-200">
                    {v.plan}
                  </Badge>
                </div>
                {/* Trakzee */}
                <div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[0.7rem] font-semibold px-2.5 py-0.5 gap-1.5 flex items-center w-fit",
                      v.trakzee_status === "Active"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-red-50 text-red-600 border-red-200",
                    )}
                  >
                    {v.trakzee_status === "Active" ? <Wifi size={10} /> : <WifiOff size={10} />}
                    {v.trakzee_status}
                  </Badge>
                </div>
                {/* Installation date */}
                <span className="text-sm text-muted-foreground">
                  {v.installation_date ? new Date(v.installation_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </span>
                {/* Expiry + Status badge */}
                <div>
                  <span className="text-sm text-muted-foreground block">
                    {new Date(v.expiry_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                  {(() => {
                    const s = computeStatus(v.expiry_date, v.status);
                    const cfg: Record<string, string> = {
                      Active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
                      "Due Soon": "bg-amber-50 text-amber-700 border-amber-200",
                      Expired:   "bg-red-50 text-red-700 border-red-200",
                      Suspended: "bg-zinc-100 text-zinc-500 border-zinc-200",
                    };
                    return (
                      <Badge variant="outline" className={cn("mt-1 text-[0.65rem] font-semibold px-2 py-0", cfg[s] ?? cfg.Active)}>
                        {s}
                      </Badge>
                    );
                  })()}
                </div>
                {/* SMS Status */}
                <div className="space-y-0.5">
                  {v.sms_status === 'Sent' ? (
                    <Badge variant="outline" className="text-[0.7rem] font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 w-fit">
                      ✓ Sent
                    </Badge>
                  ) : v.sms_status === 'Failed' ? (
                    <Badge variant="outline" className="text-[0.7rem] font-semibold px-2.5 py-0.5 bg-red-50 text-red-700 border-red-200 w-fit">
                      ✕ Failed
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                  {v.sms_sent_at && (
                    <span className="text-[0.6rem] text-muted-foreground block">
                      {new Date(v.sms_sent_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </div>
                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground">
                      <MoreHorizontal size={15} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {v.status !== "Suspended" && (
                      <DropdownMenuItem
                        className="text-xs cursor-pointer text-emerald-600 focus:text-emerald-600"
                        onClick={() => handleOpenPay(v)}
                      >
                        <CreditCard size={12} className="mr-1.5" />
                        {paidIds.has(v.id) ? "Payment Recorded ✓" : "Record Payment"}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-xs cursor-pointer text-blue-600 focus:text-blue-600"
                      disabled={smsSending === v.id}
                      onClick={() => handleSendSms(v)}
                    >
                      <MessageSquare size={12} className="mr-1.5" />
                      {smsSending === v.id ? "Sending SMS…" : "Send SMS Now"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => handleToggleTrakzee(v)}>
                      {v.trakzee_status === "Active" ? "Deactivate Trakzee" : "Activate Trakzee"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive" onClick={() => handleDelete(v.id)}>
                      Remove Vehicle
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination footer ── */}
        {!loading && vehicles.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, vehicles.length)} to {Math.min(page * PAGE_SIZE, vehicles.length)} of {vehicles.length.toLocaleString()} vehicles
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(3, totalPages) }, (_, idx) => {
                const p = idx + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors",
                      page === p
                        ? "bg-odg-orange text-white shadow-sm"
                        : "border border-border text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              {totalPages > 3 && <span className="text-xs text-muted-foreground px-1">…</span>}
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

      {/* ── Register Vehicle Dialog ────────────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register New Vehicle</DialogTitle>
            <DialogDescription>Fill in the vehicle and owner details below.</DialogDescription>
          </DialogHeader>

          {saveError && (
            <p className="text-sm text-destructive font-medium -mt-1">{saveError}</p>
          )}

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
                <Label htmlFor="reg-owner" className="text-xs">Owner</Label>
                <Popover open={customerDropdownOpen} onOpenChange={setCustomerDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button id="reg-owner" variant="outline" role="combobox" aria-expanded={customerDropdownOpen} className="w-full justify-between font-normal">
                      {form.ownerName ? form.ownerName : "Select owner..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-(--radix-popover-trigger-width) max-h-75 overflow-hidden p-0" align="start">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        placeholder="Search customers..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="max-h-50 overflow-y-auto p-1">
                      {filteredOwners.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No customers found.</div>
                      ) : (
                        filteredOwners.map((owner) => (
                          <div
                            key={owner.id}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              form.ownerId === owner.id ? "bg-accent/50" : "",
                            )}
                            onClick={() => selectOwner(owner)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", form.ownerId === owner.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{owner.name}</span>
                              <span className="text-xs text-muted-foreground">{owner.type === "company" ? "Company" : owner.phone}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Row 2 — IMEI */}
            <div className="space-y-1.5">
              <Label htmlFor="reg-imei" className="text-xs">IMEI</Label>
              <Input
                id="reg-imei"
                placeholder="356938035643809"
                value={form.imei}
                onChange={(e) => setForm({ ...form, imei: e.target.value })}
              />
            </div>

            {/* Row 3 — Plan & Trakzee */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 flex flex-col justify-end">
                <Label className="text-xs">Plan</Label>
                <Select value={form.plan} onValueChange={(val) => setForm({ ...form, plan: val })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>
                    {dbPlans.map((p) => (
                      <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <Label className="text-xs">Trakzee Status</Label>
                <Select value={form.trakzeeStatus} onValueChange={(val) => setForm({ ...form, trakzeeStatus: val as "Active" | "Deactivated" })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Deactivated">Deactivated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4 — Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 flex flex-col justify-end">
                <Label htmlFor="reg-install-date" className="text-xs">Installation Date</Label>
                <Input id="reg-install-date" type="date" value={form.installationDate} onChange={(e) => setForm({ ...form, installationDate: e.target.value })} />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <Label htmlFor="reg-expiry" className="text-xs">Expiry Date</Label>
                <Input id="reg-expiry" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Saving…</> : "Save Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Record Payment Dialog ─────────────────────────────────────── */}
      <Dialog open={!!payTarget} onOpenChange={(open) => { if (!open) setPayTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Enter payment details for{" "}
              <span className="font-semibold text-foreground">{payTarget?.plate_number}</span>
              {payTarget && (
                <span className="text-muted-foreground"> — {payTarget.customer_name}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {payError && (
            <p className="text-sm text-destructive font-medium -mt-1">{payError}</p>
          )}

          <div className="grid gap-4 py-1">
            {/* Vehicle Number (read-only) */}
            <div className="space-y-1.5">
              <Label className="text-xs">Vehicle Number</Label>
              <Input value={payTarget?.plate_number ?? ""} readOnly className="bg-muted/50 cursor-default" />
            </div>

            {/* Year */}
            <div className="space-y-1.5">
              <Label htmlFor="pay-year" className="text-xs">Year</Label>
              <Input
                id="pay-year"
                type="number"
                min={2000}
                max={2100}
                placeholder="2026"
                value={payForm.year}
                onChange={(e) => setPayForm({ ...payForm, year: e.target.value })}
              />
            </div>

            {/* Number of months */}
            <div className="space-y-1.5">
              <Label htmlFor="pay-months" className="text-xs">Number of Months</Label>
              <Select
                value={payForm.months}
                onValueChange={(val) => {
                  const base = payTarget?.monthly_amount ?? 0;
                  setPayForm({ ...payForm, months: val, amount: String(base * parseInt(val)) });
                }}
              >
                <SelectTrigger id="pay-months" className="w-full">
                  <SelectValue placeholder="Select months" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 36 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* New Due Date (computed) */}
            {payTarget && (() => {
              const todayStr = todayISO();
              const expiryStr = toDateStr(payTarget.expiry_date);
              const isExpired = expiryStr < todayStr;
              const startStr = isExpired ? todayStr : expiryStr;
              const newExpiryStr = addMonths(startStr, parseInt(payForm.months));
              const [ny, nm, nd] = newExpiryStr.split("-").map(Number);
              const newDue = new Date(ny, nm - 1, nd).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
              return (
                <div className="space-y-1.5">
                  <Label className="text-xs">New Expiry Date</Label>
                  <div className={`flex items-center gap-2 h-9 px-3 rounded-lg border text-sm font-semibold ${isExpired ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                    <span>{newDue}</span>
                    <span className="text-[0.65rem] font-normal text-muted-foreground ml-auto">
                      {isExpired ? `starting from today + ${payForm.months} mo` : `from expiry + ${payForm.months} mo`}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Amount Due */}
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount" className="text-xs">
                Amount Due (GH₵)
                <span className="ml-1.5 text-muted-foreground font-normal">
                  = GH₵{payTarget?.monthly_amount ?? 0} × {payForm.months} month{parseInt(payForm.months) > 1 ? "s" : ""}
                </span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">GH₵</span>
                <Input
                  id="pay-amount"
                  type="number"
                  readOnly
                  value={payForm.amount}
                  className="pl-10 bg-muted/50 cursor-default font-semibold text-emerald-700"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button onClick={handleConfirmPay} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <CreditCard size={14} className="mr-1.5" /> Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Remove Dialog ── */}
      {(() => {
        const target = confirmRemoveId ? vehicleList.find((v) => v.id === confirmRemoveId) : null;
        return (
          <Dialog open={!!confirmRemoveId} onOpenChange={(open) => { if (!open) setConfirmRemoveId(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Remove Vehicle</DialogTitle>
                <DialogDescription>
                  This vehicle will be moved to the Removed list. You can restore it later.
                </DialogDescription>
              </DialogHeader>
              {target && (
                <div className="rounded-xl border border-border bg-muted/30 px-5 py-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plate</span>
                    <span className="font-semibold">{target.plate_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Owner</span>
                    <span className="font-semibold">{target.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span className="font-semibold">{target.plan}</span>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmRemoveId(null)}>Cancel</Button>
                <Button onClick={handleConfirmRemove} className="bg-destructive hover:bg-destructive/90 text-white">
                  Remove Vehicle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}

