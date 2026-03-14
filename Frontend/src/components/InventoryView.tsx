"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  MoreHorizontal,
  Check,
  ChevronsUpDown,
  Loader2,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Package,
  Camera,
  MapPin,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getInventoryCategories,
  addInventoryCategory,
  getInventoryItems,
  addInventoryItem,
  editInventoryItem,
  removeInventoryItem,
  recordInventoryUsage,
  getInventoryUsageHistory,
  type InventoryItem,
  type InventoryCategory,
  type InventoryUsage,
} from "@/lib/inventory-api";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const emptyItemForm = {
  id: null as number | null,
  category: "",
  imei_number: "",
  type: "",
  quantity: "1",
};

const emptyUseForm = {
  inventory_id: null as number | null,
  category: "",
  imei_number: "",
  type: "",
  installed_by: "",
  quantity_used: "1",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function InventoryView() {
  const [activeTab, setActiveTab] = useState<"stock" | "usage">("stock");

  // Data
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [usageHistory, setUsageHistory] = useState<InventoryUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Searches & Pagination
  const [stockSearch, setStockSearch] = useState("");
  const [usageSearch, setUsageSearch] = useState("");
  const [stockPage, setStockPage] = useState(1);
  const [usagePage, setUsagePage] = useState(1);
  const PAGE_SIZE = 10;

  // Modals
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState(emptyItemForm);
  const [savingItem, setSavingItem] = useState(false);

  const [showUseForm, setShowUseForm] = useState(false);
  const [useForm, setUseForm] = useState(emptyUseForm);
  const [savingUsage, setSavingUsage] = useState(false);

  // Category dropdown state
  const [catOpen, setCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  // IMEI Dropdown state
  const [imeiOpen, setImeiOpen] = useState(false);
  const [imeiSearch, setImeiSearch] = useState("");

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  // ─── Fetching ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, inv, usage] = await Promise.all([
        getInventoryCategories(),
        getInventoryItems(),
        getInventoryUsageHistory(),
      ]);
      setCategories(cats);
      setItems(inv);
      setUsageHistory(usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Filters & Derived ───────────────────────────────────────────────────────

  const filteredStock = useMemo(() => {
    const q = stockSearch.toLowerCase();
    return items.filter(
      (i) =>
        !q ||
        i.imei_number.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [items, stockSearch]);

  const filteredUsage = useMemo(() => {
    const q = usageSearch.toLowerCase();
    return usageHistory.filter(
      (u) =>
        !q ||
        u.imei_number.toLowerCase().includes(q) ||
        u.type.toLowerCase().includes(q) ||
        u.installed_by.toLowerCase().includes(q) ||
        u.category.toLowerCase().includes(q)
    );
  }, [usageHistory, usageSearch]);

  const trackersCount = items.filter(i => i.category.toLowerCase() === "tracker").reduce((sum, i) => sum + i.quantity, 0);
  const camerasCount = items.filter(i => i.category.toLowerCase() === "camera").reduce((sum, i) => sum + i.quantity, 0);

  // ─── Save Item ───────────────────────────────────────────────────────────────

  const handleSaveItem = async () => {
    if (!itemForm.category || !itemForm.imei_number || !itemForm.type || !itemForm.quantity) {
      setError("Please fill all item fields");
      return;
    }
    const qty = parseInt(itemForm.quantity);
    if (isNaN(qty) || qty < 0) {
      setError("Quantity must be a valid number >= 0");
      return;
    }

    setSavingItem(true);
    setError(null);
    try {
      if (itemForm.id) {
        await editInventoryItem(itemForm.id, {
          category: itemForm.category,
          imei_number: itemForm.imei_number,
          type: itemForm.type,
          quantity: qty,
        });
      } else {
        await addInventoryItem({
          category: itemForm.category,
          imei_number: itemForm.imei_number,
          type: itemForm.type,
          quantity: qty,
        });
      }
      setShowItemForm(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSavingItem(false);
    }
  };

  // ─── Add Category inline ──────────────────────────────────────────────────────

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const cat = await addInventoryCategory(newCatName.trim());
      setCategories((prev) => [...prev, cat]);
      setItemForm({ ...itemForm, category: cat.name });
      setNewCatName("");
      setCatOpen(false);
    } catch (err) {
      // ignore dupes or show small error
    } finally {
      setCreatingCat(false);
    }
  };

  // ─── Delete Item ─────────────────────────────────────────────────────────────

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeInventoryItem(deleteTarget);
      setItems((prev) => prev.filter(i => i.id !== deleteTarget));
    } catch {
       // silent
    } finally {
      setDeleteTarget(null);
    }
  };

  // ─── Record Usage ────────────────────────────────────────────────────────────

  const handleOpenUseForm = (item?: InventoryItem) => {
    if (item) {
      // Pre-fill from table row
      setUseForm({
        inventory_id: item.id,
        category: item.category,
        imei_number: item.imei_number,
        type: item.type,
        installed_by: "",
        quantity_used: "1",
      });
    } else {
      // Empty form
      setUseForm(emptyUseForm);
    }
    setError(null);
    setShowUseForm(true);
  };

  const handleRecordUsage = async () => {
    if (!useForm.inventory_id || !useForm.installed_by || !useForm.quantity_used) {
      setError("Please fill all required usage fields");
      return;
    }
    const qty = parseInt(useForm.quantity_used);
    if (isNaN(qty) || qty <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    setSavingUsage(true);
    setError(null);
    try {
      await recordInventoryUsage({
        inventory_id: useForm.inventory_id,
        installed_by: useForm.installed_by,
        quantity_used: qty,
      });
      setShowUseForm(false);
      fetchData(); // Refresh both stock and history
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record usage");
    } finally {
      setSavingUsage(false);
    }
  };

  // ─── Render Stock Table ──────────────────────────────────────────────────────
  const renderStockTable = () => {
    const totalPages = Math.max(1, Math.ceil(filteredStock.length / PAGE_SIZE));
    const pageData = filteredStock.slice((stockPage - 1) * PAGE_SIZE, stockPage * PAGE_SIZE);

    return (
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_1.5fr_1.5fr_0.8fr_1fr_40px] gap-3 px-6 py-3 border-b border-border bg-muted/30">
          {["CATEGORY", "IMEI NUMBER", "TYPE", "STOCK", "DATE ADDED", ""].map((col) => (
            <span key={col} className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{col}</span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 size={18} className="animate-spin mr-2" /> Loading inventory…</div>
        ) : pageData.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No items in stock.</div>
        ) : (
          <div className="divide-y divide-border">
            {pageData.map(item => {
              const itemActions = (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground"><MoreHorizontal size={15} /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-xs cursor-pointer text-blue-600 focus:text-blue-600" onClick={() => handleOpenUseForm(item)} disabled={item.quantity <= 0}>Use Item</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => { setItemForm({ ...item, quantity: String(item.quantity) }); setShowItemForm(true); }}>Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteTarget(item.id)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
              return (
              <div key={item.id} className="hover:bg-muted/30 transition-colors">
                {/* Desktop */}
                <div className="hidden sm:grid grid-cols-[1fr_1.5fr_1.5fr_0.8fr_1fr_40px] gap-3 items-center px-6 py-4">
                  <Badge variant="outline" className="w-fit bg-secondary text-secondary-foreground">{item.category}</Badge>
                  <span className="font-mono text-sm">{item.imei_number}</span>
                  <span className="font-medium text-sm">{item.type}</span>
                  <span className={cn("font-bold text-sm", item.quantity === 0 ? "text-destructive" : "text-emerald-600")}>{item.quantity}</span>
                  <span className="text-sm text-muted-foreground">{formatDate(item.created_at)}</span>
                  {itemActions}
                </div>
                {/* Mobile */}
                <div className="sm:hidden px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{item.type}</p>
                      <p className="font-mono text-xs text-muted-foreground truncate">{item.imei_number}</p>
                    </div>
                    {itemActions}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[0.65rem] bg-secondary text-secondary-foreground">{item.category}</Badge>
                    <span className={cn("font-bold", item.quantity === 0 ? "text-destructive" : "text-emerald-600")}>Stock: {item.quantity}</span>
                    <span className="text-muted-foreground ml-auto">{formatDate(item.created_at)}</span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
        {/* Pagination omitted for brevity, same pattern as VehiclesView */}
        {!loading && filteredStock.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {Math.min((stockPage - 1) * PAGE_SIZE + 1, filteredStock.length)} to {Math.min(stockPage * PAGE_SIZE, filteredStock.length)} of {filteredStock.length}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={stockPage === 1} onClick={() => setStockPage(p => p - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-muted/50"><ChevronLeft size={14}/></button>
              <span className="text-xs font-semibold px-2">{stockPage} / {totalPages}</span>
              <button disabled={stockPage === totalPages} onClick={() => setStockPage(p => p + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-muted/50"><ChevronRight size={14}/></button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Render Usage Table ──────────────────────────────────────────────────────
  const renderUsageTable = () => {
    const totalPages = Math.max(1, Math.ceil(filteredUsage.length / PAGE_SIZE));
    const pageData = filteredUsage.slice((usagePage - 1) * PAGE_SIZE, usagePage * PAGE_SIZE);

    return (
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_1.5fr_1fr_1.5fr_0.8fr_1fr] gap-3 px-6 py-3 border-b border-border bg-muted/30">
          {["CATEGORY", "IMEI NUMBER", "TYPE", "INSTALLED BY", "QTY", "DATE USED"].map((col) => (
            <span key={col} className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{col}</span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 size={18} className="animate-spin mr-2" /> Loading history…</div>
        ) : pageData.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No usage history found.</div>
        ) : (
          <div className="divide-y divide-border">
            {pageData.map(u => (
              <div key={u.id} className="hover:bg-muted/30 transition-colors">
                {/* Desktop */}
                <div className="hidden sm:grid grid-cols-[1fr_1.5fr_1fr_1.5fr_0.8fr_1fr] gap-3 items-center px-6 py-4">
                  <Badge variant="outline" className="w-fit">{u.category}</Badge>
                  <span className="font-mono text-sm text-muted-foreground truncate">{u.imei_number}</span>
                  <span className="text-sm font-medium truncate">{u.type}</span>
                  <span className="text-sm font-semibold truncate text-foreground">{u.installed_by}</span>
                  <span className="font-bold text-sm text-amber-600">-{u.quantity_used}</span>
                  <span className="text-sm text-muted-foreground">{formatDate(u.used_at)}</span>
                </div>
                {/* Mobile */}
                <div className="sm:hidden px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{u.type}</p>
                    <span className="font-bold text-sm text-amber-600">-{u.quantity_used}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[0.65rem]">{u.category}</Badge>
                    <span className="text-muted-foreground truncate">{u.installed_by}</span>
                    <span className="text-muted-foreground ml-auto">{formatDate(u.used_at)}</span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground truncate">{u.imei_number}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && filteredUsage.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {Math.min((usagePage - 1) * PAGE_SIZE + 1, filteredUsage.length)} to {Math.min(usagePage * PAGE_SIZE, filteredUsage.length)} of {filteredUsage.length}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={usagePage === 1} onClick={() => setUsagePage(p => p - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-muted/50"><ChevronLeft size={14}/></button>
              <span className="text-xs font-semibold px-2">{usagePage} / {totalPages}</span>
              <button disabled={usagePage === totalPages} onClick={() => setUsagePage(p => p + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-muted/50"><ChevronRight size={14}/></button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 pt-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Inventory Management</h1>
        <div className="flex gap-2">
          {activeTab === "stock" ? (
             <Button size="sm" className="bg-odg-orange text-white hover:brightness-95" onClick={() => { setItemForm(emptyItemForm); setShowItemForm(true); }}>
              <Plus size={15} className="mr-2" /> Add Item
            </Button>
          ) : (
            <Button size="sm" className="bg-odg-orange text-white hover:brightness-95" onClick={() => handleOpenUseForm()}>
              <Plus size={15} className="mr-2" /> Record Usage
            </Button>
          )}
        </div>
      </div>

      {/* ── KPIs (Only on stock tab) ── */}
      {activeTab === "stock" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl px-5 py-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0"><Package size={20} /></div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Total Items in Stock</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">{items.reduce((sum, i) => sum + i.quantity, 0)}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-5 py-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0"><MapPin size={20} /></div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Trackers Available</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">{trackersCount}</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl px-5 py-4 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0"><Camera size={20} /></div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Cameras Available</p>
              <p className="text-2xl font-extrabold text-foreground mt-0.5">{camerasCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs & Search ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border text-sm">
          <button
            onClick={() => setActiveTab("stock")}
            className={cn("px-5 py-1.5 rounded-lg font-medium transition-colors", activeTab === "stock" ? "bg-odg-orange text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            Current Stock
          </button>
          <button
            onClick={() => setActiveTab("usage")}
            className={cn("px-5 py-1.5 rounded-lg font-medium transition-colors", activeTab === "usage" ? "bg-odg-orange text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            Usage History
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={activeTab === "stock" ? stockSearch : usageSearch}
            onChange={(e) => activeTab === "stock" ? setStockSearch(e.target.value) : setUsageSearch(e.target.value)}
            placeholder="Search by IMEI, Type..."
            className="w-full pl-9 pr-4 h-9 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
          <AlertCircle size={16} /> <span className="font-medium">{error}</span>
        </div>
      )}

      {/* ── Content ── */}
      {activeTab === "stock" ? renderStockTable() : renderUsageTable()}

      {/* ── Modals ── */}
      
      {/* 1. Add / Edit Stock Item */}
      <Dialog open={showItemForm} onOpenChange={setShowItemForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{itemForm.id ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
            <DialogDescription>Enter the device details to add it to stock.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Popover open={catOpen} onOpenChange={setCatOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={catOpen} className="w-full justify-between font-normal">
                    {itemForm.category || "Select a category..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div className="max-h-48 overflow-y-auto p-1">
                    {categories.map(c => (
                      <div
                        key={c.id}
                        className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                        onClick={() => { setItemForm({...itemForm, category: c.name}); setCatOpen(false); }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", itemForm.category === c.name ? "opacity-100" : "opacity-0")} />
                        {c.name}
                      </div>
                    ))}
                    {categories.length === 0 && <div className="px-2 py-2 text-xs text-muted-foreground">No categories yet.</div>}
                  </div>
                  <div className="border-t p-2">
                    <form onSubmit={handleAddCategory} className="flex gap-2">
                      <Input
                        placeholder="New category..."
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Button type="submit" size="sm" disabled={creatingCat || !newCatName.trim()} className="h-8 text-xs">Add</Button>
                    </form>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">IMEI Number</Label>
              <Input placeholder="e.g. 356938035643809" value={itemForm.imei_number} onChange={e => setItemForm({...itemForm, imei_number: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Device Type / Model</Label>
                <Input placeholder="e.g. FMB920" value={itemForm.type} onChange={e => setItemForm({...itemForm, type: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity</Label>
                <Input type="number" min="0" value={itemForm.quantity} onChange={e => setItemForm({...itemForm, quantity: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemForm(false)}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={savingItem}>
              {savingItem ? <Loader2 size={14} className="animate-spin mr-2" /> : "Save Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Record Usage Form */}
      <Dialog open={showUseForm} onOpenChange={setShowUseForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Usage</DialogTitle>
            <DialogDescription>Select an item to use, specify who installed it, and the quantity.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
               <Label className="text-xs">Item (Search by IMEI or Type)</Label>
               <Popover open={imeiOpen} onOpenChange={setImeiOpen}>
                 <PopoverTrigger asChild>
                   <Button variant="outline" role="combobox" aria-expanded={imeiOpen} className="w-full justify-between font-normal">
                     {useForm.imei_number ? `${useForm.imei_number} — ${useForm.type}` : "Select item..."}
                     <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                   <div className="flex items-center border-b px-3">
                     <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                     <input
                       placeholder="Search IMEI..."
                       value={imeiSearch}
                       onChange={e => setImeiSearch(e.target.value)}
                       className="flex h-10 w-full rounded-md bg-transparent text-sm outline-none"
                     />
                   </div>
                   <div className="max-h-48 overflow-y-auto p-1">
                     {items.filter(i => i.quantity > 0 && (!imeiSearch || i.imei_number.toLowerCase().includes(imeiSearch.toLowerCase()) || i.type.toLowerCase().includes(imeiSearch.toLowerCase()))).map(i => (
                       <div
                         key={i.id}
                         className="flex cursor-pointer flex-col rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                         onClick={() => {
                           setUseForm({ ...useForm, inventory_id: i.id, category: i.category, imei_number: i.imei_number, type: i.type, quantity_used: "1" });
                           setImeiOpen(false);
                         }}
                       >
                         <span className="font-semibold">{i.imei_number}</span>
                         <span className="text-xs text-muted-foreground">{i.type} <span className="text-primary font-medium ml-2">Stock: {i.quantity}</span></span>
                       </div>
                     ))}
                   </div>
                 </PopoverContent>
               </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Installed By</Label>
              <Input placeholder="Enter name..." value={useForm.installed_by} onChange={e => setUseForm({...useForm, installed_by: e.target.value})} />
            </div>

            <div className="space-y-1.5 w-1/2">
              <Label className="text-xs">Quantity Used</Label>
              <Input type="number" min="1" value={useForm.quantity_used} onChange={e => setUseForm({...useForm, quantity_used: e.target.value})} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUseForm(false)}>Cancel</Button>
            <Button onClick={handleRecordUsage} disabled={savingUsage}>
              {savingUsage ? <Loader2 size={14} className="animate-spin mr-2" /> : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Confirm Delete */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>This item will be permanently removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
