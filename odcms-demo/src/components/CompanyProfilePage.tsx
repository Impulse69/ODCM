"use client"

import React, { useState, useEffect } from "react"
import {
  getCompanyById,
  getCompanySubscriptions,
  updateCompany,
  type Company,
  type CustomerVehicle,
} from "@/lib/customers-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const statusColors: Record<string, string> = {
  Active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Due Soon":"bg-amber-50 text-amber-700 border-amber-200",
  Expired:   "bg-red-50 text-red-700 border-red-200",
  Overdue:   "bg-red-50 text-red-700 border-red-200",
  Suspended: "bg-zinc-100 text-zinc-500 border-zinc-200",
}

function computeStatus(expiryDate: string, backendStatus: string) {
  if (backendStatus === "Suspended") return "Suspended"
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  if (expiry < today) return "Expired"
  const twoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
  if (expiry <= twoWeeks) return "Due Soon"
  return "Active"
}

type Props = { id: string }

export default function CompanyProfilePage({ id }: Props) {
  const [company,  setCompany]  = useState<Company | null>(null)
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([])
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [contact,  setContact]  = useState("")
  const [email,    setEmail]    = useState("")
  const [address,  setAddress]  = useState("")
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    Promise.all([getCompanyById(id), getCompanySubscriptions(id)])
      .then(([co, vehs]) => {
        setCompany(co)
        setVehicles(vehs)
        setContact(co.contact_phone ?? "")
        setEmail(co.email ?? "")
        setAddress(co.address ?? "")
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    if (!company) return
    setSaving(true)
    try {
      const updated = await updateCompany(company.id, { contact_phone: contact, email, address })
      setCompany((prev) => prev ? { ...prev, ...updated } : prev)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading)  return <p className="p-6 text-sm text-muted-foreground">Loading…</p>
  if (notFound) return <p className="p-6 text-sm text-muted-foreground">Company not found.</p>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{company?.company_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contact info */}
          <div className="flex items-start justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Billing Contact</p>
                <p className="font-semibold text-sm">{company?.billing_contact_name || "—"}</p>
              </div>
              {editing ? (
                <>
                  <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone" className="h-8 text-sm" />
                  <Input value={email}   onChange={(e) => setEmail(e.target.value)}   placeholder="Email" className="h-8 text-sm" />
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" className="h-8 text-sm sm:col-span-3" />
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Phone</p>
                    <p className="font-semibold text-sm">{company?.contact_phone || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Email</p>
                    <p className="font-semibold text-sm">{company?.email || "—"}</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 shrink-0 self-start">
              {editing && (
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setEditing((e) => !e)}>
                {editing ? "Cancel" : "Edit Details"}
              </Button>
            </div>
          </div>

          {/* Vehicles table */}
          <div>
            <p className="text-sm font-bold mb-2">Vehicles & Subscriptions ({vehicles.length})</p>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Plate</TableHead>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((v) => {
                      const cs = computeStatus(v.expiry_date, v.status)
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-semibold">{v.plate_number}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{v.imei}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[0.65rem] bg-orange-50 text-orange-700 border-orange-200">
                              {v.plan}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(v.expiry_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[0.65rem] ${statusColors[cs] ?? ""}`}>{cs}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            GH? {Number(v.monthly_amount).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {vehicles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-xs text-muted-foreground text-center py-8">
                          No vehicles registered for this company.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
