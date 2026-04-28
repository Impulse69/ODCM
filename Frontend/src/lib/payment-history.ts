// Payment history — persists to the backend DB; localStorage used as offline fallback.

import { getAuthToken } from './auth-context';
import { getApiBase } from './api-base';

const BASE = getApiBase();
export const PAYMENT_HISTORY_KEY = "odcms-payment-history";

export interface PaymentRecord {
    id: string;
    vehicleId: string;
    vehiclePlate: string;
    ownerName: string;
    ownerType: "individual" | "company";
    planName?: string;
    year: number;
    months: number;
    amountGhs: number;
    paidAt: string; // ISO date string
}

// Fetch all payment records from the backend (falls back to localStorage if offline)
export async function getPayments(vehicleId?: string): Promise<PaymentRecord[]> {
    try {
        const url = vehicleId
            ? `${BASE}/api/payments?vehicle_id=${encodeURIComponent(vehicleId)}`
            : `${BASE}/api/payments`;
        const token = getAuthToken();
        const res = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        // normalise snake_case → camelCase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (json.data as any[]).map(rowToRecord);
    } catch {
        // offline: fall back to localStorage
        try {
            const raw = localStorage.getItem(PAYMENT_HISTORY_KEY);
            const list: PaymentRecord[] = raw ? JSON.parse(raw) : [];
            return vehicleId ? list.filter((p) => p.vehicleId === vehicleId) : list;
        } catch {
            return [];
        }
    }
}

// Save a payment — persists to DB + localStorage, fires the notification event
export async function savePayment(record: Omit<PaymentRecord, "id">): Promise<PaymentRecord> {
    const entry: PaymentRecord = {
        ...record,
        id: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        paidAt: record.paidAt || new Date().toISOString(),
    };

    // 1. Persist to backend (non-blocking — best effort)
    const token = getAuthToken();
    fetch(`${BASE}/api/payments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            id:            entry.id,
            vehicle_id:    entry.vehicleId,
            vehicle_plate: entry.vehiclePlate,
            owner_name:    entry.ownerName,
            owner_type:    entry.ownerType,
            plan_name:     entry.planName,
            year:          entry.year,
            months:        entry.months,
            amount_ghs:    entry.amountGhs,
            paid_at:       entry.paidAt,
        }),
    }).catch(() => { /* ignore network errors */ });

    // 2. Also store in localStorage so PaymentHistoryView works offline
    try {
        const existing = localStorage.getItem(PAYMENT_HISTORY_KEY);
        const list: PaymentRecord[] = existing ? JSON.parse(existing) : [];
        list.unshift(entry);
        localStorage.setItem(PAYMENT_HISTORY_KEY, JSON.stringify(list));
        window.dispatchEvent(new Event("payment-recorded"));
    } catch {
        // localStorage unavailable (SSR or private mode)
    }

    return entry;
}

// Fetch monthly revenue summary from the backend
export async function getRevenueSummary(months = 12): Promise<{ month: string; total: number }[]> {
    try {
        const token = getAuthToken();
        const res = await fetch(`${BASE}/api/payments/revenue?months=${months}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        return (json.data as { month: string; total: string }[]).map(r => ({
            month: r.month,
            total: parseFloat(r.total as string),
        }));
    } catch {
        return [];
    }
}

// ── Internal helper ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToRecord(row: any): PaymentRecord {
    return {
        id:           row.id,
        vehicleId:    row.vehicle_id,
        vehiclePlate: row.vehicle_plate,
        ownerName:    row.owner_name,
        ownerType:    row.owner_type,
        planName:     row.plan_name ?? undefined,
        year:         row.year,
        months:       row.months,
        amountGhs:    parseFloat(row.amount_ghs),
        paidAt:       row.paid_at ?? row.created_at,
    };
}

