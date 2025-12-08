// deno-lint-ignore-file
// @ts-nocheck

// ---- Simple Bloom Filters (Access + Refresh) ----
class BloomFilter {
  size = 1024;
  bits = new Array(1024).fill(false);

  hash1(str: string) {
    let hash = 0;
    for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) % this.size;
    return hash;
  }

  hash2(str: string) {
    let hash = 0;
    for (const c of str) hash = (hash * 17 + c.charCodeAt(0)) % this.size;
    return hash;
  }

  add(str: string) {
    this.bits[this.hash1(str)] = true;
    this.bits[this.hash2(str)] = true;
  }

  has(str: string) {
    return this.bits[this.hash1(str)] && this.bits[this.hash2(str)];
  }
}

// Access token ve refresh token için ayrı Bloom filter
const accessTokenBloom = new BloomFilter();
const refreshTokenBloom = new BloomFilter();

import { Hono, Context, Next } from "jsr:@hono/hono";
import { getDb, saveDb } from "../db/connection.ts";
import { users } from "../db/schema.ts";
import bcrypt from "npm:bcryptjs";
import { eq } from "npm:drizzle-orm";
import {
  create,
  verify,
  getNumericDate,
} from "https://deno.land/x/djwt@v3.0.2/mod.ts";

export const authRoute = new Hono();

// SECRET KEY (HMAC SHA-256)
const KEY = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode("mysecret"),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

/* ===========================
   REGISTER
=========================== */
authRoute.post("/register", async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }

  const { orm, release } = await getDb();
  try {
    // Email daha önce var mı?
    const existing = await orm
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existing.length > 0) {
      return c.json({ error: "User already exists" }, 400);
    }

    const passwordHash = bcrypt.hashSync(password);

    await orm.insert(users).values({
      email,
      passwordHash,
    });

    await saveDb();
    return c.json({ message: "User created" }, 201);
  } finally {
    release();
  }
});

/* ===========================
   LOGIN (Access + Refresh)
=========================== */
authRoute.post("/login", async (c) => {
  const { email, password } = await c.req.json();

  const { orm, release } = await getDb();
  try {
    const rows = await orm
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (rows.length === 0) {
      return c.json({ error: "Invalid email or password" }, 400);
    }

    const user = rows[0];
    const ok = bcrypt.compareSync(password, user.passwordHash);

    if (!ok) {
      return c.json({ error: "Invalid email or password" }, 400);
    }

    // --- ACCESS TOKEN (ör: 15 dk) ---
    const accessPayload = {
      userId: user.id,
      email: user.email,
      exp: getNumericDate(60 * 15),
    };

    const accessToken = await create(
      { alg: "HS256", typ: "JWT" },
      accessPayload,
      KEY,
    );

    // --- REFRESH TOKEN (ör: 7 gün) ---
    const refreshPayload = {
      userId: user.id,
      email: user.email,
      exp: getNumericDate(60 * 60 * 24 * 7),
    };

    const refreshToken = await create(
      { alg: "HS256", typ: "JWT" },
      refreshPayload,
      KEY,
    );

    return c.json({
      accessToken,
      refreshToken,
    });
  } finally {
    release();
  }
});

/* ===========================
   LOGOUT
   - Access token'ı Bloom'a ekle
   - Refresh token geldiyse onu da Bloom'a ekle
=========================== */
authRoute.post("/logout", async (c) => {
  const header = c.req.header("Authorization");
  const token = header?.replace("Bearer ", "");

  const body = await c.req.json().catch(() => ({}));
  const refreshToken = body?.refreshToken as string | undefined;

  if (token) {
    accessTokenBloom.add(token);
  }
  if (refreshToken) {
    refreshTokenBloom.add(refreshToken);
  }

  return c.json({ message: "Logged out" });
});

/* ===========================
   REFRESH TOKEN ENDPOINT
=========================== */
authRoute.post("/refresh", async (c) => {
  const { refreshToken } = await c.req.json();

  if (!refreshToken) {
    return c.json({ error: "refreshToken required" }, 400);
  }

  // Daha önce logout ile blacklist edilmiş mi?
  if (refreshTokenBloom.has(refreshToken)) {
    return c.json({ error: "Refresh token blacklisted" }, 401);
  }

  try {
    const payload = await verify(refreshToken, KEY);

    // Yeni access token üret
    const newAccessToken = await create(
      { alg: "HS256", typ: "JWT" },
      {
        userId: payload.userId,
        email: payload.email,
        exp: getNumericDate(60 * 15),
      },
      KEY,
    );

    return c.json({ accessToken: newAccessToken });
  } catch (_err) {
    // Hatalı / expire olmuş refresh token'ı da Bloom'a ekleyip
    // “muhtemel brute-force” gibi düşünebilirsin (bonus olarak anlatabilirsin)
    refreshTokenBloom.add(refreshToken);
    return c.json({ error: "Invalid refresh token" }, 401);
  }
});

/* ===========================
   AUTH MIDDLEWARE
   - Access token kontrolü
   - Bloom ile blacklist kontrolü
=========================== */
export const authMiddleware = async (c: Context, next: Next) => {
  const header = c.req.header("Authorization");

  if (!header) {
    return c.json({ error: "Missing Authorization header" }, 401);
  }

  const token = header.replace("Bearer ", "");

  // Access token Bloom'da mı? (blacklist)
  if (accessTokenBloom.has(token)) {
    return c.json({ error: "Blacklisted token" }, 401);
  }

  try {
    const payload = await verify(token, KEY);
    c.set("user", payload);
  } catch (_err) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  await next();
};
