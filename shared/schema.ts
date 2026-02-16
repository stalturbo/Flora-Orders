import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, bigint, timestamp, pgEnum, boolean, index, doublePrecision, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum('user_role', ['OWNER', 'MANAGER', 'FLORIST', 'COURIER']);
export const orderStatusEnum = pgEnum('order_status', ['NEW', 'IN_WORK', 'ASSEMBLED', 'ON_DELIVERY', 'DELIVERED', 'CANCELED']);
export const paymentStatusEnum = pgEnum('payment_status', ['NOT_PAID', 'ADVANCE', 'PAID']);
export const clientSourceEnum = pgEnum('client_source', ['PHONE', 'WHATSAPP', 'TELEGRAM', 'INSTAGRAM', 'WEBSITE', 'OTHER']);
export const businessExpenseCategoryEnum = pgEnum('business_expense_category', ['TAXES', 'RENT', 'SALARY', 'SUPPLIES', 'MARKETING', 'TRANSPORT', 'OTHER']);
export const geoStatusEnum = pgEnum('geo_status', ['NONE', 'PENDING', 'SUCCESS', 'FAILED']);

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  plainPassword: text("plain_password"),
  name: text("name").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default('MANAGER'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
}, (table) => [
  index("users_org_idx").on(table.organizationId),
  index("users_email_idx").on(table.email),
]);

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  orderNumber: integer("order_number"),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  address: text("address").notNull(),
  deliveryDateTime: bigint("delivery_date_time", { mode: "number" }).notNull(),
  deliveryDateTimeEnd: bigint("delivery_date_time_end", { mode: "number" }),
  amount: integer("amount").notNull(),
  status: orderStatusEnum("status").notNull().default('NEW'),
  managerId: varchar("manager_id").references(() => users.id, { onDelete: 'set null' }),
  floristId: varchar("florist_id").references(() => users.id, { onDelete: 'set null' }),
  courierId: varchar("courier_id").references(() => users.id, { onDelete: 'set null' }),
  externalFloristName: text("external_florist_name"),
  externalFloristPhone: text("external_florist_phone"),
  externalCourierName: text("external_courier_name"),
  externalCourierPhone: text("external_courier_phone"),
  comment: text("comment"),
  paymentStatus: paymentStatusEnum("payment_status").default('NOT_PAID'),
  paymentMethod: text("payment_method"),
  paymentDetails: text("payment_details"),
  clientSource: clientSourceEnum("client_source").default('PHONE'),
  clientSourceId: text("client_source_id"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  geoStatus: geoStatusEnum("geo_status").default('NONE'),
  geoUpdatedAt: timestamp("geo_updated_at"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
}, (table) => [
  index("orders_org_idx").on(table.organizationId),
  index("orders_status_idx").on(table.status),
  index("orders_delivery_idx").on(table.deliveryDateTime),
]);

export const attachments = pgTable("attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  type: text("type").notNull().default('PHOTO'),
  uri: text("uri").notNull(),
  uploadedByUserId: varchar("uploaded_by_user_id"),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
}, (table) => [
  index("attachments_order_idx").on(table.orderId),
]);

export const orderHistory = pgTable("order_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  fromStatus: orderStatusEnum("from_status"),
  toStatus: orderStatusEnum("to_status").notNull(),
  changedByUserId: varchar("changed_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  changedAt: bigint("changed_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  note: text("note"),
}, (table) => [
  index("history_order_idx").on(table.orderId),
]);

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
}, (table) => [
  index("sessions_token_idx").on(table.token),
  index("sessions_user_idx").on(table.userId),
]);

// Order expenses table - tracks expenses added by employees
export const orderExpenses = pgTable("order_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  amount: integer("amount").notNull(),
  comment: text("comment").notNull(),
  createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
}, (table) => [
  index("expenses_order_idx").on(table.orderId),
]);

export const businessExpenses = pgTable("business_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  category: businessExpenseCategoryEnum("category").notNull(),
  amount: integer("amount").notNull(),
  comment: text("comment").notNull(),
  date: bigint("date", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  createdByUserId: varchar("created_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
}, (table) => [
  index("biz_expenses_org_idx").on(table.organizationId),
  index("biz_expenses_date_idx").on(table.date),
]);

export const assistantRoleEnum = pgEnum('assistant_role', ['FLORIST', 'COURIER']);

export const orderAssistants = pgTable("order_assistants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: assistantRoleEnum("role").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
}, (table) => [
  index("assistants_order_idx").on(table.orderId),
  index("assistants_user_idx").on(table.userId),
]);

