import { pgTable, text, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const fbAccountsTable = pgTable("fb_accounts", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  name: text("name").notNull().default(""),
  avatar: text("avatar").notNull().default(""),
  cookie: text("cookie").notNull(),
  active: boolean("active").notNull().default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFbAccountSchema = createInsertSchema(fbAccountsTable).omit({ id: true, createdAt: true });
export type InsertFbAccount = z.infer<typeof insertFbAccountSchema>;
export type FbAccount = typeof fbAccountsTable.$inferSelect;
