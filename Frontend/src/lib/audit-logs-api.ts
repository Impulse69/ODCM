import { getAuthToken } from './auth-context';
import { getApiBase } from './api-base';

const BASE = getApiBase();

async function request<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'API error');
  return json.data as T;
}

export interface AuditLog {
  id: number;
  actor_user_id: number | null;
  actor_name: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  section: string;
  title: string;
  before_data: unknown;
  after_data: unknown;
  created_at: string;
}

export const getAuditLogs = (section?: string) => {
  const params = new URLSearchParams();
  if (section) params.set('section', section);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return request<AuditLog[]>(`/api/audit-logs${suffix}`);
};