export const courierLocationLatest = pgTable("courier_location_latest", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  courierUserId: varchar("courier_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  accuracy: doublePrecision("accuracy"),
  recordedAt: bigint("recorded_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  activeOrderId: varchar("active_order_id"),
}, (table) => [
  uniqueIndex("courier_loc_latest_org_user_idx").on(table.organizationId, table.courierUserId),
  index("courier_loc_latest_org_idx").on(table.organizationId),
]);

export const courierLocations = pgTable("courier_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  courierUserId: varchar("courier_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  accuracy: doublePrecision("accuracy"),
  recordedAt: bigint("recorded_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
  activeOrderId: varchar("active_order_id"),
}, (table) => [
  index("courier_loc_history_org_user_time_idx").on(table.organizationId, table.courierUserId, table.recordedAt),
  index("courier_loc_history_org_idx").on(table.organizationId),
]);

// Developer settings table - stores dev password and other global settings
export const devSettings = pgTable("dev_settings", {
  id: varchar("id").primaryKey().default(sql`'default'`),
  devLogin: text("dev_login").notNull().default('developer'),
  devPassword: text("dev_password").notNull().default('20242024'),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull().default(sql`extract(epoch from now()) * 1000`),
});

export const insertOrganizationSchema = createInsertSchema(organizations).pick({
  name: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  phone: true,
  role: true,
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  clientName: true,
  clientPhone: true,
  address: true,
  deliveryDateTime: true,
  deliveryDateTimeEnd: true,
  amount: true,
  status: true,
  managerId: true,
  floristId: true,
  courierId: true,
  externalFloristName: true,
  externalFloristPhone: true,
  externalCourierName: true,
  externalCourierPhone: true,
  comment: true,
  paymentStatus: true,
  paymentMethod: true,
  paymentDetails: true,
  clientSource: true,
  clientSourceId: true,
});

export const insertBusinessExpenseSchema = createInsertSchema(businessExpenses).pick({
  category: true,
  amount: true,
  comment: true,
  date: true,
});

export const insertAttachmentSchema = createInsertSchema(attachments).pick({
  orderId: true,
  type: true,
  uri: true,
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type OrderHistory = typeof orderHistory.$inferSelect;
export type Session = typeof sessions.$inferSelect;

export type DevSettings = typeof devSettings.$inferSelect;
export type OrderExpense = typeof orderExpenses.$inferSelect;
export type BusinessExpense = typeof businessExpenses.$inferSelect;
export type OrderAssistant = typeof orderAssistants.$inferSelect;
export type CourierLocationLatest = typeof courierLocationLatest.$inferSelect;
export type CourierLocation = typeof courierLocations.$inferSelect;
export type GeoStatus = 'NONE' | 'PENDING' | 'SUCCESS' | 'FAILED';
export type AssistantRole = 'FLORIST' | 'COURIER';
export type InsertBusinessExpense = z.infer<typeof insertBusinessExpenseSchema>;
export type UserRole = 'OWNER' | 'MANAGER' | 'FLORIST' | 'COURIER';
export type OrderStatus = 'NEW' | 'IN_WORK' | 'ASSEMBLED' | 'ON_DELIVERY' | 'DELIVERED' | 'CANCELED';
export type PaymentStatus = 'NOT_PAID' | 'ADVANCE' | 'PAID';
export type ClientSource = 'PHONE' | 'WHATSAPP' | 'TELEGRAM' | 'INSTAGRAM' | 'WEBSITE' | 'OTHER';
export type BusinessExpenseCategory = 'TAXES' | 'RENT' | 'SALARY' | 'SUPPLIES' | 'MARKETING' | 'TRANSPORT' | 'OTHER';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Новый',
  IN_WORK: 'В работе',
  ASSEMBLED: 'Собран',
  ON_DELIVERY: 'В доставке',
  DELIVERED: 'Доставлен',
  CANCELED: 'Отменен',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'Руководитель',
  MANAGER: 'Менеджер',
  FLORIST: 'Флорист',
  COURIER: 'Курьер',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  NOT_PAID: 'Не оплачено',
  ADVANCE: 'Аванс',
  PAID: 'Оплачено',
};

export const CLIENT_SOURCE_LABELS: Record<ClientSource, string> = {
  PHONE: 'Телефон',
  WHATSAPP: 'WhatsApp',
  TELEGRAM: 'Telegram',
  INSTAGRAM: 'Instagram',
  WEBSITE: 'Сайт',
  OTHER: 'Другое',
};

export const BUSINESS_EXPENSE_CATEGORY_LABELS: Record<BusinessExpenseCategory, string> = {
  TAXES: 'Налоги',
  RENT: 'Аренда',
  SALARY: 'Зарплата',
  SUPPLIES: 'Расходные материалы',
  MARKETING: 'Маркетинг',
  TRANSPORT: 'Транспорт',
  OTHER: 'Прочее',
};
