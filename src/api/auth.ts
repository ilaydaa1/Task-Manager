// src/api/auth.ts
const API_BASE = "http://localhost:8000/api";

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
};

export async function login(data: LoginInput): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body && (body.error as string)) || "Login failed";
    throw new Error(message);
  }

  return res.json();
}

export async function register(data: LoginInput): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body && (body.error as string)) || "Register failed";
    throw new Error(message);
  }
}
