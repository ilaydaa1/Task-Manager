// deno-lint-ignore-file
// @ts-nocheck

import { createClient } from "npm:@libsql/client";
import { drizzle } from "npm:drizzle-orm/libsql/web";
import * as schema from "./schema.ts";

// SQLite (file) bağlantısı
export const client = createClient({
  url: "file:./db/tasks.db",
});

// ORM instance
export const orm = drizzle(client, { schema });

// SQLite dosyası için ekstra save gerekmiyor
export const saveDb = () => {};
