import { getAuthToken } from './auth-context';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

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

export interface SmsConfig {
  clientId: string;
  clientSecretSet: boolean;
  senderId: string;
  dueSoonEnabled: boolean;
  expiredEnabled: boolean;
  dueSoonTemplate: string;
  expiredTemplate: string;
  firstReminderDays: number;
  secondReminderDays: number;
  adminEmail: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassSet: boolean;
}

export interface SmsStats {
  total_sent: number;
  total_failed: number;
  sent_today: number;
  due_soon_sent: number;
  expired_sent: number;
}

export interface SmsSendResult {
  smsStatus: 'Sent' | 'Failed';
  smsType: 'due_soon' | 'expired';
  failReason?: string;
}

export interface SmsJobResult {
  sent: number;
  failed: number;
  skipped: number;
  removed: number;
}

export interface EmailTestResult {
  message: string;
  accepted: string[];
  rejected: string[];
  pending: string[];
  response: string;
  messageId: string;
  reportFileName?: string;
  itemCount?: number;
}

// ── API Functions ─────────────────────────────────────────────────────────────

export const getSmsConfig = () =>
  request<SmsConfig>('/api/sms/config');

export const saveSmsConfig = (body: Partial<
  Omit<SmsConfig, 'clientSecretSet' | 'smtpPassSet'> &
  { clientSecret?: string; smtpPass?: string }
>) =>
  request<void>('/api/sms/config', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const testSmsApi = (to: string) =>
  request<void>('/api/sms/test', {
    method: 'POST',
    body: JSON.stringify({ to }),
  });

export const testEmailApi = () =>
  request<EmailTestResult>('/api/sms/test-email', {
    method: 'POST',
  });

export const sendVehicleSms = (vehicleId: string) =>
  request<SmsSendResult>(`/api/sms/send/${vehicleId}`, { method: 'POST' });

export const runSmsJob = () =>
  request<SmsJobResult>('/api/sms/run-job', { method: 'POST' });

export const getSmsStats = () =>
  request<SmsStats>('/api/sms/stats');
