import { getAuthToken } from './auth-context';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

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
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'API error');
  return json.data as T;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular: boolean;
  is_active: boolean;
  subscriber_count: number;
  created_at: string;
  updated_at: string;
}

export type CreatePlanPayload = {
  name: string;
  price: number;
  description?: string;
  features?: string[];
  popular?: boolean;
  is_active?: boolean;
};

export type UpdatePlanPayload = Partial<CreatePlanPayload>;

export const getPlans  = () => request<Plan[]>('/api/plans');
export const getPlan   = (id: string) => request<Plan>(`/api/plans/${id}`);

export const createPlan = (body: CreatePlanPayload) =>
  request<Plan>('/api/plans', { method: 'POST', body: JSON.stringify(body) });

export const updatePlan = (id: string, body: UpdatePlanPayload) =>
  request<Plan>(`/api/plans/${id}`, { method: 'PATCH', body: JSON.stringify(body) });

export const deletePlan = (id: string) =>
  request<void>(`/api/plans/${id}`, { method: 'DELETE' });
