const API_BASE = import.meta.env.VITE_API_URL || '';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('indian-racing-auth');
  let authToken = '';
  if (token) {
    try {
      const parsed = JSON.parse(token);
      authToken = parsed?.state?.token || '';
    } catch { /* ignore */ }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function getSocketUrl(): string {
  return import.meta.env.VITE_SOCKET_URL || window.location.origin;
}
