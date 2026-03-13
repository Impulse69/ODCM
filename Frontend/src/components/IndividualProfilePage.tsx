"use client"

import React, { useState, useEffect } from "react"
import {
  getIndividuals,
  getIndividualSubscriptions,
  updateIndividual,
  type IndividualCustomer,
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
import { computeStatus } from "@/lib/vehicle-status"

const statusColors: Record<string, string> = {
  Active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Due Soon":"bg-amber-50 text-amber-700 border-amber-200",
  Expired:   "bg-red-50 text-red-700 border-red-200",
  Overdue:   "bg-red-50 text-red-700 border-red-200",
  Suspended: "bg-zinc-100 text-zinc-500 border-zinc-200",
}

type Props = { name: string }

export default function IndividualProfilePage({ name }: Props) {
  const [customer,  setCustomer]  = useState<IndividualCustomer | null>(null)
  const [vehicles,  setVehicles]  = useState<CustomerVehicle[]>([])
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)
  const [editing,   setEditing]   = useState(false)
  const [phone,     setPhone]     = useState("")
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    getIndividuals()
      .then(async (list) => {
        const found = list.find((c) => c.name === name)
        if (!found) { setNotFound(true); return }
        setCustomer(found)
        setPhone(found.phone)
        const vehs = await getIndividualSubscriptions(found.id)
        setVehicles(vehs)
      })
      .finally(() => setLoading(false))
  }, [name])

  const handleSave = async () => {
    if (!customer) return
    setSaving(true)
    try {
      const updated = await updateIndividual(customer.id, { phone })
      setCustomer((prev) => prev ? { ...prev, phone: updated.phone } : prev)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading)  return <p className="p-6 text-sm text-muted-foreground">Loading�</p>
  if (notFound) return <p className="p-6 text-sm text-muted-foreground">Customer not found.</p>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{customer?.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contact info */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Phone</p>
              {editing ? (
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="h-8 text-sm" />
              ) : (
                <p className="font-semibold text-sm">{customer?.phone || "�"}</p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              {editing && (
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving�" : "Save"}
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
                      <TableHead>SMS</TableHead>
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
                          <TableCell>
                            {v.sms_status === 'Sent' ? (
                              <Badge variant="outline" className="text-[0.65rem] bg-emerald-50 text-emerald-700 border-emerald-200">✓ Sent</Badge>
                            ) : v.sms_status === 'Failed' ? (
                              <Badge variant="outline" className="text-[0.65rem] bg-red-50 text-red-700 border-red-200">✕ Failed</Badge>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            GH? {Number(v.monthly_amount).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {vehicles.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-xs text-muted-foreground text-center py-8">
                          No vehicles registered for this customer.
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
