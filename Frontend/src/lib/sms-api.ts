import { getAuthToken } from './auth-context';
import { getApiBase } from './api-base';

const BASE = getApiBase();

function handleUnauthorized() {
  throw new Error('You are not authorized to perform this SMS action. Please sign in again if needed.');
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
  if (res.status === 401) { handleUnauthorized(); }
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
  thirdReminderDays: number;
  lowStockThreshold: number;
  lowStockTemplate: string;
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

export interface BulkRemovedSmsResult {
  sent: number;
  failed: number;
  skipped: number;
  total: number;
}

export interface SmsLog {
  id: number;
  plate_number: string;
  sms_status: 'Sent' | 'Failed';
  sms_sent_at: string;
  last_sms_type: string;
  customer_name: string;
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

export interface LowStockSmsTestResult {
  message: string;
  recipients: Array<{
    name: string;
    phone: string;
    success: boolean;
    message: string;
  }>;
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

export const testLowStockSmsApi = (body: {
  category: string;
  type: string;
  remainingCount: number;
  threshold: number;
}) =>
  request<LowStockSmsTestResult>('/api/sms/test-low-stock', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const testEmailApi = () =>
  request<EmailTestResult>('/api/sms/test-email', {
    method: 'POST',
  });

export const sendVehicleSms = (vehicleId: string) =>
  request<SmsSendResult>(`/api/sms/send/${vehicleId}`, { method: 'POST' });

export const sendRemovedExpirySms = () =>
  request<BulkRemovedSmsResult>('/api/sms/send-removed-expired', { method: 'POST' });

export const runSmsJob = () =>
  request<SmsJobResult>('/api/sms/run-job', { method: 'POST' });

export const getSmsStats = () =>
  request<SmsStats>('/api/sms/stats');

export const getRecentSmsLogs = () =>
  request<SmsLog[]>('/api/sms/recent-logs');
