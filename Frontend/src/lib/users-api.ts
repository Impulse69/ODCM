import { getAuthToken } from './auth-context';
import { getApiBase } from './api-base';

const BASE = getApiBase();

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

export interface ManagedUser {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  initials: string;
  created_at: string;
  updated_at: string | null;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: string;
  phone?: string;
  password?: string;
  is_active?: boolean;
}

export type UpdateUserPayload = Partial<CreateUserPayload>;

export const getUsers = () => request<ManagedUser[]>('/api/users');

export const createUser = async (payload: CreateUserPayload): Promise<{ user: ManagedUser; tempPassword?: string }> => {
  const token = getAuthToken();
  const res = await fetch(`${BASE}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'API error');
  return { user: json.data as ManagedUser, tempPassword: json.tempPassword as string | undefined };
};

export const updateUser = (id: number, payload: UpdateUserPayload) =>
  request<ManagedUser>(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const deleteUser = (id: number) =>
  request<void>(`/api/users/${id}`, { method: 'DELETE' });
