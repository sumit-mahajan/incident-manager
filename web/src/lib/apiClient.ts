/// <reference types="vite/client" />

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

export function getActiveUserId(): string | null {
  return localStorage.getItem('incidenthub-user-id');
}

export function setStoredUserId(userId: string): void {
  localStorage.setItem('incidenthub-user-id', userId);
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const userId = getActiveUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (userId) headers['X-User-Id'] = userId;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { code: 'UNKNOWN', message: res.statusText } }));
    const err = body?.error ?? {};
    throw new ApiError(res.status, err.code ?? 'UNKNOWN', err.message ?? res.statusText, err.details);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
};

export { ApiError };
