"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Star, Trash2, Power, PowerOff, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPlans, createPlan, updatePlan, deletePlan, type Plan } from "@/lib/plans-api";
import { cn } from "@/lib/utils";

export default function SubscriptionsView() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [isAddMode, setIsAddMode] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        price: "",
        description: "",
        features: "",
    });

    const fetchPlans = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getPlans();
            setPlans(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load plans.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPlans(); }, [fetchPlans]);

    const resetForm = () => {
        setFormData({ name: "", price: "", description: "", features: "" });
        setEditingPlan(null);
        setIsAddMode(false);
    };

    const handleAddClick = () => {
        resetForm();
        setIsAddMode(true);
        setIsDialogOpen(true);
    };

    const handleEditClick = (plan: Plan) => {
        setFormData({
            name: plan.name,
            price: plan.price.toString(),
            description: plan.description,
            features: plan.features.join(", "),
        });
        setEditingPlan(plan);
        setIsAddMode(false);
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        const features = formData.features
            .split(",")
            .map((f) => f.trim())
            .filter((f) => f);

        setSaving(true);
        try {
            if (isAddMode) {
                await createPlan({
                    name: formData.name,
                    price: parseFloat(formData.price) || 0,
                    description: formData.description,
                    features,
                });
            } else if (editingPlan) {
                await updatePlan(editingPlan.id, {
                    name: formData.name,
                    price: parseFloat(formData.price) || 0,
                    description: formData.description,
                    features,
                });
            }
            setIsDialogOpen(false);
            resetForm();
            fetchPlans();
        } finally {
            setSaving(false);
        }
    };

    const togglePlanStatus = async (plan: Plan) => {
        await updatePlan(plan.id, { is_active: !plan.is_active });
        fetchPlans();
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        try {
            await deletePlan(confirmDelete.id);
            setConfirmDelete(null);
            fetchPlans();
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* ── Page header ── */}
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Subscription Plans</h1>
            </div>

            {/* ── Add button row ── */}
            <div className="flex items-center justify-end">
                <Button onClick={handleAddClick} className="gap-2 bg-odg-orange text-white hover:brightness-95 h-9" size="sm">
                    <Plus size={15} /> Add New Plan
                </Button>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="flex items-center gap-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {/* ── KPI cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-3 flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
                        <Loader2 size={16} className="animate-spin" /> Loading plans…
                    </div>
                ) : plans.length === 0 ? (
                    <div className="col-span-3 flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
                        <p className="text-sm">No subscription plans yet.</p>
                        <Button onClick={handleAddClick} size="sm" className="gap-2 bg-odg-orange text-white hover:brightness-95">
                            <Plus size={13} /> Add First Plan
                        </Button>
                    </div>
                ) : (
                    plans.map((p) => (
                        <div key={p.id} className={`bg-card border border-border rounded-xl px-6 py-5 shadow-sm flex flex-col gap-3 ${!p.is_active ? "opacity-60" : ""}`}>
                            <div className="flex items-center justify-between">
                                <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{p.name}</p>
                                <span className={`text-[0.6rem] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    p.is_active
                                        ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                                        : "text-zinc-500 bg-zinc-100 border-zinc-200"
                                }`}>{p.is_active ? "Active" : "Inactive"}</span>
                            </div>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-extrabold text-foreground leading-none">{p.subscriber_count}</span>
                                <span className="text-sm text-muted-foreground mb-0.5">subscribers</span>
                            </div>
                            <div className="flex items-baseline gap-1 pt-1 border-t border-border">
                                <span className="text-base font-bold text-foreground">GH₵{p.price}</span>
                                <span className="text-xs text-muted-foreground">/month</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ── Table ── */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-[1fr_0.7fr_0.8fr_1.8fr_0.7fr_140px] gap-4 px-6 py-3 border-b border-border bg-muted/30">
                    {["PLAN NAME", "STATUS", "PRICE", "DESCRIPTION", "SUBSCRIBERS", "ACTIONS"].map((col) => (
                        <span key={col} className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">{col}</span>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
                        <Loader2 size={18} className="animate-spin" /> Loading…
                    </div>
                ) : plans.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-12">No subscription plans added yet.</p>
                ) : (
                    <div className="divide-y divide-border">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={cn(
                                    "grid grid-cols-[1fr_0.7fr_0.8fr_1.8fr_0.7fr_140px] gap-4 items-center px-6 py-4 hover:bg-muted/30 transition-colors",
                                    !plan.is_active && "opacity-50"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-foreground">{plan.name}</span>
                                    {plan.popular && <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
                                </div>

                                <div>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[0.7rem] font-semibold px-2.5 py-0.5",
                                            plan.is_active
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-zinc-100 text-zinc-500 border-zinc-200"
                                        )}
                                    >
                                        {plan.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                </div>

                                <div className="flex items-baseline gap-1">
                                    <span className="font-bold text-sm text-foreground">GH₵{plan.price}</span>
                                    <span className="text-xs text-muted-foreground">/mo</span>
                                </div>

                                <span className="text-xs text-muted-foreground truncate block">{plan.description}</span>

                                <span className="text-sm font-semibold text-foreground tabular-nums">{plan.subscriber_count}</span>

                                <div className="flex items-center gap-1.5">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                onClick={() => handleEditClick(plan)}
                                                className="h-7 px-2.5 text-xs gap-1 border-border hover:border-primary/50"
                                            >
                                                <Pencil size={12} /> Edit
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Edit plan details</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                onClick={() => togglePlanStatus(plan)}
                                                className={cn(
                                                    "h-7 px-2.5 text-xs gap-1",
                                                    plan.is_active
                                                        ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                                                        : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                                )}
                                            >
                                                {plan.is_active ? <PowerOff size={12} /> : <Power size={12} />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{plan.is_active ? "Deactivate plan" : "Activate plan"}</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="xs"
                                                variant="outline"
                                                onClick={() => setConfirmDelete({ id: plan.id, name: plan.name })}
                                                className="h-7 px-2.5 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                                            >
                                                <Trash2 size={12} />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Delete plan</TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Add/Edit Dialog ── */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); resetForm(); } }}>
                <DialogContent className="sm:max-w-125">
                    <DialogHeader>
                        <DialogTitle>{isAddMode ? "Add New Subscription Plan" : "Edit Subscription Plan"}</DialogTitle>
                        <DialogDescription>
                            {isAddMode
                                ? "Create a new subscription plan with custom pricing and features."
                                : "Update the subscription plan details and pricing."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label htmlFor="name" className="text-sm font-medium">Plan Name</label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Basic, Standard, Premium"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="price" className="text-sm font-medium">Monthly Price (GH₵)</label>
                            <Input
                                id="price"
                                type="number"
                                value={formData.price}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, price: e.target.value })}
                                placeholder="e.g., 199"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="description" className="text-sm font-medium">Description</label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of what this plan offers..."
                                rows={2}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="features" className="text-sm font-medium">Features (comma separated)</label>
                            <Textarea
                                id="features"
                                value={formData.features}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, features: e.target.value })}
                                placeholder="e.g., 1 Vehicle, Real-time tracking, Email support"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving || !formData.name || !formData.price} className="bg-odg-orange text-white hover:brightness-95">
                            {saving && <Loader2 size={13} className="animate-spin mr-1" />}
                            {isAddMode ? "Create Plan" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation Dialog ── */}
            {confirmDelete && (
                <Dialog open onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-destructive">
                                <Trash2 size={16} /> Delete Plan
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete <span className="font-semibold text-foreground">{confirmDelete.name}</span>? This action cannot be undone.
                        </p>
                        <DialogFooter>
                            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</Button>
                            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                                {deleting && <Loader2 size={13} className="animate-spin mr-1" />}
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
