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
import { Building2, Phone, Mail, MapPin, Car, Hash, TrendingDown, AlertTriangle } from "lucide-react";
import {
  getCompanyById,
  getCompanySubscriptions,
  type Company,
  type CustomerVehicle,
} from "@/lib/customers-api";

type CompanyProfileProps = {
  id: string;
  onClose?: () => void;
};

const statusColors: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Due Soon": "bg-amber-50 text-amber-700 border-amber-200",
  Expired: "bg-red-50 text-red-700 border-red-200",
  Overdue: "bg-red-50 text-red-700 border-red-200",
  Suspended: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

function computeStatus(expiryDate: string, backendStatus: string): string {
  if (backendStatus === "Suspended") return "Suspended";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  if (expiry < today) return "Expired";
  const twoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (expiry <= twoWeeks) return "Due Soon";
  return "Active";
}

export default function CompanyProfile({ id, onClose }: CompanyProfileProps) {
  const [company, setCompany] = useState<Company | null>(null);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCompanyById(id), getCompanySubscriptions(id)])
      .then(([co, vehs]) => {
        setCompany(co);
        setVehicles(vehs);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const activeCount    = vehicles.filter((v) => computeStatus(v.expiry_date, v.status) === "Active").length;
  const dueSoonCount   = vehicles.filter((v) => computeStatus(v.expiry_date, v.status) === "Due Soon").length;
  const expiredCount   = vehicles.filter((v) => computeStatus(v.expiry_date, v.status) === "Expired").length;
  const suspendedCount = vehicles.filter((v) => computeStatus(v.expiry_date, v.status) === "Suspended").length;
  const owingAmount    = vehicles
    .filter((v) => computeStatus(v.expiry_date, v.status) !== "Active")
    .reduce((sum, v) => sum + (Number(v.monthly_amount) || 0), 0);

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
              {/* Company summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">Billing Contact</p>
                  <p className="font-semibold text-sm mt-1 truncate">{company?.billing_contact_name ?? "—"}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">Telephone</p>
                  <p className="text-sm flex items-center gap-1.5 mt-1 truncate">
                    <Phone size={11} className="text-muted-foreground shrink-0" /> {company?.contact_phone ?? "—"}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">Email</p>
                  <p className="text-sm flex items-center gap-1.5 mt-1 truncate">
                    <Mail size={11} className="text-muted-foreground shrink-0" /> {company?.email ?? "—"}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">Address</p>
                  <p className="text-sm flex items-center gap-1.5 mt-1 truncate">
                    <MapPin size={11} className="text-muted-foreground shrink-0" /> {company?.address ?? "—"}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">Tax / VAT ID</p>
                  <p className="text-sm flex items-center gap-1.5 mt-1">
                    <Hash size={11} className="text-muted-foreground shrink-0" /> {company?.tax_id ?? "—"}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-semibold">Vehicles</p>
                  <p className="font-bold text-sm flex items-center gap-1.5 mt-1">
                    <Car size={11} className="text-muted-foreground shrink-0" /> {vehicles.length}
                  </p>
                </div>
              </div>

              {/* KPI cards — status breakdown + amount owing */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-emerald-700 font-semibold">Active</p>
                  <p className="text-2xl font-extrabold text-emerald-700 leading-none mt-1">{activeCount}</p>
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-amber-700 font-semibold">Due Soon</p>
                  <p className="text-2xl font-extrabold text-amber-700 leading-none mt-1">{dueSoonCount}</p>
                </div>
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-red-700 font-semibold">Expired</p>
                  <p className="text-2xl font-extrabold text-red-700 leading-none mt-1">{expiredCount}</p>
                </div>
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-zinc-500 font-semibold">Suspended</p>
                  <p className="text-2xl font-extrabold text-zinc-500 leading-none mt-1">{suspendedCount}</p>
                </div>
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2">
                  <p className="text-[0.6rem] uppercase tracking-widest text-red-700 font-semibold flex items-center gap-1">
                    <AlertTriangle size={9} /> Amount Owing
                  </p>
                  <p className="text-lg font-extrabold text-red-600 leading-none mt-1">
                    GH₵{owingAmount.toLocaleString()}
                  </p>
                  <p className="text-[0.6rem] text-red-400 mt-0.5 flex items-center gap-1">
                    <TrendingDown size={9} /> {vehicles.length - activeCount} vehicle{vehicles.length - activeCount !== 1 ? "s" : ""} owing
                  </p>
                </div>
              </div>

              {/* Vehicles table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold tracking-tight">Fleet Vehicles & Plans</p>
                  <p className="text-xs text-muted-foreground">{vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Plate Number</th>
                          <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">IMEI</th>
                          <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Plan</th>
                          <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Expiry</th>
                          <th className="px-4 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Status</th>
                          <th className="px-4 py-2.5 text-right text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {vehicles.map((v) => (
                          <tr key={v.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 whitespace-nowrap font-semibold text-sm">{v.plate_number}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs text-muted-foreground">{v.imei}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <Badge variant="outline" className="text-[0.65rem] font-semibold bg-orange-50 text-orange-700 border-orange-200">
                                {v.plan}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-sm text-muted-foreground">
                              {new Date(v.expiry_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {(() => {
                                const cs = computeStatus(v.expiry_date, v.status);
                                return (
                                  <Badge variant="outline" className={`text-[0.65rem] font-semibold ${statusColors[cs] ?? ""}`}>
                                    {cs}
                                  </Badge>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap font-semibold text-sm">
                              GH₵ {Number(v.monthly_amount).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {vehicles.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-sm text-center text-muted-foreground">
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
