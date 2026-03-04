"use client"

import React, { useState, useRef } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

type CustomerPayload = {
  customerName: string
  phone: string
  email?: string
  status?: "Active" | "Due Soon" | "Overdue" | "Suspended"
  plan?: string
  monthlyAmount?: string
}

type CustomerRecord = {
  id: string
  customerName: string
  phone: string
  email?: string
  status: "Active" | "Due Soon" | "Overdue" | "Suspended"
  createdAt: string
}

type CreatePayload = CustomerRecord

export default function AddCustomerForm({ onCreated }: { onCreated?: (d: CreatePayload) => void }) {
  const form = useForm<CustomerPayload>({
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      status: "Active",
      plan: "",
      monthlyAmount: "",
    },
  })

  const [submitting, setSubmitting] = useState(false)
  const idCounter = useRef<number>(1)

  const onSubmit = (values: CustomerPayload) => {
    setSubmitting(true)
    const id = `CUST-${idCounter.current++}`
    const createdAt = new Date().toISOString()

    const customer: CustomerRecord = {
      id,
      customerName: values.customerName,
      phone: values.phone,
      email: values.email,
      status: (values.status ?? "Active") as CustomerRecord["status"],
      createdAt,
    }

    // Simulate local create while API is unavailable
    const payload: CreatePayload = customer
    console.log("AddCustomerForm submit:", payload)
    onCreated?.(payload)

    // small delay to mimic processing
    setTimeout(() => {
      setSubmitting(false)
      form.reset()
    }, 350)
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => form.handleSubmit(onSubmit)(e)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="Full name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="+27 61 234 5678" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (optional)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="name@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="plan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plan</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Basic">Basic</SelectItem>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Premium">Premium</SelectItem>
                      <SelectItem value="Fleet">Fleet</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="monthlyAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Amount (optional)</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} type="number" placeholder="0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        

        <div className="flex items-center justify-end gap-2">
          <Button type="submit" className="gap-2" disabled={submitting}>
            {submitting ? "Saving…" : "Create Customer"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
