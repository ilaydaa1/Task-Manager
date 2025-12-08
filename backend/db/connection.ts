// deno-lint-ignore-file
// @ts-nocheck

import { drizzle } from "npm:drizzle-orm/libsql";
import { createClient } from "npm:@libsql/client";
import { DB_URL } from "../config/env.ts";

/**
 * Basit libSQL connection pool
 * - POOL_SIZE: Aynı anda en fazla kaç connection açılsın
 * - IDLE_TIMEOUT_MS: Uzun süre kullanılmayan connection'lar tekrar kullanılmasın
 */
const POOL_SIZE = 3;
const IDLE_TIMEOUT_MS = 60_000; // 60 saniye

type PoolItem = {
  client: any;
  orm: any;
  busy: boolean;
  lastUsed: number;
};

const pool: PoolItem[] = [];

// Yeni connection + drizzle ORM instance'ı oluştur
async function createPoolItem(): Promise<PoolItem> {
  const client = createClient({
    url: DB_URL,
  });

  const orm = drizzle(client);

  return {
    client,
    orm,
    busy: false,
    lastUsed: Date.now(),
  };
}

/**
 * getDb()
 * - Pool'dan uygun bir connection seçer
 * - release() ile işi bitince serbest bırakırız
 */
export async function getDb() {
  const now = Date.now();

  // 1) Boşta ve çok eskimemiş bir connection var mı?
  let item = pool.find(
    (p) => !p.busy && now - p.lastUsed < IDLE_TIMEOUT_MS,
  );

  // 2) Yoksa ve kapasite dolmamışsa yeni connection oluştur
  if (!item && pool.length < POOL_SIZE) {
    item = await createPoolItem();
    pool.push(item);
  }

  // 3) Hâlâ yoksa, fallback: ilk connection'ı kullan
  if (!item) {
    item = pool[0];
  }

  item.busy = true;
  item.lastUsed = now;

  const release = () => {
    item!.busy = false;
    item!.lastUsed = Date.now();
  };

  return { orm: item.orm, release };
}

/**
 * Eski kodla uyumluluk için
 * - migrate vs. tek bir shared orm kullanıyor
 * - burada pool'dan bağımsız, tek bir connection açıyoruz
 */
const shared = await createPoolItem();
export const orm = shared.orm;

// libsql için özel bir flush gerekmiyor
export async function saveDb() {
  // no-op
}
