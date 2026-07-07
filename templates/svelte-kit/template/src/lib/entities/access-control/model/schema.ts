import { pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const appUsers = pgTable("app_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  logtoUserId: text("logto_user_id").notNull(),
  email: text("email"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [uniqueIndex("app_users_logto_user_id_uq").on(table.logtoUserId)]);

export const appRoles = pgTable("app_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [uniqueIndex("app_roles_key_uq").on(table.key)]);

export const appGroups = pgTable("app_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [uniqueIndex("app_groups_key_uq").on(table.key)]);

export const appPermissions = pgTable("app_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [uniqueIndex("app_permissions_key_uq").on(table.key)]);

export const appUserRoles = pgTable("app_user_roles", {
  userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => appRoles.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [primaryKey({ columns: [table.userId, table.roleId], name: "app_user_roles_pk" })]);

export const appUserGroups = pgTable("app_user_groups", {
  userId: uuid("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  groupId: uuid("group_id").notNull().references(() => appGroups.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [primaryKey({ columns: [table.userId, table.groupId], name: "app_user_groups_pk" })]);

export const appGroupRoles = pgTable("app_group_roles", {
  groupId: uuid("group_id").notNull().references(() => appGroups.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => appRoles.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [primaryKey({ columns: [table.groupId, table.roleId], name: "app_group_roles_pk" })]);

export const appRolePermissions = pgTable("app_role_permissions", {
  roleId: uuid("role_id").notNull().references(() => appRoles.id, { onDelete: "cascade" }),
  permissionId: uuid("permission_id").notNull().references(() => appPermissions.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [primaryKey({ columns: [table.roleId, table.permissionId], name: "app_role_permissions_pk" })]);
