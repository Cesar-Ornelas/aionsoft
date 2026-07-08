import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appUsers } from "$lib/entities/access-control/model/schema";

export const systemAlerts = pgTable(
  "system_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull().default("warning"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => appUsers.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("system_alerts_active_window_idx").on(table.isActive, table.startsAt, table.endsAt),
    index("system_alerts_created_idx").on(table.createdAt)
  ]
);
