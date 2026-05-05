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
  CreditCard,
  MessageSquare,
  Car,
  MapPin,
  Pencil,
  Eye,
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
import { getVehicles, addVehicle, updateVehicle, updateTrakzee, updateVehicleExpiry, deleteVehicle, type Vehicle } from "@/lib/vehicles-api";
import { sendVehicleSms } from "@/lib/sms-api";
import { getIndividuals, getCompanies, type IndividualCustomer, type Company } from "@/lib/customers-api";
import {
  getInventoryItems,
  getInventoryTypesByCategory,
  type InventoryItem,
  type InventoryType,
} from "@/lib/inventory-api";
import { savePayment } from "@/lib/payment-history";
import { getPlans, type Plan } from "@/lib/plans-api";
import { cn } from "@/lib/utils";
import { computeStatus, calculateOwed } from "@/lib/vehicle-status";

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
  trackerCategory: "Tracker",
  trackerType: "",
  inventoryId: null as number | null,
  imei: "",
  simInventoryId: null as number | null,
  simImei: "",
  simNumber: "",
  plan: "",
  trakzeeStatus: "Active" as "Active" | "Deactivated",
  installationDate: todayISO(),
  installationLocation: "",
  months: "1",
  expiryDate: addMonths(todayISO(), 1),
};

