import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  status: text("status").default("todo"),
  priority: text("priority").default("medium"),
  module: text("module"),
  userId: integer("user_id").notNull(),
  createdAt: integer("created_at").default(sql`(strftime('%s','now'))`),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").default(sql`(strftime('%s','now'))`),
});
