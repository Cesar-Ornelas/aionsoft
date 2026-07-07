import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appUsers } from "$lib/entities/access-control/model/schema";

export const appNotifications = pgTable(
  "app_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientScope: text("recipient_scope").notNull().default("global"),
    recipientUserId: uuid("recipient_user_id").references(() => appUsers.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("info"),
    title: text("title").notNull(),
    message: text("message").notNull(),
    actionHref: text("action_href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index("app_notifications_created_idx").on(table.createdAt),
    index("app_notifications_scope_read_idx").on(table.recipientScope, table.recipientUserId, table.readAt)
  ]
);