export default function VehiclesView() {
  const [search, setSearch] = useState("");
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Vehicle Details View
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null);

  // Subscription plans from DB
  const [dbPlans, setDbPlans] = useState<Plan[]>([]);

  // Owner dropdown
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [trackerDropdownOpen, setTrackerDropdownOpen] = useState(false);
  const [trackerSearch, setTrackerSearch] = useState("");
  const [simDropdownOpen, setSimDropdownOpen] = useState(false);
  const [simSearch, setSimSearch] = useState("");
  const [trackerTypes, setTrackerTypes] = useState<InventoryType[]>([]);
  const [trackerItems, setTrackerItems] = useState<InventoryItem[]>([]);
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([]);

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

  const fetchInventorySeed = useCallback(async () => {
    try {
      const items = await getInventoryItems();
      setAllInventoryItems(items);
    } catch {
      // non-critical until the register form is opened
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchOwners();
    fetchInventorySeed();
    getPlans().then(p => setDbPlans(p.filter(pl => pl.is_active))).catch(() => {});
    // Auto-refresh every 60 s so vehicles moved to Removed by the scheduler disappear
    const timer = setInterval(silentRefetch, 60000);
    return () => clearInterval(timer);
  }, [fetchVehicles, fetchOwners, fetchInventorySeed, silentRefetch]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const vehicles = useMemo(
    () =>
      vehicleList.filter((s) => {
        const matchesSearch =
          !search ||
          s.plate_number.toLowerCase().includes(search.toLowerCase()) ||
          s.imei.includes(search) ||
          s.customer_name.toLowerCase().includes(search.toLowerCase());

        const vStatus = computeStatus(s.expiry_date, s.status, s.grace_period_days);
        const isRemovedOrExpired = vStatus === "Removed" || vStatus === "Expired" || vStatus === "Suspended" || s.status === "Removed";

        return matchesSearch && !isRemovedOrExpired;
      }),
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

  const filteredTrackerItems = useMemo(
    () =>
      trackerItems.filter(
        (item) =>
          item.imei_number.toLowerCase().includes(trackerSearch.toLowerCase()) ||
          item.type.toLowerCase().includes(trackerSearch.toLowerCase()) ||
          item.category.toLowerCase().includes(trackerSearch.toLowerCase()),
      ),
    [trackerItems, trackerSearch],
  );

  const simInventoryItems = useMemo(
    () =>
      allInventoryItems.filter((item) => {
        const text = `${item.category} ${item.type}`.toLowerCase();
        return text.includes("sim");
      }),
    [allInventoryItems],
  );

  const filteredSimItems = useMemo(
    () =>
      simInventoryItems.filter(
        (item) =>
          item.imei_number.toLowerCase().includes(simSearch.toLowerCase()) ||
          item.type.toLowerCase().includes(simSearch.toLowerCase()) ||
          item.category.toLowerCase().includes(simSearch.toLowerCase()),
      ),
    [simInventoryItems, simSearch],
  );

  const syncedCount   = vehicleList.filter((s) => s.trakzee_status === "Active").length;
  const desyncedCount = vehicleList.filter((s) => s.trakzee_status === "Deactivated").length;
  const expiredCount  = vehicleList.filter((s) => {
    const status = computeStatus(s.expiry_date, s.status, s.grace_period_days);
    return (status === "Expired" || status === "Suspended" || status === "Overdue" || status === "Grace Period") && s.status !== "Removed";
  }).length;
  const removedCount = vehicleList.filter((s) => {
    const status = computeStatus(s.expiry_date, s.status, s.grace_period_days);
    return status === "Removed" || s.status === "Removed";
  }).length;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleOpenForm = () => {
    setForm({
      ...emptyForm,
      plan: dbPlans.length > 0 ? dbPlans[0].name : "",
    });
    setEditingVehicleId(null);
    setTrackerTypes([]);
    setTrackerItems([]);
    setCustomerSearch("");
    setTrackerSearch("");
    setSimSearch("");
    setSaveError(null);
    setShowForm(true);
  };

  const handleOpenEdit = (v: Vehicle) => {
    const ownerType = v.company_id ? "company" : "individual";
    const ownerId = v.company_id || v.individual_customer_id || "";
    
    setForm({
      ownerId,
      ownerType,
      ownerName: v.customer_name,
      phone: v.phone || "",
      plateNumber: v.plate_number,
      trackerCategory: "TRACKER", // Default guess
      trackerType: "", 
      inventoryId: null, // We don't change inventory items during basic edit
      imei: v.imei,
      simInventoryId: null,
      simImei: v.sim_imei || "",
      simNumber: v.sim_number || "",
      plan: v.plan,
      trakzeeStatus: v.trakzee_status,
      installationDate: v.installation_date ? toDateStr(v.installation_date) : todayISO(),
      installationLocation: v.installation_location || "",
      months: "0", // No new payment by default
      expiryDate: toDateStr(v.expiry_date),
    });
    setEditingVehicleId(v.id);
    setSaveError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (
      !form.plateNumber || !form.ownerId || 
      !form.plan || !form.trakzeeStatus || !form.installationDate || !form.expiryDate || !form.installationLocation
    ) {
      setSaveError("Please fill in all required fields.");
      return;
    }
    
    // Require an IMEI (can be selected from stock or entered manually)
    if (!form.imei) {
      setSaveError("Please provide tracker IMEI (select from stock or enter manually).");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      if (editingVehicleId) {
        // Update logic
        await updateVehicle(editingVehicleId, {
          plate_number: form.plateNumber,
          owner_name: form.ownerName,
          sim_imei: form.simImei,
          sim_number: form.simNumber,
          plan: form.plan,
          expiry_date: form.expiryDate,
          installation_date: form.installationDate,
          installation_location: form.installationLocation,
          trakzee_status: form.trakzeeStatus as "Active" | "Deactivated",
          individual_customer_id: form.ownerType === "individual" ? form.ownerId : undefined,
          company_id: form.ownerType === "company" ? form.ownerId : undefined,
        });
      } else {
        // Add logic
        const vehicle = await addVehicle({
          plate_number: form.plateNumber,
          imei: form.imei,
          inventory_id: form.inventoryId ?? undefined,
          sim_inventory_id: form.simInventoryId ?? undefined,
          sim_imei: form.simImei ?? undefined,
          sim_number: form.simNumber ?? undefined,
          owner_name: form.ownerName,
          plan: form.plan,
          expiry_date: form.expiryDate,
          installation_date: form.installationDate,
          installation_location: form.installationLocation,
          trakzee_status: form.trakzeeStatus as "Active" | "Deactivated",
          individual_customer_id: form.ownerType === "individual" ? form.ownerId : undefined,
          company_id: form.ownerType === "company" ? form.ownerId : undefined,
        });

        // Save initial payment record if months > 0
        const monthsCount = parseInt(form.months);
        if (monthsCount > 0) {
          const selectedPlan = dbPlans.find(p => p.name === form.plan);
          const amount = selectedPlan ? (selectedPlan.price * monthsCount) : 0;
          if (amount > 0 && vehicle) {
            await savePayment({
              vehicleId: vehicle.id,
              vehiclePlate: form.plateNumber,
              ownerName: form.ownerName,
              ownerType: form.ownerType as "individual" | "company",
              planName: form.plan,
              year: new Date(form.installationDate).getFullYear(),
              months: monthsCount,
              amountGhs: amount,
              paidAt: new Date(form.installationDate).toISOString(),
            }).catch(() => {});
          }
        }
      }

      setShowForm(false);
      if (!editingVehicleId) fetchInventorySeed();
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
  const [payForm, setPayForm] = useState({ paymentDate: todayISO(), months: "1", amount: "" });
  const [payError, setPayError] = useState<string | null>(null);

  const handleOpenPay = (v: Vehicle) => {
    setPayTarget(v);
    const base = v.monthly_amount ?? 0;
    const arrears = calculateOwed(v.expiry_date, base, v.trakzee_status);
    // Initial amount = arrears + 1 month base
    setPayForm({ paymentDate: todayISO(), months: "1", amount: String(base + arrears) });
    setPayError(null);
  };

  const handleConfirmPay = async () => {
    if (!payTarget) return;
    const year = new Date(payForm.paymentDate).getFullYear();
    const months = parseInt(payForm.months);
    
    // Recalculate based on current pricing/arrears logic
    const base = payTarget.monthly_amount ?? 0;
    const arrears = calculateOwed(payTarget.expiry_date, base, payTarget.trakzee_status);
    const amount = (arrears + base * months);

    if (!payForm.paymentDate) {
      setPayError("Select a payment date.");
      return;
    }
    if (isNaN(months) || months < 1 || months > 36) {
      setPayError("Number of months must be between 1 and 36.");
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
      planName: payTarget.plan,
      year,
      months,
      amountGhs: amount,
      paidAt: new Date(payForm.paymentDate).toISOString(),
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

  const selectTrackerItem = (item: InventoryItem) => {
    setForm((prev) => ({
      ...prev,
      imei: item.imei_number,
      inventoryId: item.id,
    }));
    setTrackerDropdownOpen(false);
    setTrackerSearch("");
  };

  const selectSimItem = (item: InventoryItem) => {
    setForm((prev) => ({
      ...prev,
      simImei: item.imei_number,
      simInventoryId: item.id,
    }));
    setSimDropdownOpen(false);
    setSimSearch("");
  };

  const totalPages = Math.max(1, Math.ceil(vehicles.length / PAGE_SIZE));
  const pageVehicles = vehicles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // reset page on search change
  useEffect(() => { setPage(1); }, [search]);

  useEffect(() => {
    const loadTrackerTypes = async () => {
      try {
        // Try multiple variations to be safe against DB case sensitivity
        const [upper, mixed] = await Promise.all([
          getInventoryTypesByCategory("TRACKER"),
          getInventoryTypesByCategory("Tracker")
        ]);
        
        // Combine and de-duplicate by name
        const combined = [...upper, ...mixed];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
        
        setTrackerTypes(unique);
      } catch (err) {
        console.error("Failed to fetch tracker types:", err);
        setTrackerTypes([]);
      }
    };

    if (showForm) {
      loadTrackerTypes();
    }
  }, [showForm]);

  useEffect(() => {
    const loadTrackerItems = async () => {
      if (!form.trackerType) {
        setTrackerItems([]);
        return;
      }
      try {
        // Fetch items for both case variations to ensure we get results
        const [upper, mixed] = await Promise.all([
          getInventoryItems({ category: "TRACKER", type: form.trackerType }),
          getInventoryItems({ category: "Tracker", type: form.trackerType })
        ]);
        
        // Combine and de-duplicate by ID
        const combined = [...upper, ...mixed];
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        
        setTrackerItems(unique);
      } catch (err) {
        console.error("Failed to fetch tracker items:", err);
        setTrackerItems([]);
      }
    };

    if (showForm && form.trackerType) {
      loadTrackerItems();
    }
  }, [form.trackerType, showForm]);

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Vehicle Registry</h1>
      </div>

      {/* ── Search + Add ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="hidden sm:block h-9" />
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
          <Button size="sm" className="gap-2 bg-odg-orange text-white hover:brightness-95 h-9 shrink-0" onClick={handleOpenForm}>
            <Plus size={15} /> <span className="hidden sm:inline">Register</span> Vehicle
          </Button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "TOTAL VEHICLES",   value: vehicleList.length, color: "text-foreground" },
          { label: "TRAKZEE ACTIVE",   value: syncedCount,        color: "text-emerald-600" },
          { label: "DESYNCED / OFF",   value: desyncedCount,      color: "text-amber-600" },
          { label: "EXPIRED / DUE",    value: expiredCount,       color: "text-red-500" },
          { label: "REMOVED",          value: removedCount,       color: "text-gray-500" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl px-5 py-4 shadow-sm">
            <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={cn("text-2xl font-black tabular-nums", s.color)}>{s.value.toLocaleString()}</span>
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



      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Column headers */}
        <div className="hidden sm:grid grid-cols-[1fr_1.5fr_1fr_0.7fr_0.7fr_0.7fr_0.8fr_0.8fr_0.7fr_40px] gap-3 px-6 py-3 border-b border-border bg-muted/30">
          {["PLATE", "OWNER", "IMEI", "PLAN", "TRAKZEE", "OWED", "INSTALLED", "EXPIRY / STATUS", "SMS STATUS", ""].map((col) => (
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
            {pageVehicles.map((v) => {
              const vStatus = computeStatus(v.expiry_date, v.status, v.grace_period_days);
              const statusCfg: Record<string, string> = {
                Active:         "bg-emerald-50 text-emerald-700 border-emerald-200",
                "Due Soon":     "bg-amber-50 text-amber-700 border-amber-200",
                Expired:        "bg-red-50 text-red-700 border-red-200",
                Overdue:        "bg-red-50 text-red-700 border-red-200",
                Suspended:      "bg-zinc-100 text-zinc-500 border-zinc-200",
                "Grace Period": "bg-purple-50 text-purple-700 border-purple-200",
                Removed:        "bg-gray-100 text-gray-500 border-gray-200",
              };
              const actionsMenu = (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal size={15} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {v.status !== "Suspended" && (
                      <DropdownMenuItem className="text-xs cursor-pointer text-emerald-600 focus:text-emerald-600" onClick={() => handleOpenPay(v)}>
                        <CreditCard size={12} className="mr-1.5" />
                        {paidIds.has(v.id) ? "Payment Recorded ✓" : "Record Payment"}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-xs cursor-pointer text-blue-600 focus:text-blue-600" disabled={smsSending === v.id} onClick={() => handleSendSms(v)}>
                      <MessageSquare size={12} className="mr-1.5" />
                      {smsSending === v.id ? "Sending SMS…" : "Send SMS Now"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => handleToggleTrakzee(v)}>
                      {v.trakzee_status === "Active" ? "Deactivate Trakzee" : "Activate Trakzee"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setViewVehicle(v)}>
                      <Eye size={12} className="mr-1.5" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => handleOpenEdit(v)}>
                      <Pencil size={12} className="mr-1.5" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive" onClick={() => handleDelete(v.id)}>
                      Remove Vehicle
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
              return (
              <div key={v.id} className="hover:bg-muted/30 transition-colors">
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[1fr_1.5fr_1fr_0.7fr_0.7fr_0.7fr_0.8fr_0.8fr_0.7fr_40px] gap-3 items-center px-6 py-4">
                  <span className="font-bold text-sm text-foreground">{v.plate_number}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{v.customer_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{v.phone}</p>
                  </div>
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-muted-foreground truncate block">{v.imei}</span>
                    {(v.sim_imei || v.sim_number) && (
                      <span className="text-[0.65rem] text-muted-foreground truncate block">
                        SIM: {v.sim_imei || "-"} {v.sim_number ? `| No: ${v.sim_number}` : ""}
                      </span>
                    )}
                  </div>
                  <div>
                    <Badge variant="outline" className="text-[0.7rem] font-semibold px-2.5 py-0.5 bg-orange-50 text-odg-orange border-orange-200">
                      {v.plan}
                    </Badge>
                  </div>
                  <div>
                    <Badge variant="outline" className={cn("text-[0.7rem] font-semibold px-2.5 py-0.5 gap-1.5 flex items-center w-fit", v.trakzee_status === "Active" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-red-50 text-red-600 border-red-200")}>
                      {v.trakzee_status === "Active" ? <Wifi size={10} /> : <WifiOff size={10} />}
                      {v.trakzee_status}
                    </Badge>
                  </div>

                  {/* Owed column */}
                  <div className="text-xs font-bold text-red-600 tabular-nums">
                    {(() => {
                        const owed = calculateOwed(v.expiry_date, v.monthly_amount, v.trakzee_status);
                        return owed > 0 ? `GH₵${owed.toFixed(2)}` : "—";
                    })()}
                  </div>

                  <span className="text-sm text-muted-foreground">
                    {v.installation_date ? new Date(v.installation_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </span>
                  <div>
                    <span className={cn("text-sm block", vStatus === "Grace Period" ? "text-purple-600 font-bold" : "text-muted-foreground")}>
                      {(() => {
                          const date = new Date(v.expiry_date);
                          if (vStatus === "Grace Period" && v.grace_period_days) {
                              date.setDate(date.getDate() + v.grace_period_days);
                          }
                          return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                      })()}
                    </span>
                    <Badge variant="outline" className={cn("mt-1 text-[0.65rem] font-semibold px-2 py-0", statusCfg[vStatus] ?? statusCfg.Active)}>
                      {vStatus}
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    {v.sms_status === 'Sent' ? (
                      <Badge variant="outline" className="text-[0.7rem] font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 w-fit">✓ Sent</Badge>
                    ) : v.sms_status === 'Failed' ? (
                      <Badge variant="outline" className="text-[0.7rem] font-semibold px-2.5 py-0.5 bg-red-50 text-red-700 border-red-200 w-fit">✕ Failed</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[0.7rem] font-semibold px-2.5 py-0.5 bg-zinc-50 text-zinc-500 border-zinc-200 w-fit">Pending</Badge>
                    )}
                    {v.sms_sent_at && (
                      <span className="text-[0.6rem] text-muted-foreground block">
                        {new Date(v.sms_sent_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>
                  {actionsMenu}
                </div>
                {/* Mobile card */}
                <div className="sm:hidden px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground">{v.plate_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.customer_name} · {v.phone}</p>
                    </div>
                    {actionsMenu}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[0.65rem] font-semibold px-2 py-0 bg-orange-50 text-odg-orange border-orange-200">{v.plan}</Badge>
                    <Badge variant="outline" className={cn("text-[0.65rem] font-semibold px-2 py-0", statusCfg[vStatus] ?? statusCfg.Active)}>{vStatus}</Badge>
                    <Badge variant="outline" className={cn("text-[0.65rem] font-semibold px-2 py-0 gap-1 flex items-center", v.trakzee_status === "Active" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-red-50 text-red-600 border-red-200")}>
                      {v.trakzee_status === "Active" ? <Wifi size={8} /> : <WifiOff size={8} />}
                      {v.trakzee_status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Exp: {new Date(v.expiry_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    <span className="font-mono truncate max-w-35">{v.imei}</span>
                  </div>
                  {(v.sim_imei || v.sim_number) && (
                    <p className="text-[0.7rem] text-muted-foreground truncate">
                      SIM: {v.sim_imei || "-"} {v.sim_number ? `| No: ${v.sim_number}` : ""}
                    </p>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination footer ── */}
        {!loading && vehicles.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6 py-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, vehicles.length)}-{Math.min(page * PAGE_SIZE, vehicles.length)} of {vehicles.length.toLocaleString()}
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
        <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVehicleId ? "Edit Vehicle Details" : "Register New Vehicle"}</DialogTitle>
            <DialogDescription>
              {editingVehicleId ? "Update the owner or vehicle registration info." : "Pick the owner, stock items, and setup details."}
            </DialogDescription>
          </DialogHeader>

          {saveError && (
            <p className="text-sm text-destructive font-medium -mt-1">{saveError}</p>
          )}

          <div className="grid gap-3 py-1">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 flex flex-col justify-end">
                <Label className="text-xs text-muted-foreground uppercase tracking-tight">Category</Label>
                <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/30 text-xs font-semibold">
                  Tracker
                </div>
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <Label className="text-xs text-muted-foreground uppercase tracking-tight">Tracker Type</Label>
                <Select
                  value={form.trackerType}
                  disabled={!!editingVehicleId}
                  onValueChange={(val) => {
                    setTrackerSearch("");
                    setTrackerDropdownOpen(false);
                    setForm((prev) => ({ ...prev, trackerType: val, inventoryId: null, imei: "" }));
                  }}
                >
                  <SelectTrigger className="w-full h-9"><SelectValue placeholder={editingVehicleId ? "N/A" : "Select type"} /></SelectTrigger>
                  <SelectContent className="max-h-75">
                    {trackerTypes.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground text-center">No tracker types found</div>
                    ) : (
                      trackerTypes.map((type) => (
                        <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 flex flex-col justify-end">
                <Label htmlFor="reg-imei" className="text-xs text-muted-foreground uppercase tracking-tight">Tracker IMEI</Label>
                <Popover open={trackerDropdownOpen} onOpenChange={setTrackerDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="reg-imei"
                      variant="outline"
                      role="combobox"
                      aria-expanded={trackerDropdownOpen}
                      disabled={!!editingVehicleId || !form.trackerType}
                      className="w-full justify-between font-normal h-9"
                    >
                      {form.imei || (editingVehicleId ? form.imei : (form.trackerType ? "Select tracker IMEI..." : "Choose tracker type first"))}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-(--radix-popover-trigger-width) max-h-75 overflow-hidden p-0" align="start">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        placeholder="Search tracker IMEI..."
                        value={trackerSearch}
                        onChange={(e) => setTrackerSearch(e.target.value)}
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="max-h-50 overflow-y-auto p-1">
                      {filteredTrackerItems.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No tracker IMEI found.</div>
                      ) : (
                        filteredTrackerItems.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              form.inventoryId === item.id ? "bg-accent/50" : "",
                            )}
                            onClick={() => selectTrackerItem(item)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", form.inventoryId === item.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{item.imei_number}</span>
                              <span className="text-xs text-muted-foreground">{item.type}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="mt-2">
                  <Label htmlFor="reg-imei-manual" className="text-xs text-muted-foreground">Or enter IMEI manually</Label>
                  <Input
                    id="reg-imei-manual"
                    placeholder="Enter tracker IMEI"
                    value={form.imei}
                    onChange={(e) => setForm((prev) => ({ ...prev, imei: e.target.value }))}
                    disabled={!!form.inventoryId}
                  />
                  {form.inventoryId && (
                    <p className="text-[0.7rem] text-muted-foreground mt-1">Inventory selected — manual edit disabled.</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <Label htmlFor="reg-sim-imei" className="text-xs text-muted-foreground uppercase tracking-tight">SIM IMEI</Label>
                <Popover open={simDropdownOpen} onOpenChange={setSimDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="reg-sim-imei"
                      variant="outline"
                      role="combobox"
                      aria-expanded={simDropdownOpen}
                      disabled={!!editingVehicleId}
                      className="w-full justify-between font-normal h-9"
                    >
                      {form.simImei || "Select SIM IMEI..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-(--radix-popover-trigger-width) max-h-75 overflow-hidden p-0" align="start">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <input
                        placeholder="Search SIM IMEI..."
                        value={simSearch}
                        onChange={(e) => setSimSearch(e.target.value)}
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="max-h-50 overflow-y-auto p-1">
                      {filteredSimItems.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">No SIM IMEI found.</div>
                      ) : (
                        filteredSimItems.map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                              form.simInventoryId === item.id ? "bg-accent/50" : "",
                            )}
                            onClick={() => selectSimItem(item)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", form.simInventoryId === item.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{item.imei_number}</span>
                              <span className="text-xs text-muted-foreground">{item.type}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="mt-2">
                  <Label htmlFor="reg-sim-imei-manual" className="text-xs text-muted-foreground">Or enter SIM IMEI manually</Label>
                  <Input
                    id="reg-sim-imei-manual"
                    placeholder="Enter SIM IMEI"
                    value={form.simImei}
                    onChange={(e) => setForm((prev) => ({ ...prev, simImei: e.target.value }))}
                    disabled={!!form.simInventoryId}
                  />
                  {form.simInventoryId && (
                    <p className="text-[0.7rem] text-muted-foreground mt-1">SIM inventory selected — manual edit disabled.</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <Label htmlFor="reg-sim-number" className="text-xs text-muted-foreground uppercase tracking-tight">SIM Number</Label>
                <Input
                  id="reg-sim-number"
                  placeholder="e.g. 0244123456"
                  value={form.simNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, simNumber: e.target.value }))}
                />
              </div>
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
                <Input id="reg-install-date" type="date" value={form.installationDate} onChange={(e) => {
                  const newDate = e.target.value;
                  const newExpiry = addMonths(newDate || todayISO(), parseInt(form.months));
                  setForm({ ...form, installationDate: newDate, expiryDate: newExpiry });
                }} />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <Label className="text-xs">{editingVehicleId ? "Override Expiry" : "Months of Usage"}</Label>
                {editingVehicleId ? (
                   <Input id="reg-expiry-edit" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                ) : (
                  <Select value={form.months} onValueChange={(val) => {
                    const newExpiry = addMonths(form.installationDate || todayISO(), parseInt(val));
                    setForm({ ...form, months: val, expiryDate: newExpiry });
                  }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Months" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 36 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? "s" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-install-location" className="text-xs">Installation Location</Label>
              <Input
                id="reg-install-location"
                placeholder="Enter installation location"
                value={form.installationLocation}
                onChange={(e) => setForm({ ...form, installationLocation: e.target.value })}
              />
            </div>
            
            {!editingVehicleId && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 flex flex-col justify-end">
                  <Label htmlFor="reg-expiry-calc" className="text-xs">Calculated Expiry</Label>
                  <Input 
                    id="reg-expiry-calc" 
                    type="date" 
                    readOnly
                    value={form.expiryDate || addMonths(form.installationDate || todayISO(), parseInt(form.months))} 
                    className="bg-muted focus:ring-0 cursor-default"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <Label className="text-xs font-semibold text-odg-orange">Total Initial Charge</Label>
                  <div className="h-9 flex items-center px-3 rounded-md border border-odg-orange/30 bg-orange-50/50 text-orange-700 font-bold text-sm">
                    {(() => {
                      const sp = dbPlans.find(p => p.name === form.plan);
                      if (!sp) return "GH₵ 0.00";
                      return `GH₵ ${(sp.price * parseInt(form.months)).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-odg-orange text-white hover:brightness-95 min-w-32">
              {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Saving…</> : (editingVehicleId ? "Save Changes" : "Register Vehicle")}
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

            {/* Payment Date */}
            <div className="space-y-1.5">
              <Label htmlFor="pay-date" className="text-xs">Payment Date</Label>
              <Input
                id="pay-date"
                type="date"
                value={payForm.paymentDate}
                onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
              />
            </div>

            {/* Number of months */}
            <div className="space-y-1.5">
              <Label htmlFor="pay-months" className="text-xs">Number of Months</Label>
              <Select
                value={payForm.months}
                onValueChange={(val) => {
                  const base = payTarget?.monthly_amount ?? 0;
                  const arrears = calculateOwed(payTarget?.expiry_date, base, payTarget?.trakzee_status);
                  setPayForm({ ...payForm, months: val, amount: String(base * parseInt(val) + arrears) });
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
              const monthsToPay = parseInt(payForm.months);
              
              // Calculate new expiry: If expired, it starts from today. If not, it adds to existing expiry.
              const newExpiryStr = addMonths(startStr, monthsToPay);
              const [ny, nm, nd] = newExpiryStr.split("-").map(Number);
              const newDue = new Date(ny, nm - 1, nd).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
              
              return (
                <div className="space-y-1.5">
                  <Label className="text-xs">New Expiry Date</Label>
                  <div className={`flex items-center gap-2 h-9 px-3 rounded-lg border text-sm font-semibold ${isExpired ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                    <span>{newDue}</span>
                    <span className="text-[0.65rem] font-normal text-muted-foreground ml-auto">
                      {isExpired ? `Active coverage: ${monthsToPay} mo from today` : `Extended: +${monthsToPay} mo`}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Amount Due */}
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount" className="text-xs">
                Total Charge (GH₵)
              </Label>
              {payTarget && (() => {
                const base = payTarget.monthly_amount ?? 0;
                const arrears = calculateOwed(payTarget.expiry_date, base, payTarget.trakzee_status);
                const monthsToPay = parseInt(payForm.months);
                const currentSub = base * monthsToPay;
                const total = (arrears + currentSub);
                
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px] bg-muted/30 p-2 rounded-md mb-2 border border-border/50">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground uppercase text-[9px] font-bold">Breakdown</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-red-600 font-bold">GH₵{arrears.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          <span className="text-muted-foreground font-medium">+</span>
                          <span className="text-foreground font-bold">GH₵{currentSub.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground uppercase text-[9px] font-bold">Total to Pay</span>
                        <p className="text-emerald-700 font-black text-xs">GH₵{total.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                      </div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">GH₵</span>
                      <Input
                        id="pay-amount"
                        type="number"
                        readOnly
                        value={total.toFixed(2)}
                        className="pl-10 bg-muted/50 cursor-default font-bold text-emerald-700 text-lg"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground px-1 italic">
                      * Arrears are calculated based on months active in Trakzee past expiry.
                    </p>
                  </div>
                );
              })()}
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
                <DialogTitle>Delete Vehicle</DialogTitle>
                <DialogDescription>
                  This action is permanent and cannot be undone. All subscription data for this vehicle will be deleted.
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
                <Button 
                  onClick={handleConfirmRemove} 
                  className="bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  Confirm Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ── Vehicle Details Dialog ────────────────────────────────────── */}
      <Dialog open={!!viewVehicle} onOpenChange={(open) => { if (!open) setViewVehicle(null); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-odg-orange" />
              Vehicle Details
            </DialogTitle>
            <DialogDescription>
              Detailed information for <span className="font-bold text-foreground">{viewVehicle?.plate_number}</span>
            </DialogDescription>
          </DialogHeader>

          {viewVehicle && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-4 text-sm">
              <div className="space-y-1">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Owner / Contact</p>
                <p className="font-semibold">{viewVehicle.customer_name}</p>
                <p className="text-muted-foreground">{viewVehicle.phone}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                <Badge variant="outline" className={cn(
                  "font-bold px-2 py-0.5",
                  viewVehicle.trakzee_status === "Active" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-red-50 text-red-600 border-red-200"
                )}>
                  Trakzee {viewVehicle.trakzee_status}
                </Badge>
              </div>

              <div className="col-span-2 border-t border-border pt-4">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground mb-3">Hardware Information</p>
                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Tracker IMEI</p>
                    <p className="font-mono font-bold text-xs">{viewVehicle.imei}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">SIM IMEI / Number</p>
                    <p className="font-mono font-bold text-xs">{viewVehicle.sim_imei || "—"}</p>
                  </div>
                </div>
              </div>

              <div className="col-span-2 border-t border-border pt-4">
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground mb-3">Subscription & Installation</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Service Plan</p>
                    <Badge variant="outline" className="bg-orange-50 text-odg-orange border-orange-200 font-bold">{viewVehicle.plan}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Expiry Date</p>
                    <p className="font-semibold">{new Date(viewVehicle.expiry_date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Installation Date</p>
                    <p className="font-semibold">
                      {viewVehicle.installation_date ? new Date(viewVehicle.installation_date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase">Installation Location</p>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <MapPin size={12} className="text-muted-foreground" />
                      {viewVehicle.installation_location || "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewVehicle(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

