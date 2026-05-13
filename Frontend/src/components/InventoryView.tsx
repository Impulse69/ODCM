"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { getSmsConfig } from "@/lib/sms-api";
import {
  addInventoryCategory,
  addInventoryItem,
  addInventoryType,
  editInventoryItem,
  getInventoryCategories,
  getInventoryItems,
  getInventoryTypes,
  getInventoryTypesByCategory,
  getInventoryUsageHistory,
  recordInventoryUsage,
  removeInventoryCategory,
  removeInventoryItem,
  removeInventoryType,
  type InventoryCategory,
  type InventoryItem,
  type InventoryType,
  type InventoryUsage,
} from "@/lib/inventory-api";

const PAGE_SIZE = 10;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCategoryStyle(categoryName: string) {
  const normalized = categoryName.toLowerCase();
  if (normalized.includes("tracker")) return { icon: MapPin, bg: "bg-emerald-500/10", text: "text-emerald-600" };
  if (normalized.includes("camera")) return { icon: Camera, bg: "bg-blue-500/10", text: "text-blue-600" };
  return { icon: Package, bg: "bg-primary/10", text: "text-primary" };
}

type ItemFormState = {
  id: number | null;
  category: string;
  type: string;
  imei_number: string;
};

type UsageFormState = {
  inventory_id: number | null;
  category: string;
  type: string;
  imei_number: string;
  installed_by: string;
  client_name: string;
  vehicle_number: string;
  location: string;
};

const emptyItemForm: ItemFormState = {
  id: null,
  category: "",
  type: "",
  imei_number: "",
};

const emptyUsageForm: UsageFormState = {
  inventory_id: null,
  category: "",
  type: "",
  imei_number: "",
  installed_by: "",
  client_name: "",
  vehicle_number: "",
  location: "",
};

