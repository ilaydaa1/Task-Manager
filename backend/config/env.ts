// config/env.ts

/**
 * Güvenli environment değişkeni okuma fonksiyonu.
 * Kullanım: const DB_URL = get("DATABASE_URL");
 */
export function get(key: string, def?: string): string {
  const v = Deno.env.get(key) ?? def;
  if (v === undefined) {
    throw new Error(`Missing env ${key}`);
  }
  return v;
}


export const DB_URL = get("DATABASE_URL", "file:./db/tasks.db");

// JWT için secret (development için default var)
export const JWT_SECRET = get("JWT_SECRET", "dev-secret");

// Sunucu portu (varsayılan 8000)
export const PORT = Number(get("PORT", "8000"));
