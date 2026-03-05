"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Star, Trash2, Power, PowerOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { subscriptions } from "@/data/dummy";
import { initialPlans, Plan } from "@/data/plans";
import { cn } from "@/lib/utils";

export default function SubscriptionsView() {
    const [plans, setPlans] = useState<Plan[]>(initialPlans);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [isAddMode, setIsAddMode] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        price: "",
        description: "",
        features: "",
    });

    // Calculate subscription counts per plan
    const planCounts: Record<string, number> = useMemo(() => {
        const counts: Record<string, number> = {};
        subscriptions.forEach((s) => {
            counts[s.plan] = (counts[s.plan] ?? 0) + 1;
        });
        return counts;
    }, []);

    // Reset form
    const resetForm = () => {
        setFormData({ name: "", price: "", description: "", features: "" });
        setEditingPlan(null);
        setIsAddMode(false);
    };

    // Open dialog for adding new plan
    const handleAddClick = () => {
        resetForm();
        setIsAddMode(true);
        setIsDialogOpen(true);
    };

    // Open dialog for editing
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

    // Save plan (add or update)
    const handleSave = () => {
        const features = formData.features
            .split(",")
            .map((f) => f.trim())
            .filter((f) => f);

        if (isAddMode) {
            // Generate new ID
            const newId = `plan_${Date.now()}`;
            const today = new Date().toISOString().split("T")[0];

            const newPlan: Plan = {
                id: newId,
                name: formData.name,
                price: parseFloat(formData.price) || 0,
                description: formData.description,
                features,
                color: "border-zinc-200 bg-zinc-50",
                badge: "bg-zinc-100 text-zinc-600",
                button: "outline",
                popular: false,
                isActive: true,
                createdAt: today,
                updatedAt: today,
            };

            setPlans([...plans, newPlan]);
        } else if (editingPlan) {
            // Update existing plan
            setPlans(
                plans.map((p) =>
                    p.id === editingPlan.id
                        ? {
                              ...p,
                              name: formData.name,
                              price: parseFloat(formData.price) || 0,
                              description: formData.description,
                              features,
                              updatedAt: new Date().toISOString().split("T")[0],
                          }
                        : p
                )
            );
        }

        setIsDialogOpen(false);
        resetForm();
    };

    // Toggle plan active status
    const togglePlanStatus = (planId: string) => {
        setPlans(
            plans.map((p) =>
                p.id === planId
                    ? { ...p, isActive: !p.isActive, updatedAt: new Date().toISOString().split("T")[0] }
                    : p
            )
        );
    };

    // Delete plan
    const handleDelete = (planId: string) => {
        if (confirm("Are you sure you want to delete this plan? This action cannot be undone.")) {
            setPlans(plans.filter((p) => p.id !== planId));
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up" style={{ opacity: 0 }}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Subscription Plans</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Manage and overview all available subscription tiers
                    </p>
                </div>
                <Button onClick={handleAddClick} className="gap-2">
                    <Plus size={16} />
                    Add New Plan
                </Button>
            </div>

            {/* Usage summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {plans.filter(p => p.isActive).map((p) => (
                    <Card key={p.id} className="border border-border shadow-sm">
                        <CardContent className="py-4 px-4">
                            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground font-semibold">{p.name}</p>
                            <p className="text-2xl font-extrabold mt-1 text-foreground">{planCounts[p.name] ?? 0}</p>
                            <p className="text-[0.65rem] text-muted-foreground mt-0.5">active subscriptions</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Separator />

            {/* Plans Table */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-foreground">Subscription Plans</h2>
                    <span className="text-xs text-muted-foreground">
                        {plans.filter(p => p.isActive).length} active plans
                    </span>
                </div>

                <Card className="border border-border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                <TableHead className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Status</TableHead>
                                <TableHead className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Plan Name</TableHead>
                                <TableHead className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Price</TableHead>
                                <TableHead className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Description</TableHead>
                                <TableHead className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Subscribers</TableHead>
                                <TableHead className="text-right text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {plans.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                                        No subscription plans added yet. Click "Add New Plan" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                plans.map((plan) => {
                                    const subscriberCount = planCounts[plan.name] ?? 0;
                                    return (
                                        <TableRow
                                            key={plan.id}
                                            className={cn("group hover:bg-muted/30 transition-colors", !plan.isActive && "opacity-50")}
                                        >
                                            {/* Status */}
                                            <TableCell className="py-4">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[0.65rem] font-semibold px-2 py-0.5",
                                                        plan.isActive
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : "bg-zinc-100 text-zinc-500 border-zinc-200"
                                                    )}
                                                >
                                                    {plan.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>

                                            {/* Plan Name */}
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm">{plan.name}</span>
                                                    {plan.popular && (
                                                        <Star size={12} className="text-amber-500 fill-amber-500" />
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Price */}
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold text-sm">GH₵{plan.price}</span>
                                                    <span className="text-xs text-muted-foreground">/mo</span>
                                                </div>
                                            </TableCell>

                                            {/* Description */}
                                            <TableCell className="py-4">
                                                <span className="text-xs text-muted-foreground max-w-[200px] truncate block">
                                                    {plan.description}
                                                </span>
                                            </TableCell>

                                            {/* Subscribers */}
                                            <TableCell className="py-4">
                                                <span className="text-sm font-medium">{subscriberCount}</span>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="py-4 text-right">
                                                <div className="flex gap-1 justify-end">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                size="xs"
                                                                variant="outline"
                                                                onClick={() => handleEditClick(plan)}
                                                                className="h-7 px-2.5 text-xs gap-1 border-border hover:border-primary/50"
                                                            >
                                                                <Pencil size={12} />
                                                                Edit
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Edit plan details</TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                size="xs"
                                                                variant="outline"
                                                                onClick={() => togglePlanStatus(plan.id)}
                                                                className={cn(
                                                                    "h-7 px-2.5 text-xs gap-1",
                                                                    plan.isActive
                                                                        ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                                                                        : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                                                )}
                                                            >
                                                                {plan.isActive ? <PowerOff size={12} /> : <Power size={12} />}
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {plan.isActive ? "Deactivate plan" : "Activate plan"}
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                size="xs"
                                                                variant="outline"
                                                                onClick={() => handleDelete(plan.id)}
                                                                className="h-7 px-2.5 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                                                            >
                                                                <Trash2 size={12} />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Delete plan</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{isAddMode ? "Add New Subscription Plan" : "Edit Subscription Plan"}</DialogTitle>
                        <DialogDescription>
                            {isAddMode
                                ? "Create a new subscription plan with custom pricing and features."
                                : "Update the subscription plan details and pricing."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Plan Name */}
                        <div className="grid gap-2">
                            <label htmlFor="name" className="text-sm font-medium">
                                Plan Name
                            </label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Basic, Standard, Premium"
                                className="col-span-2"
                            />
                        </div>

                        {/* Price */}
                        <div className="grid gap-2">
                            <label htmlFor="price" className="text-sm font-medium">
                                Monthly Price (GH₵)
                            </label>
                            <Input
                                id="price"
                                type="number"
                                value={formData.price}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, price: e.target.value })}
                                placeholder="e.g., 199"
                                min="0"
                                step="0.01"
                                className="col-span-2"
                            />
                        </div>

                        {/* Description */}
                        <div className="grid gap-2">
                            <label htmlFor="description" className="text-sm font-medium">
                                Description
                            </label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of what this plan offers..."
                                rows={2}
                                className="col-span-2"
                            />
                        </div>

                        {/* Features */}
                        <div className="grid gap-2">
                            <label htmlFor="features" className="text-sm font-medium">
                                Features (comma separated)
                            </label>
                            <Textarea
                                id="features"
                                value={formData.features}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, features: e.target.value })}
                                placeholder="e.g., 1 Vehicle, Real-time tracking, Email support"
                                rows={3}
                                className="col-span-2"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={!formData.name || !formData.price}>
                            {isAddMode ? "Create Plan" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

