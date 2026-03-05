"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  subscriptions,
  type Subscription,
  type SubscriptionStatus,
} from "@/data/dummy";
import { User, Phone, Car, MapPin, Pencil, Save, X } from "lucide-react";

type IndividualProfileProps = {
  name: string;
  onClose?: () => void;
};

type EditableVehicle = Subscription & { dirty?: boolean };

const statusColors: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Due Soon": "bg-amber-50 text-amber-700 border-amber-200",
  Overdue: "bg-red-50 text-red-700 border-red-200",
  Suspended: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const planOptions = ["Basic", "Standard", "Premium"];
const statusOptions: SubscriptionStatus[] = [
  "Active",
  "Due Soon",
  "Overdue",
  "Suspended",
];

export default function IndividualProfile({
  name,
  onClose,
}: IndividualProfileProps) {
  const source = subscriptions.filter((s) => s.customerName === name);
  const [vehicles, setVehicles] = useState<EditableVehicle[]>(() =>
    source.map((v) => ({ ...v })),
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  const customer = source[0];
  const totalMonthly = vehicles.reduce((sum, v) => sum + v.monthlyAmount, 0);

  const updateField = (
    id: string,
    field: keyof Subscription,
    value: string | number,
  ) => {
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === id ? { ...v, [field]: value, dirty: true } : v,
      ),
    );
  };

  const handleSave = (id: string) => {
    const vehicle = vehicles.find((v) => v.id === id);
    if (vehicle) {
      console.log("Save vehicle:", vehicle);
    }
    setEditingId(null);
  };

  const handleCancel = () => {
    setVehicles(source.map((v) => ({ ...v })));
    setEditingId(null);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <DialogContent className="max-w-6xl w-[96vw] max-h-[95vh] h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            {name}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {/* Customer summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">
                Telephone
              </p>
              <p className="font-semibold text-sm flex items-center gap-1.5 mt-1">
                <Phone size={12} className="text-muted-foreground" />{" "}
                {customer?.phone ?? "-"}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">
                Vehicles
              </p>
              <p className="font-semibold text-sm flex items-center gap-1.5 mt-1">
                <Car size={12} className="text-muted-foreground" />{" "}
                {vehicles.length}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">
                Total Amount Owed
              </p>
              <p className="font-bold text-sm mt-1">GH₵ {totalMonthly}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
              <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">
                Address
              </p>
              <p className="text-sm flex items-center gap-1.5 mt-1 text-muted-foreground">
                <MapPin size={12} /> —
              </p>
            </div>
          </div>

          {/* Vehicles table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold tracking-tight">
                Vehicles & Plans
              </p>
              <p className="text-xs text-muted-foreground">
                {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                        Plate Number
                      </th>
                      <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                        IMEI
                      </th>
                      <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                        Plan
                      </th>
                      <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                        Expiry
                      </th>
                      <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-2.5 text-right text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                        Amount
                      </th>
                      <th className="px-3 py-2.5 w-18" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {vehicles.map((v) => {
                      const isEditing = editingId === v.id;
                      return (
                        <tr
                          key={v.id}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {isEditing ? (
                              <Input
                                value={v.plateNumber}
                                onChange={(e) =>
                                  updateField(
                                    v.id,
                                    "plateNumber",
                                    e.target.value,
                                  )
                                }
                                className="h-8 text-xs w-32"
                              />
                            ) : (
                              <span className="font-semibold text-sm">
                                {v.plateNumber}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {isEditing ? (
                              <Input
                                value={v.imei}
                                onChange={(e) =>
                                  updateField(v.id, "imei", e.target.value)
                                }
                                className="h-8 text-xs w-40 font-mono"
                              />
                            ) : (
                              <span className="font-mono text-xs text-muted-foreground">
                                {v.imei}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {isEditing ? (
                              <Select
                                value={v.plan}
                                onValueChange={(val) =>
                                  updateField(v.id, "plan", val)
                                }
                              >
                                <SelectTrigger className="h-8 text-xs w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {planOptions.map((p) => (
                                    <SelectItem key={p} value={p}>
                                      {p}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[0.65rem] font-semibold bg-orange-50 text-orange-700 border-orange-200"
                              >
                                {v.plan}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {isEditing ? (
                              <Input
                                type="date"
                                value={v.expiryDate}
                                onChange={(e) =>
                                  updateField(
                                    v.id,
                                    "expiryDate",
                                    e.target.value,
                                  )
                                }
                                className="h-8 text-xs w-36"
                              />
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {v.expiryDate}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            {isEditing ? (
                              <Select
                                value={v.status}
                                onValueChange={(val) =>
                                  updateField(v.id, "status", val)
                                }
                              >
                                <SelectTrigger className="h-8 text-xs w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {statusOptions.map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {s}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                variant="outline"
                                className={`text-[0.65rem] font-semibold ${statusColors[v.status] ?? ""}`}
                              >
                                {v.status}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            {isEditing ? (
                              <Input
                                type="number"
                                value={v.monthlyAmount}
                                onChange={(e) =>
                                  updateField(
                                    v.id,
                                    "monthlyAmount",
                                    Number(e.target.value),
                                  )
                                }
                                className="h-8 text-xs w-24 ml-auto"
                              />
                            ) : (
                              <span className="font-semibold text-sm">
                                GH₵ {v.monthlyAmount}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                                  onClick={() => handleSave(v.id)}
                                >
                                  <Save size={13} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-600"
                                  onClick={handleCancel}
                                >
                                  <X size={13} />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => setEditingId(v.id)}
                              >
                                <Pencil size={13} />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {vehicles.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-sm text-center text-muted-foreground"
                        >
                          No vehicles registered for this customer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border shrink-0 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
