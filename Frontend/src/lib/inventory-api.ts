import { getAuthToken } from './auth-context';
import { getApiBase } from './api-base';

const BASE = getApiBase();

function handleUnauthorized() {
  if (typeof window === 'undefined') return;
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryCategory {
  id: number;
  name: string;
  created_at: string;
}

export interface InventoryType {
  id: number;
  category_name: string;
  name: string;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  category: string;
  imei_number: string;
  type: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryUsage {
  id: number;
  inventory_id: number;
  category: string;
  imei_number: string;
  type: string;
  installed_by: string;
  quantity_used: number;
  used_at: string;
}

export interface AddItemPayload {
  category: string;
  imei_number: string;
  type: string;
  quantity: number;
}

export interface UseItemPayload {
  inventory_id: number;
  installed_by: string;
  quantity_used: number;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const getInventoryCategories = () =>
  request<InventoryCategory[]>('/api/inventory/categories');

export const addInventoryCategory = (name: string) =>
  request<InventoryCategory>('/api/inventory/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

export const removeInventoryCategory = (id: number) =>
  request<void>(`/api/inventory/categories/${id}`, { method: 'DELETE' });

// ─── Types ────────────────────────────────────────────────────────────────────

export const getInventoryTypes = () =>
  request<InventoryType[]>('/api/inventory/types');

export const addInventoryType = (category_name: string, name: string) =>
  request<InventoryType>('/api/inventory/types', {
    method: 'POST',
    body: JSON.stringify({ category_name, name }),
  });

export const removeInventoryType = (id: number) =>
  request<void>(`/api/inventory/types/${id}`, { method: 'DELETE' });

// ─── Inventory Items ──────────────────────────────────────────────────────────

export const getInventoryItems = () =>
  request<InventoryItem[]>('/api/inventory');

export const addInventoryItem = (payload: AddItemPayload) =>
  request<InventoryItem>('/api/inventory', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const editInventoryItem = (id: number, payload: Partial<AddItemPayload>) =>
  request<InventoryItem>(`/api/inventory/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const removeInventoryItem = (id: number) =>
  request<void>(`/api/inventory/${id}`, { method: 'DELETE' });

// ─── Usage History ────────────────────────────────────────────────────────────

export const recordInventoryUsage = (payload: UseItemPayload) =>
  request<InventoryUsage>('/api/inventory/use', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getInventoryUsageHistory = () =>
  request<InventoryUsage[]>('/api/inventory/usage-history');
