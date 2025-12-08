// deno-lint-ignore-file
import { Hono } from "jsr:@hono/hono";
import { eq, like, and } from "npm:drizzle-orm";
import { tasks } from "../db/schema.ts";
import { getDb, saveDb } from "../db/connection.ts";
import { authMiddleware } from "./auth.ts";

export const tasksRoute = new Hono();

/* ============================
   BASİT TASK CACHE (per user)
============================ */

type TasksCacheEntry = {
  data: any[];
  timestamp: number;
};

// Cache süresi (ms) – örnek: 30 saniye
const TASK_CACHE_TTL_MS = 30_000;

// userId -> cache
const tasksCache: Record<number, TasksCacheEntry> = {};

function getCachedTasks(userId: number) {
  const entry = tasksCache[userId];
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > TASK_CACHE_TTL_MS) {
    return null;
  }
  return entry.data;
}

function setCachedTasks(userId: number, data: any[]) {
  tasksCache[userId] = {
    data,
    timestamp: Date.now(),
  };
}

function invalidateTasksCache(userId: number) {
  delete tasksCache[userId];
}

/* ============================
   AUTH MIDDLEWARE
============================ */

tasksRoute.use("*", authMiddleware);

/* ============================
   GET /api/tasks?q=keyword
============================ */

tasksRoute.get("/", async (c) => {
  const q = c.req.query("q")?.trim();
  const user = c.get("user") as { userId: number };

  if (!user?.userId) {
    return c.json({ error: "no user in context" }, 500);
  }

  const { orm, release } = await getDb();
  try {
    // Arama varsa cache kullanmıyoruz
    if (q && q.length > 0) {
      const filtered = await orm
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, user.userId),
            like(tasks.title, `%${q}%`),
          ),
        );

      console.log(
        "GET /api/tasks?q=... → DB (search, no cache) user",
        user.userId,
      );
      return c.json(filtered);
    }

    // ÖNCE CACHE KONTROL
    const cached = getCachedTasks(user.userId);
    if (cached) {
      console.log(
        "GET /api/tasks → CACHE kullanılıyor, user",
        user.userId,
      );
      return c.json(cached);
    }

    // Cache yoksa DB'den çek
    console.log("GET /api/tasks → DB'den çekiliyor, user", user.userId);
    const all = await orm
      .select()
      .from(tasks)
      .where(eq(tasks.userId, user.userId));

    // Cache'e yaz
    setCachedTasks(user.userId, all);

    return c.json(all);
  } finally {
    release();
  }
});

/* ============================
   POST /api/tasks (Create)
============================ */

tasksRoute.post("/", async (c) => {
  const user = c.get("user") as { userId: number };
  const body = await c.req.json().catch(() => ({}));

  const { orm, release } = await getDb();

  try {
    const title = String(body.title ?? "").trim();
    if (!title) return c.json({ error: "title required" }, 400);

    const priority = (body.priority ?? "medium") as string;
    const status = (body.status ?? "todo") as string;
    const module = (body.module ?? null) as string | null;

    const inserted = await orm
      .insert(tasks)
      .values({
        title,
        priority,
        status,
        module,
        userId: user.userId,
      } as any)
      .returning()
      .get();

    await saveDb();

    // Bu kullanıcının task cache’ini temizle
    invalidateTasksCache(user.userId);

    return c.json(inserted, 201);
  } finally {
    release();
  }
});

/* ============================
   PUT /api/tasks/:id (Update)
============================ */

tasksRoute.put("/:id", async (c) => {
  const user = c.get("user") as { userId: number };
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "invalid id" }, 400);

  const patch = await c.req.json().catch(() => ({}));

  const { orm, release } = await getDb();

  try {
    // Task gerçekten bu kullanıcıya mı ait?
    const existing = await orm
      .select()
      .from(tasks)
      .where(eq(tasks.id, id));

    if (!existing.length || existing[0].userId !== user.userId) {
      return c.json({ error: "not allowed" }, 403);
    }

    // id ve userId değiştirilmesin
    const { id: _ignore, userId: _ignore2, ...safePatch } = patch;

    await orm
      .update(tasks)
      .set(safePatch as any)
      .where(eq(tasks.id, id))
      .run();

    const updated = await orm
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .get();

    await saveDb();

    // Cache invalidate
    invalidateTasksCache(user.userId);

    if (!updated) return c.json({ error: "not found" }, 404);

    return c.json(updated);
  } finally {
    release();
  }
});

/* ============================
   DELETE /api/tasks/:id
============================ */

tasksRoute.delete("/:id", async (c) => {
  const user = c.get("user") as { userId: number };
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "invalid id" }, 400);

  const { orm, release } = await getDb();

  try {
    const existing = await orm
      .select()
      .from(tasks)
      .where(eq(tasks.id, id));

    if (!existing.length || existing[0].userId !== user.userId) {
      return c.json({ error: "not allowed" }, 403);
    }

    await orm.delete(tasks).where(eq(tasks.id, id)).run();
    await saveDb();

    // Cache invalidate
    invalidateTasksCache(user.userId);

    return c.json({ ok: true });
  } finally {
    release();
  }
});
