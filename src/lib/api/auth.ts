const API = "/api/auth";
const opts: RequestInit = { credentials: "include", headers: { "Content-Type": "application/json" } };

export interface AuthUser {
  id: number;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface AuthResponse {
  user: AuthUser;
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export function register(email: string, password: string, displayName: string) {
  return fetch(`${API}/register`, { ...opts, method: "POST", body: JSON.stringify({ email, password, displayName }) })
    .then(r => handle<AuthResponse>(r));
}

export function login(email: string, password: string) {
  return fetch(`${API}/login`, { ...opts, method: "POST", body: JSON.stringify({ email, password }) })
    .then(r => handle<AuthResponse>(r));
}

export function loginWithGoogle(idToken: string) {
  return fetch(`${API}/google`, { ...opts, method: "POST", body: JSON.stringify({ idToken }) })
    .then(r => handle<AuthResponse>(r));
}

export function refreshToken() {
  return fetch(`${API}/refresh`, { ...opts, method: "POST" })
    .then(r => handle<AuthResponse>(r));
}

export function logout() {
  return fetch(`${API}/logout`, { ...opts, method: "POST" })
    .then(r => handle<{ ok: boolean }>(r));
}

export function getMe() {
  return fetch(`${API}/me`, { ...opts })
    .then(r => handle<{ user: AuthUser | null }>(r));
}
