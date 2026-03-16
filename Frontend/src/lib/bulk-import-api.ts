import { getAuthToken } from './auth-context';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

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
  return json;
}

export interface BulkValidationResult {
  success: boolean;
  rows: {
    rowNum: number;
    customerStatus: 'New' | 'Existing' | 'Existing (Batch)' | 'Cross-Type';
    customerName: string;
    vehicleStatus: 'Available' | 'Duplicate' | 'Invalid Plan' | 'Invalid Format';
    duplicateReason?: string;
  }[];
}

export interface BulkImportResponse {
  success: boolean;
  imported: number;
  importedIndividuals: number;
  importedCompanies: number;
  skipped: number;
  errors: number;
  errorDetails: { row: number; message: string }[];
  skippedDetails: { row: number; imei: string; plateNumber: string; reason: string }[];
}

export const validateBulkImport = (rows: any[]) =>
  request<BulkValidationResult>('/api/bulk-import/validate', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });

export const executeBulkImport = (rows: any[]) =>
  request<BulkImportResponse>('/api/bulk-import', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
