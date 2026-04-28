"use client"

import React, { useState } from "react"
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
import { createIndividual } from "@/lib/customers-api"

type CustomerPayload = {
  clientName: string
  contactPerson: string
  telephone: string
  email: string
  address: string
  city: string
  postalCode: string
}

export default function AddCustomerForm({ onCreated }: { onCreated?: () => void }) {
  const form = useForm<CustomerPayload>({
    defaultValues: {
      clientName: "",
      contactPerson: "",
      telephone: "",
      email: "",
      address: "",
      city: "",
      postalCode: "",
    },
  })

  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const onSubmit = async (values: CustomerPayload) => {
    setSubmitting(true)
    setApiError(null)
    try {
      await createIndividual({
        name: values.clientName,
        phone: values.telephone,
        contact_person: values.contactPerson || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        city: values.city || undefined,
        postal_code: values.postalCode || undefined,
      })
      form.reset()
      onCreated?.()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to create customer.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => form.handleSubmit(onSubmit)(e)} className="space-y-4">
        {apiError && (
          <p className="text-sm text-destructive font-medium">{apiError}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="clientName"
            rules={{ required: "Client name is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Name</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="Full name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactPerson"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="Contact person" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="telephone"
            rules={{ required: "Telephone is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telephone</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="+233 24 000 0000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="name@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} placeholder="Street address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="City" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal Code</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="00000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="submit" className="gap-2" disabled={submitting}>
            {submitting ? "Saving…" : "Create Individual"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
