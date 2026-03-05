"use client"

import React, { useState } from "react"
import { companies, subscriptions } from "@/data/dummy"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

type Props = { id: string }

export default function CompanyProfilePage({ id }: Props) {
  const company = companies.find((c) => c.id === id)
  const vehicles = subscriptions.filter((s) => s.customerName === (company?.companyName ?? ""))

  const [editing, setEditing] = useState(false)
  const [contact, setContact] = useState(company?.contactPhone ?? "")
  const [email, setEmail] = useState(company?.email ?? "")
  const [address, setAddress] = useState(company?.address ?? "")

  if (!company) return <div>Company not found</div>

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{company.companyName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Billing Contact</p>
              <p className="font-semibold">{company.billingContactName ?? "-"}</p>
            </div>
            <div>
              <Button size="sm" onClick={() => setEditing((e) => !e)}>{editing ? "Cancel" : "Edit Details"}</Button>
            </div>
          </div>

          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone" />
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" />
              <div className="sm:col-span-3 flex justify-end mt-2">
                <Button onClick={() => { console.log('Save company', { id, contact, email, address }); setEditing(false); }}>Save</Button>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground mb-2">Vehicles & Subscriptions</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.plateNumber}</TableCell>
                    <TableCell>{v.imei}</TableCell>
                    <TableCell>{v.plan}</TableCell>
                    <TableCell>{v.expiryDate}</TableCell>
                    <TableCell className="text-right">GH₵ {v.monthlyAmount}</TableCell>
                  </TableRow>
                ))}
                {vehicles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-xs text-muted-foreground">No vehicles found for this company.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
