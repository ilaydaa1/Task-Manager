// deno-lint-ignore-file
// @ts-nocheck

import { cors } from "npm:hono/cors";
import { migrate } from "npm:drizzle-orm/libsql/migrator";
import { OpenAPIHono } from "npm:@hono/zod-openapi";
import { z } from "npm:zod";

import { orm, saveDb } from "./db/connection.ts";
import { logger } from "./middleware/logger.ts";

import { tasksRoute } from "./routes/tasks.ts";
import { authRoute } from "./routes/auth.ts";

import { DB_URL, PORT } from "./config/env.ts";

console.log(`DB_URL = ${DB_URL}`);
console.log(`Server starting on port ${PORT}`);

// --- MIGRATIONS (LibSQL) ---
try {
  await migrate(orm, { migrationsFolder: "./db/migrations" });
  console.log("Migrations applied.");
} catch (_e) {
  console.warn("Migrations skipped: tables already exist.");
} finally {
  await saveDb();
}

// Zod schema for a Task
const Task = z.object({
  id: z.number().int(),
  title: z.string().min(1),
  status: z.enum(["todo", "doing", "done"]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  module: z.string().nullable().optional(),
});

// OpenAPI-enabled app
const app = new OpenAPIHono();

// Sağlık kontrolü
app.get("/", (c) => c.text("Backend is running 🚀"));

// OpenAPI JSON
app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: { title: "Tasks API", version: "1.0.0" },
});

// Middlewares
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["content-type", "authorization"],
  exposeHeaders: ["location"],
}));

app.use("*", logger);
tasksRoute.use("*", logger);

// ROUTES
app.route("/api/auth", authRoute);
app.route("/api/tasks", tasksRoute);

// Basit hello
app.get("/api/hello", (c) => c.json({ msg: "Hello from Hono + LibSQL ✅" }));

// Demo tasks endpoint (sadece örnek, istersen silebilirsin)
app.openapi(
  {
    method: "get",
    path: "/api/tasks-demo",
    tags: ["tasks"],
    summary: "List demo tasks",
    responses: {
      200: {
        description: "Array of demo tasks",
        content: {
          "application/json": { schema: z.array(Task) },
        },
      },
    },
  },
  (c) => {
    const rows = [
      {
        id: 1,
        title: "Demo",
        status: "todo",
        priority: "medium",
        module: null,
      },
    ];
    return c.json(rows);
  },
);

// Swagger UI
app.get("/docs", (c) =>
  c.html(`<!doctype html>
<html><head><meta charset="utf-8"/>
<title>API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">
</head><body>
<div id="swagger"></div>
<script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({url:'/openapi.json',dom_id:'#swagger'});</script>
</body></html>`)
);

// Start server
Deno.serve({ port: PORT ?? 8000 }, app.fetch);
console.log("Hono server running at http://localhost:8000");
