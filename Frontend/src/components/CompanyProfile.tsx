"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Phone, Mail, Car, Hash, TrendingDown } from "lucide-react";
import {
  getCompanyById,
  getCompanySubscriptions,
  type Company,
  type CustomerVehicle,
} from "@/lib/customers-api";
import { computeStatus, calculateOwed } from "@/lib/vehicle-status";
import { getPlans, type Plan } from "@/lib/plans-api";
import { cn } from "@/lib/utils";

function getMonthsDiff(start: string | null, end: string | null) {
  if (!start || !end) return 1;
  const d1 = new Date(start);
  const d2 = new Date(end);
  let months = (d2.getFullYear() - d1.getFullYear()) * 12;
  months -= d1.getMonth();
  months += d2.getMonth();
  return months <= 0 ? 1 : months;
}

type CompanyProfileProps = {
  id: string;
  onClose?: () => void;
};

export default function CompanyProfile({ id, onClose }: CompanyProfileProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    if (id) {
      let isMounted = true;
      Promise.all([
        getCompanyById(id),
        getCompanySubscriptions(id),
        getPlans()
      ]).then(([comp, vehs, allPlans]) => {
        if (!isMounted) return;
        setCompany(comp);
        setVehicles(vehs);
        setPlans(allPlans);
        setLoading(false);
      });
      return () => { isMounted = false; };
    }
  }, [id]);

  const activeCount    = vehicles.filter((v) => computeStatus(v.expiry_date, v.status) === "Active").length;
  const dueSoonCount   = vehicles.filter((v) => computeStatus(v.expiry_date, v.status) === "Due Soon").length;
  const expiredCount   = vehicles.filter((v) => computeStatus(v.expiry_date, v.status) === "Expired").length;
  const suspendedCount = vehicles.filter((v) => computeStatus(v.expiry_date, v.status) === "Suspended").length;
  
  const owingAmount = vehicles.reduce((sum, v) => {
    const planPrice = plans.find(p => p.name === v.plan)?.price || v.monthly_amount;
    return sum + calculateOwed(v.expiry_date, Number(planPrice), v.trakzee_status);
  }, 0);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose?.(); }}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[95vh] h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-linear-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Building2 size={14} className="text-white" />
            </div>
            {company?.company_name ?? "—"}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
          ) : (
            <>
              {/* Company Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">Billing Contact</p>
                  <p className="font-semibold text-sm mt-1 truncate">{company?.billing_contact_name ?? "—"}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">Telephone</p>
                  <p className="text-sm font-semibold flex items-center gap-1.5 mt-1 truncate">
                    <Phone size={11} className="text-muted-foreground" /> {company?.contact_phone ?? "—"}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-red-600">
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">Total Arrears</p>
                  <p className="font-black text-sm flex items-center gap-1.5 mt-1 tabular-nums">
                    <TrendingDown size={12} /> GH₵{owingAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">Email</p>
                  <p className="text-[0.7rem] flex items-center gap-1.5 mt-1 truncate text-muted-foreground">
                    <Mail size={11} /> {company?.email ?? "—"}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">Tax ID</p>
                  <p className="text-sm flex items-center gap-1.5 mt-1">
                    <Hash size={11} /> {company?.tax_id ?? "—"}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">Vehicles</p>
                  <p className="font-bold text-sm flex items-center gap-1.5 mt-1">
                    <Car size={11} /> {vehicles.length}
                  </p>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="grid grid-cols-4 lg:grid-cols-4 gap-2">
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">
                  <p className="text-[0.6rem] uppercase tracking-widest text-emerald-700 font-semibold">Active</p>
                  <p className="text-xl font-black text-emerald-700 leading-none mt-1">{activeCount}</p>
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center">
                  <p className="text-[0.6rem] uppercase tracking-widest text-amber-700 font-semibold">Due Soon</p>
                  <p className="text-xl font-black text-amber-700 leading-none mt-1">{dueSoonCount}</p>
                </div>
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center">
                  <p className="text-[0.6rem] uppercase tracking-widest text-red-700 font-semibold">Expired</p>
                  <p className="text-xl font-black text-red-700 leading-none mt-1">{expiredCount}</p>
                </div>
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-center">
                  <p className="text-[0.6rem] uppercase tracking-widest text-zinc-500 font-semibold">Suspended</p>
                  <p className="text-xl font-black text-zinc-500 leading-none mt-1">{suspendedCount}</p>
                </div>
              </div>

              {/* Vehicles table */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold tracking-tight">Fleet Billing & Trakzee Status</p>
                  <p className="text-xs text-muted-foreground">{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="rounded-lg border border-border overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Vehicle</th>
                          <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-red-600">Arrears</th>
                          <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Trakzee</th>
                          <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Expiry</th>
                          <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                          <th className="px-4 py-2.5 text-right text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Total Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {vehicles.map((v) => {
                          const cs = computeStatus(v.expiry_date, v.status);
                          const planPrice = plans.find(p => p.name === v.plan)?.price || v.monthly_amount;
                          const owed = calculateOwed(v.expiry_date, Number(planPrice), v.trakzee_status);
                          
                          return (
                            <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <p className="font-bold text-sm text-foreground">{v.plate_number}</p>
                                <p className="text-[0.6rem] text-muted-foreground uppercase tracking-tight">{v.plan} • {v.imei}</p>
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                {owed > 0 ? (
                                  <span className="text-sm font-black text-red-600 tabular-nums">GH₵{owed.toLocaleString()}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <Badge variant="outline" className={cn(
                                  "text-[0.6rem] font-black uppercase tracking-widest px-2 py-0.5 border-2",
                                  v.trakzee_status === "Active" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-zinc-50 text-zinc-500 border-zinc-200"
                                )}>
                                  {v.trakzee_status}
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap text-xs font-semibold text-muted-foreground">
                                {new Date(v.expiry_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                {(() => {
                                  const label = (cs === "Removed" || cs === "Expired") ? "EXPIRED" : cs.toUpperCase();
                                  const color = (cs === "Removed" || cs === "Expired") ? "bg-red-600 border-red-600" : (cs === "Due Soon" ? "bg-amber-500 border-amber-500" : "bg-emerald-600 border-emerald-600");
                                  return (
                                    <Badge variant="outline" className={cn("text-[0.6rem] font-black text-white shadow-sm", color)}>
                                      {label}
                                    </Badge>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap font-bold text-sm text-foreground/80">
                                GH₵ {(getMonthsDiff(v.installation_date, v.expiry_date) * Number(v.monthly_amount)).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                        {vehicles.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-sm text-center text-muted-foreground">
                              No vehicles registered for this company.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border shrink-0 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
