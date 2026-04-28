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

export interface IndividualCustomer {
  id: string;
  name: string;
  phone: string;
  contact_person: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  initials: string;
  vehicle_count: number;
  total_owed: number;
  worst_priority: number; // 1=Suspended 2=Overdue 3=Due Soon 4=Active
}

export interface Company {
  id: string;
  company_name: string;
  billing_contact_name: string | null;
  contact_phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  tax_id: string | null;
  status: string;
  total_accounts: number;
  vehicle_count: number;
  total_owed: number;
  worst_priority: number;
}

// ── Individuals ───────────────────────────────────────────────────────────────

export const getIndividuals = () =>
  request<IndividualCustomer[]>('/api/customers/individuals');

export const createIndividual = (body: {
  name: string;
  phone: string;
  contact_person?: string;
  email?: string;
  address?: string;
  city?: string;
  postal_code?: string;
}) =>
  request<IndividualCustomer>('/api/customers/individuals', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateIndividual = (id: string, body: {
  name?: string;
  phone?: string;
  contact_person?: string;
  email?: string;
  address?: string;
  city?: string;
  postal_code?: string;
}) =>
  request<IndividualCustomer>(`/api/customers/individuals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const deleteIndividual = (id: string) =>
  request<void>(`/api/customers/individuals/${id}`, { method: 'DELETE' });

// ── Companies ─────────────────────────────────────────────────────────────────

export const getCompanies = () =>
  request<Company[]>('/api/customers/companies');

export const createCompany = (body: {
  company_name: string;
  billing_contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  tax_id?: string;
}) =>
  request<Company>('/api/customers/companies', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateCompany = (id: string, body: {
  company_name?: string;
  billing_contact_name?: string;
  contact_phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  tax_id?: string;
}) =>
  request<Company>(`/api/customers/companies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const deleteCompany = (id: string) =>
  request<void>(`/api/customers/companies/${id}`, { method: 'DELETE' });

// ── Customer vehicle subscriptions ────────────────────────────────────────────

export interface CustomerVehicle {
  id: string;
  plate_number: string;
  imei: string;
  plan: string;
  monthly_amount: number;
  expiry_date: string;
  installation_date: string | null;
  status: string;
  trakzee_status: 'Active' | 'Deactivated';
  sms_status: string | null;
  sms_sent_at: string | null;
  grace_period_days: number;
  updated_at: string;
}

export const getIndividualById = (id: string) =>
  request<IndividualCustomer>(`/api/customers/individuals/${id}`);

export const getIndividualSubscriptions = (id: string) =>
  request<CustomerVehicle[]>(`/api/customers/individuals/${id}/subscriptions`);

export const getCompanyById = (id: string) =>
  request<Company>(`/api/customers/companies/${id}`);

export const getCompanySubscriptions = (id: string) =>
  request<CustomerVehicle[]>(`/api/customers/companies/${id}/subscriptions`);
