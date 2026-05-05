import { getAuthToken } from './auth-context';
import { getApiBase } from './api-base';

const BASE = getApiBase();

function handleUnauthorized() {
  localStorage.removeItem('odcms_auth_user');
  localStorage.removeItem('odcms_auth_token');
  document.cookie = 'odcms_auth_token=; path=/; max-age=0; SameSite=Strict';
  window.location.replace('/login');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) { handleUnauthorized(); throw new Error('Session expired'); }
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'API error');
  return json.data as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  plate_number: string;
  imei: string;
  sim_imei: string | null;
  sim_number?: string | null;
  plan: string;
  monthly_amount: number;
  expiry_date: string;
  installation_date: string | null;
  installation_location: string | null;
  status: string;
  trakzee_status: 'Active' | 'Deactivated';
  individual_customer_id: string | null;
  company_id: string | null;
  customer_name: string;
  phone: string;
  sms_status: 'Sent' | 'Failed' | null;
  sms_sent_at: string | null;
  last_sms_type: 'due_soon' | 'expired' | null;
  grace_period_days: number;
  updated_at: string;
}

export interface AddVehiclePayload {
  plate_number: string;
  imei: string;
  inventory_id?: number;
  sim_inventory_id?: number;
  sim_imei?: string;
  sim_number?: string;
  owner_name: string;
  plan: string;
  expiry_date: string;
  installation_date?: string;
  installation_location: string;
  status?: string;
  trakzee_status?: 'Active' | 'Deactivated';
  individual_customer_id?: string;
  company_id?: string;
}

// ── API Functions ─────────────────────────────────────────────────────────────

export const getVehicles = () =>
  request<Vehicle[]>('/api/vehicles');

export const addVehicle = (body: AddVehiclePayload) =>
  request<Vehicle>('/api/vehicles', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateTrakzee = (id: string, trakzee_status: 'Active' | 'Deactivated') =>
  request<Vehicle>(`/api/vehicles/${id}/trakzee`, {
    method: 'PATCH',
    body: JSON.stringify({ trakzee_status }),
  });

export const updateVehicleExpiry = (id: string, expiry_date: string) =>
  request<Vehicle>(`/api/vehicles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ expiry_date, status: 'Active' }),
  });

export const updateVehicle = (id: string, body: Partial<AddVehiclePayload>) =>
  request<Vehicle>(`/api/vehicles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const deleteVehicle = (id: string) =>
  request<void>(`/api/vehicles/${id}`, { method: 'DELETE' });

export const getRemovedVehicles = () =>
  request<Vehicle[]>('/api/vehicles/removed');

export const restoreVehicle = (id: string) =>
  request<Vehicle>(`/api/vehicles/${id}/restore`, { method: 'PATCH' });