export default function InventoryView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"stock" | "usage">("stock");
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [types, setTypes] = useState<InventoryType[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [usageHistory, setUsageHistory] = useState<InventoryUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockSearch, setStockSearch] = useState("");
  const [usageSearch, setUsageSearch] = useState("");
  const [stockCategoryFilter, setStockCategoryFilter] = useState("all");
  const [stockTypeFilter, setStockTypeFilter] = useState("all");
  const [usageCategoryFilter, setUsageCategoryFilter] = useState("all");
  const [usageTypeFilter, setUsageTypeFilter] = useState("all");
  const [stockPage, setStockPage] = useState(1);
  const [usagePage, setUsagePage] = useState(1);
  const [showManage, setShowManage] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showUsageForm, setShowUsageForm] = useState(false);
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm);
  const [usageForm, setUsageForm] = useState<UsageFormState>(emptyUsageForm);
  const [savingItem, setSavingItem] = useState(false);
  const [savingUsage, setSavingUsage] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [newCategory, setNewCategory] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [typeCategory, setTypeCategory] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingType, setCreatingType] = useState(false);
  const [availableUsageTypes, setAvailableUsageTypes] = useState<InventoryType[]>([]);
  const [availableUsageItems, setAvailableUsageItems] = useState<InventoryItem[]>([]);
  const [loadingUsageChoices, setLoadingUsageChoices] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const defaultInstallerName = user?.name?.trim() || "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, typs, inv, usage, smsConfig] = await Promise.all([
        getInventoryCategories(),
        getInventoryTypes(),
        getInventoryItems(),
        getInventoryUsageHistory(),
        getSmsConfig(),
      ]);
      setCategories(cats);
      setTypes(typs);
      setItems(inv);
      setUsageHistory(usage);
      setLowStockThreshold(Math.max(1, Number(smsConfig.lowStockThreshold || 10)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const loadChoices = async () => {
      if (!usageForm.category) {
        setAvailableUsageTypes([]);
        setAvailableUsageItems([]);
        return;
      }

      setLoadingUsageChoices(true);
      try {
        const nextTypes = await getInventoryTypesByCategory(usageForm.category);
        setAvailableUsageTypes(nextTypes);
        if (usageForm.type) {
          const nextItems = await getInventoryItems({ category: usageForm.category, type: usageForm.type });
          setAvailableUsageItems(nextItems);
        } else {
          setAvailableUsageItems([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load inventory choices");
      } finally {
        setLoadingUsageChoices(false);
      }
    };

    loadChoices();
  }, [usageForm.category, usageForm.type]);

  const filteredStock = useMemo(() => {
    const query = stockSearch.toLowerCase();
    return items.filter((item) => {
      const matchesCategory = stockCategoryFilter === "all" || item.category === stockCategoryFilter;
      const matchesType = stockTypeFilter === "all" || item.type === stockTypeFilter;
      if (!matchesCategory || !matchesType) return false;
      if (!query) return true;
      return [item.category, item.type, item.imei_number].some((value) => value.toLowerCase().includes(query));
    });
  }, [items, stockCategoryFilter, stockSearch, stockTypeFilter]);

  const filteredUsage = useMemo(() => {
    const query = usageSearch.toLowerCase();
    return usageHistory.filter((item) => {
      const matchesCategory = usageCategoryFilter === "all" || item.category === usageCategoryFilter;
      const matchesType = usageTypeFilter === "all" || item.type === usageTypeFilter;
      if (!matchesCategory || !matchesType) return false;
      if (!query) return true;
      return [item.category, item.type, item.imei_number, item.installed_by, item.client_name, item.vehicle_number, item.location].some((value) => value.toLowerCase().includes(query));
    });
  }, [usageCategoryFilter, usageHistory, usageSearch, usageTypeFilter]);

  const itemTypes = useMemo(() => {
    if (!itemForm.category) return [];
    return types.filter((type) => type.category_name === itemForm.category);
  }, [itemForm.category, types]);

  const stockFilterTypes = useMemo(() => {
    if (stockCategoryFilter === "all") return types;
    return types.filter((type) => type.category_name === stockCategoryFilter);
  }, [stockCategoryFilter, types]);

  const usageFilterTypes = useMemo(() => {
    if (usageCategoryFilter === "all") return types;
    return types.filter((type) => type.category_name === usageCategoryFilter);
  }, [types, usageCategoryFilter]);

  const typeCards = useMemo(() => {
    return types.map((type) => ({
      ...type,
      count: items.filter((item) => item.category === type.category_name && item.type === type.name).length,
      style: getCategoryStyle(type.category_name),
    }));
  }, [items, types]);

  const lowStockTypes = useMemo(() => {
    return typeCards
      .filter((type) => type.count <= lowStockThreshold)
      .sort((a, b) => a.count - b.count);
  }, [lowStockThreshold, typeCards]);

  useEffect(() => {
    setStockPage(1);
  }, [stockSearch, stockCategoryFilter, stockTypeFilter]);

  useEffect(() => {
    setUsagePage(1);
  }, [usageSearch, usageCategoryFilter, usageTypeFilter]);

  const handleCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newCategory.trim()) return;
    setCreatingCategory(true);
    try {
      const created = await addInventoryCategory(newCategory.trim());
      setCategories((prev) => [...prev, created]);
      setNewCategory("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCreateType = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!typeCategory || !newTypeName.trim()) return;
    setCreatingType(true);
    try {
      const created = await addInventoryType(typeCategory, newTypeName.trim());
      setTypes((prev) => [...prev, created]);
      setNewTypeName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create type");
    } finally {
      setCreatingType(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await removeInventoryCategory(id);
      setCategories((prev) => prev.filter((category) => category.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  const handleDeleteType = async (id: number) => {
    try {
      await removeInventoryType(id);
      setTypes((prev) => prev.filter((type) => type.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete type");
    }
  };

  const handleSaveItem = async () => {
    if (!itemForm.category || !itemForm.type || !itemForm.imei_number.trim()) {
      setError("Please fill category, type and IMEI.");
      return;
    }

    setSavingItem(true);
    setError(null);
    try {
      if (itemForm.id) {
        await editInventoryItem(itemForm.id, {
          category: itemForm.category,
          type: itemForm.type,
          imei_number: itemForm.imei_number.trim(),
        });
      } else {
        await addInventoryItem({
          category: itemForm.category,
          type: itemForm.type,
          imei_number: itemForm.imei_number.trim(),
          quantity: 1,
        });
      }

      setShowItemForm(false);
      setItemForm(emptyItemForm);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setSavingItem(false);
    }
  };

  const handleOpenUsageForm = async (item?: InventoryItem) => {
    if (item) {
      setUsageForm({
        inventory_id: item.id,
        category: item.category,
        type: item.type,
        imei_number: item.imei_number,
        installed_by: defaultInstallerName,
        client_name: "",
        vehicle_number: "",
        location: "",
      });
      try {
        const nextTypes = await getInventoryTypesByCategory(item.category);
        setAvailableUsageTypes(nextTypes);
        const nextItems = await getInventoryItems({ category: item.category, type: item.type });
        setAvailableUsageItems(nextItems);
      } catch {
        setAvailableUsageTypes([]);
        setAvailableUsageItems([]);
      }
    } else {
      setUsageForm({ ...emptyUsageForm, installed_by: defaultInstallerName });
      setAvailableUsageTypes([]);
      setAvailableUsageItems([]);
    }

    setShowUsageForm(true);
  };

  const handleSaveUsage = async () => {
    if (!usageForm.inventory_id || !usageForm.installed_by.trim() || !usageForm.client_name.trim() || !usageForm.vehicle_number.trim() || !usageForm.location.trim()) {
      setError("Please select an IMEI and enter installer, client, vehicle number, and location.");
      return;
    }

    setSavingUsage(true);
    setError(null);
    try {
      await recordInventoryUsage({
        inventory_id: usageForm.inventory_id,
        installed_by: usageForm.installed_by.trim(),
        client_name: usageForm.client_name.trim(),
        vehicle_number: usageForm.vehicle_number.trim(),
        location: usageForm.location.trim(),
      });
      setShowUsageForm(false);
      setUsageForm({ ...emptyUsageForm, installed_by: defaultInstallerName });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record usage");
    } finally {
      setSavingUsage(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    try {
      await removeInventoryItem(deleteTarget);
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setDeleteTarget(null);
    }
  };

  const renderStock = () => {
    const totalPages = Math.max(1, Math.ceil(filteredStock.length / PAGE_SIZE));
    const pageItems = filteredStock.slice((stockPage - 1) * PAGE_SIZE, stockPage * PAGE_SIZE);

    return (
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_1.2fr_1.6fr_1fr_40px] gap-3 px-6 py-3 border-b border-border bg-muted/30">
          {["CATEGORY", "TYPE", "IMEI NUMBER", "DATE ADDED", ""].map((column) => (
            <span key={column} className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{column}</span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading inventory…
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No items in stock.</div>
        ) : (
          <div className="divide-y divide-border">
            {pageItems.map((item) => {
              const style = getCategoryStyle(item.category);
              const Icon = style.icon;

              return (
                <div key={item.id} className="hover:bg-muted/30 transition-colors">
                  <div className="hidden sm:grid grid-cols-[1fr_1.2fr_1.6fr_1fr_40px] gap-3 items-center px-6 py-4">
                    <Badge variant="outline" className="w-fit bg-secondary text-secondary-foreground">{item.category}</Badge>
                    <span className="font-medium text-sm flex items-center gap-2"><Icon size={14} className={style.text} />{item.type}</span>
                    <span className="font-mono text-sm">{item.imei_number}</span>
                    <span className="text-sm text-muted-foreground">{formatDate(item.created_at)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground"><MoreHorizontal size={15} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-xs cursor-pointer text-blue-600 focus:text-blue-600" onClick={() => handleOpenUsageForm(item)}>Use Item</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => { setItemForm({ id: item.id, category: item.category, type: item.type, imei_number: item.imei_number }); setShowItemForm(true); }}>Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteTarget(item.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="sm:hidden px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{item.type}</p>
                        <p className="font-mono text-xs text-muted-foreground truncate">{item.imei_number}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={() => handleOpenUsageForm(item)}>
                        <MoreHorizontal size={15} />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[0.65rem] bg-secondary text-secondary-foreground">{item.category}</Badge>
                      <span className="text-muted-foreground ml-auto">{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredStock.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Showing {Math.min((stockPage - 1) * PAGE_SIZE + 1, filteredStock.length)} to {Math.min(stockPage * PAGE_SIZE, filteredStock.length)} of {filteredStock.length}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={stockPage === 1} onClick={() => setStockPage((page) => page - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-muted/50"><ChevronLeft size={14} /></button>
              <span className="text-xs font-semibold px-2">{stockPage} / {totalPages}</span>
              <button disabled={stockPage === totalPages} onClick={() => setStockPage((page) => page + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-muted/50"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderUsage = () => {
    const totalPages = Math.max(1, Math.ceil(filteredUsage.length / PAGE_SIZE));
    const pageItems = filteredUsage.slice((usagePage - 1) * PAGE_SIZE, usagePage * PAGE_SIZE);

    return (
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[0.85fr_1.1fr_1fr_1fr_0.9fr_1fr_1fr_0.85fr] gap-3 px-6 py-3 border-b border-border bg-muted/30">
          {["CATEGORY", "IMEI NUMBER", "TYPE", "CLIENT", "VEHICLE", "LOCATION", "INSTALLED BY", "DATE USED"].map((column) => (
            <span key={column} className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{column}</span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading history…
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No usage history found.</div>
        ) : (
          <div className="divide-y divide-border">
            {pageItems.map((entry) => (
              <div key={entry.id} className="hover:bg-muted/30 transition-colors">
                <div className="hidden sm:grid grid-cols-[0.85fr_1.1fr_1fr_1fr_0.9fr_1fr_1fr_0.85fr] gap-3 items-center px-6 py-4">
                  <Badge variant="outline" className="w-fit">{entry.category}</Badge>
                  <span className="font-mono text-sm text-muted-foreground truncate">{entry.imei_number}</span>
                  <span className="text-sm font-medium truncate">{entry.type}</span>
                  <span className="text-sm truncate">{entry.client_name}</span>
                  <span className="text-sm truncate">{entry.vehicle_number}</span>
                  <span className="text-sm truncate">{entry.location}</span>
                  <span className="text-sm font-semibold truncate text-foreground">{entry.installed_by}</span>
                  <span className="text-sm text-muted-foreground">{formatDate(entry.used_at)}</span>
                </div>

                <div className="sm:hidden px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{entry.type}</p>
                    <span className="text-xs text-muted-foreground">{formatDate(entry.used_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-[0.65rem]">{entry.category}</Badge>
                    <span className="text-muted-foreground truncate">{entry.vehicle_number}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">Client: {entry.client_name}</p>
                  <p className="text-xs text-muted-foreground truncate">Location: {entry.location}</p>
                  <p className="text-xs text-muted-foreground truncate">Installed by: {entry.installed_by}</p>
                  <p className="font-mono text-xs text-muted-foreground truncate">{entry.imei_number}</p>
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
              <button disabled={usagePage === 1} onClick={() => setUsagePage((page) => page - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-muted/50"><ChevronLeft size={14} /></button>
              <span className="text-xs font-semibold px-2">{usagePage} / {totalPages}</span>
              <button disabled={usagePage === totalPages} onClick={() => setUsagePage((page) => page + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:bg-muted/50"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Inventory Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Current stock and usage history are tracked in separate sections.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowManage(true)}>
            <Settings2 size={15} className="mr-2" /> Manage
          </Button>
          {activeTab === "stock" ? (
            <Button size="sm" className="bg-odg-orange text-white hover:brightness-95" onClick={() => { setItemForm(emptyItemForm); setShowItemForm(true); }}>
              <Plus size={15} className="mr-2" /> Add Item
            </Button>
          ) : (
            <Button size="sm" className="bg-odg-orange text-white hover:brightness-95" onClick={() => handleOpenUsageForm()}>
              <Plus size={15} className="mr-2" /> Record Usage
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 min-w-40">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"><Package size={16} /></div>
          <div>
            <p className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">Total Stock</p>
            <p className="text-lg font-extrabold text-foreground leading-tight">{items.length}</p>
          </div>
        </div>

        {typeCards.map((type) => {
          const Icon = type.style.icon;
          const isLowStock = type.count <= lowStockThreshold;
          return (
            <div key={type.id} className={cn("bg-card border rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 min-w-35", isLowStock ? "border-amber-300 bg-amber-50/60" : "border-border")}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", type.style.bg, type.style.text)}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-25">{type.name}</p>
                <p className="text-lg font-extrabold text-foreground leading-tight">{type.count}</p>
                {isLowStock ? <p className="text-[0.65rem] font-semibold text-amber-700">Low stock</p> : null}
              </div>
            </div>
          );
        })}
      </div>

      {lowStockTypes.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle size={16} />
            <span>Low stock warning</span>
          </div>
          <p className="mt-1 text-amber-800">
            {lowStockTypes.map((type) => `${type.name} (${type.count} left)`).join(", ")}
            . Admin SMS is sent when a type reaches {lowStockThreshold} or below.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border text-sm">
          <button onClick={() => setActiveTab("stock")} className={cn("px-5 py-1.5 rounded-lg font-medium transition-colors", activeTab === "stock" ? "bg-odg-orange text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}>Current Stock</button>
          <button onClick={() => setActiveTab("usage")} className={cn("px-5 py-1.5 rounded-lg font-medium transition-colors", activeTab === "usage" ? "bg-odg-orange text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}>Usage History</button>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          {activeTab === "stock" && (
            <>
              <select
                value={stockCategoryFilter}
                onChange={(event) => {
                  setStockCategoryFilter(event.target.value);
                  setStockTypeFilter("all");
                }}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm sm:w-44"
              >
                <option value="all">All categories</option>
                {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              </select>

              <select
                value={stockTypeFilter}
                onChange={(event) => setStockTypeFilter(event.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm sm:w-44"
              >
                <option value="all">All types</option>
                {stockFilterTypes.map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}
              </select>
            </>
          )}

          {activeTab === "usage" && (
            <>
              <select
                value={usageCategoryFilter}
                onChange={(event) => {
                  setUsageCategoryFilter(event.target.value);
                  setUsageTypeFilter("all");
                }}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm sm:w-44"
              >
                <option value="all">All categories</option>
                {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              </select>

              <select
                value={usageTypeFilter}
                onChange={(event) => setUsageTypeFilter(event.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm sm:w-44"
              >
                <option value="all">All types</option>
                {usageFilterTypes.map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}
              </select>
            </>
          )}

          <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={activeTab === "stock" ? stockSearch : usageSearch}
            onChange={(event) => activeTab === "stock" ? setStockSearch(event.target.value) : setUsageSearch(event.target.value)}
            placeholder="Search by IMEI, type or category"
            className="w-full pl-9 pr-4 h-9 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
          <AlertCircle size={16} /> <span className="font-medium">{error}</span>
        </div>
      )}

      {activeTab === "stock" ? renderStock() : renderUsage()}

      <Dialog open={showItemForm} onOpenChange={setShowItemForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{itemForm.id ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
            <DialogDescription>Choose a category, then its type, then enter the IMEI.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <select
                value={itemForm.category}
                onChange={(event) => setItemForm((prev) => ({ ...prev, category: event.target.value, type: "" }))}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">Select a category</option>
                {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <select
                value={itemForm.type}
                onChange={(event) => setItemForm((prev) => ({ ...prev, type: event.target.value }))}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                disabled={!itemForm.category}
              >
                <option value="">{itemForm.category ? "Select a type" : "Choose a category first"}</option>
                {itemTypes.map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">IMEI</Label>
              <Input value={itemForm.imei_number} onChange={(event) => setItemForm((prev) => ({ ...prev, imei_number: event.target.value }))} placeholder="Enter unique IMEI" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemForm(false)}>Cancel</Button>
            <Button onClick={handleSaveItem} disabled={savingItem}>{savingItem ? <Loader2 size={14} className="animate-spin mr-2" /> : null}{itemForm.id ? "Save Changes" : "Add Item"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUsageForm} onOpenChange={setShowUsageForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Stock Usage</DialogTitle>
            <DialogDescription>Move items from current stock into history by filling in the details below.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-tight text-muted-foreground font-bold">Category</Label>
              <select
                value={usageForm.category}
                onChange={async (event) => {
                  const category = event.target.value;
                  setUsageForm({ ...emptyUsageForm, category, installed_by: defaultInstallerName });
                  if (!category) return;
                  try {
                    const nextTypes = await getInventoryTypesByCategory(category);
                    setAvailableUsageTypes(nextTypes);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to load types");
                  }
                }}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
              >
                <option value="">Select a category</option>
                {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-tight text-muted-foreground font-bold">Type</Label>
              <select
                value={usageForm.type}
                onChange={async (event) => {
                  const type = event.target.value;
                  setUsageForm((prev) => ({ ...prev, type, imei_number: "", inventory_id: null }));
                  if (!usageForm.category || !type) {
                    setAvailableUsageItems([]);
                    return;
                  }
                  try {
                    const nextItems = await getInventoryItems({ category: usageForm.category, type });
                    setAvailableUsageItems(nextItems);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to load IMEIs");
                  }
                }}
                className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-odg-orange/30"
                disabled={!usageForm.category || loadingUsageChoices}
              >
                <option value="">{loadingUsageChoices ? "Loading types..." : usageForm.category ? "Select a type" : "Choose a category first"}</option>
                {availableUsageTypes.map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs uppercase tracking-tight text-muted-foreground font-bold">IMEI / Serial Number</Label>
              <select
                value={usageForm.inventory_id ?? ""}
                onChange={(event) => {
                  const selectedId = Number(event.target.value);
                  const selected = availableUsageItems.find((item) => item.id === selectedId);
                  setUsageForm((prev) => ({
                    ...prev,
                    inventory_id: selected?.id ?? null,
                    imei_number: selected?.imei_number ?? "",
                  }));
                }}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-odg-orange/30 font-mono"
                disabled={!usageForm.type || loadingUsageChoices}
              >
                <option value="">{loadingUsageChoices ? "Loading IMEIs..." : usageForm.type ? "Select item from current stock" : "Choose a type first"}</option>
                {availableUsageItems.map((item) => <option key={item.id} value={item.id}>{item.imei_number}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-tight text-muted-foreground font-bold">Client Name</Label>
              <Input 
                value={usageForm.client_name} 
                onChange={(event) => setUsageForm((prev) => ({ ...prev, client_name: event.target.value }))} 
                placeholder="Individual or Company" 
                className="h-10 focus:ring-odg-orange/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-tight text-muted-foreground font-bold">Vehicle Number</Label>
              <Input 
                value={usageForm.vehicle_number} 
                onChange={(event) => setUsageForm((prev) => ({ ...prev, vehicle_number: event.target.value }))} 
                placeholder="e.g. GR-123-24" 
                className="h-10 focus:ring-odg-orange/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-tight text-muted-foreground font-bold">Installed By</Label>
              <Input 
                value={usageForm.installed_by} 
                onChange={(event) => setUsageForm((prev) => ({ ...prev, installed_by: event.target.value }))} 
                placeholder="Technician name" 
                className="h-10 focus:ring-odg-orange/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-tight text-muted-foreground font-bold">Location</Label>
              <Input 
                value={usageForm.location} 
                onChange={(event) => setUsageForm((prev) => ({ ...prev, location: event.target.value }))} 
                placeholder="City/Area" 
                className="h-10 focus:ring-odg-orange/30"
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowUsageForm(false)} className="h-10">Cancel</Button>
            <Button onClick={handleSaveUsage} disabled={savingUsage} className="bg-odg-orange text-white hover:brightness-95 h-10">
              {savingUsage ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Archive to Usage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showManage} onOpenChange={setShowManage}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Inventory Structure</DialogTitle>
            <DialogDescription>Create or remove categories and types that drive the dependent selectors.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-2 lg:grid-cols-2">
            <div className="space-y-4">
              <form onSubmit={handleCreateCategory} className="space-y-3 rounded-xl border border-border p-4">
                <p className="text-sm font-semibold">Create Category</p>
                <Input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="New category name" />
                <Button type="submit" disabled={creatingCategory || !newCategory.trim()}>{creatingCategory ? <Loader2 size={14} className="animate-spin mr-2" /> : null}Add Category</Button>
              </form>

              <div className="rounded-xl border border-border p-4 space-y-3">
                <p className="text-sm font-semibold">Categories</p>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                      <span className="text-sm">{category.name}</span>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(category.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <form onSubmit={handleCreateType} className="space-y-3 rounded-xl border border-border p-4">
                <p className="text-sm font-semibold">Create Type</p>
                <select value={typeCategory} onChange={(event) => setTypeCategory(event.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm">
                  <option value="">Select a category</option>
                  {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                </select>
                <Input value={newTypeName} onChange={(event) => setNewTypeName(event.target.value)} placeholder="New type name" />
                <Button type="submit" disabled={creatingType || !typeCategory || !newTypeName.trim()}>{creatingType ? <Loader2 size={14} className="animate-spin mr-2" /> : null}Add Type</Button>
              </form>

              <div className="rounded-xl border border-border p-4 space-y-3">
                <p className="text-sm font-semibold">Types</p>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {types.map((type) => (
                    <div key={type.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{type.name}</p>
                        <p className="text-xs text-muted-foreground">{type.category_name}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteType(type.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Inventory Item</DialogTitle>
            <DialogDescription>This permanently removes the item from current stock.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteItem}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
