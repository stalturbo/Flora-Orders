"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/index.ts
var import_express = __toESM(require("express"));

// server/routes.ts
var import_node_http = require("node:http");
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var crypto = __toESM(require("crypto"));

// server/db.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = __toESM(require("pg"));

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  BUSINESS_EXPENSE_CATEGORY_LABELS: () => BUSINESS_EXPENSE_CATEGORY_LABELS,
  CLIENT_SOURCE_LABELS: () => CLIENT_SOURCE_LABELS,
  ORDER_STATUS_LABELS: () => ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS: () => PAYMENT_STATUS_LABELS,
  USER_ROLE_LABELS: () => USER_ROLE_LABELS,
  assistantRoleEnum: () => assistantRoleEnum,
  attachments: () => attachments,
  businessExpenseCategoryEnum: () => businessExpenseCategoryEnum,
  businessExpenses: () => businessExpenses,
  clientSourceEnum: () => clientSourceEnum,
  courierLocationLatest: () => courierLocationLatest,
  courierLocations: () => courierLocations,
  devSettings: () => devSettings,
  geoStatusEnum: () => geoStatusEnum,
  insertAttachmentSchema: () => insertAttachmentSchema,
  insertBusinessExpenseSchema: () => insertBusinessExpenseSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertOrganizationSchema: () => insertOrganizationSchema,
  insertUserSchema: () => insertUserSchema,
  orderAssistants: () => orderAssistants,
  orderExpenses: () => orderExpenses,
  orderHistory: () => orderHistory,
  orderStatusEnum: () => orderStatusEnum,
  orders: () => orders,
  organizations: () => organizations,
  paymentStatusEnum: () => paymentStatusEnum,
  sessions: () => sessions,
  userRoleEnum: () => userRoleEnum,
  users: () => users
});
var import_drizzle_orm = require("drizzle-orm");
var import_pg_core = require("drizzle-orm/pg-core");
var import_drizzle_zod = require("drizzle-zod");
var userRoleEnum = (0, import_pg_core.pgEnum)("user_role", ["OWNER", "MANAGER", "FLORIST", "COURIER"]);
var orderStatusEnum = (0, import_pg_core.pgEnum)("order_status", ["NEW", "IN_WORK", "ASSEMBLED", "ON_DELIVERY", "DELIVERED", "CANCELED"]);
var paymentStatusEnum = (0, import_pg_core.pgEnum)("payment_status", ["NOT_PAID", "ADVANCE", "PAID"]);
var clientSourceEnum = (0, import_pg_core.pgEnum)("client_source", ["PHONE", "WHATSAPP", "TELEGRAM", "INSTAGRAM", "WEBSITE", "OTHER"]);
var businessExpenseCategoryEnum = (0, import_pg_core.pgEnum)("business_expense_category", ["TAXES", "RENT", "SALARY", "SUPPLIES", "MARKETING", "TRANSPORT", "OTHER"]);
var geoStatusEnum = (0, import_pg_core.pgEnum)("geo_status", ["NONE", "PENDING", "SUCCESS", "FAILED"]);
var organizations = (0, import_pg_core.pgTable)("organizations", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  name: (0, import_pg_core.text)("name").notNull(),
  createdAt: (0, import_pg_core.bigint)("created_at", { mode: "number" }).notNull().default(import_drizzle_orm.sql`extract(epoch from now()) * 1000`)
});
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  organizationId: (0, import_pg_core.varchar)("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: (0, import_pg_core.text)("email").notNull().unique(),
  password: (0, import_pg_core.text)("password").notNull(),
  plainPassword: (0, import_pg_core.text)("plain_password"),
  name: (0, import_pg_core.text)("name").notNull(),
  phone: (0, import_pg_core.text)("phone"),
  role: userRoleEnum("role").notNull().default("MANAGER"),
  isActive: (0, import_pg_core.boolean)("is_active").notNull().default(true),
  createdAt: (0, import_pg_core.bigint)("created_at", { mode: "number" }).notNull().default(import_drizzle_orm.sql`extract(epoch from now()) * 1000`)
}, (table) => [
  (0, import_pg_core.index)("users_org_idx").on(table.organizationId),
  (0, import_pg_core.index)("users_email_idx").on(table.email)
]);
var orders = (0, import_pg_core.pgTable)("orders", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  organizationId: (0, import_pg_core.varchar)("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  orderNumber: (0, import_pg_core.integer)("order_number"),
  clientName: (0, import_pg_core.text)("client_name").notNull(),
  clientPhone: (0, import_pg_core.text)("client_phone").notNull(),
  address: (0, import_pg_core.text)("address").notNull(),
  deliveryDateTime: (0, import_pg_core.bigint)("delivery_date_time", { mode: "number" }).notNull(),
  deliveryDateTimeEnd: (0, import_pg_core.bigint)("delivery_date_time_end", { mode: "number" }),
  amount: (0, import_pg_core.integer)("amount").notNull(),
  status: orderStatusEnum("status").notNull().default("NEW"),
  managerId: (0, import_pg_core.varchar)("manager_id").references(() => users.id, { onDelete: "set null" }),
  floristId: (0, import_pg_core.varchar)("florist_id").references(() => users.id, { onDelete: "set null" }),
  courierId: (0, import_pg_core.varchar)("courier_id").references(() => users.id, { onDelete: "set null" }),
  externalFloristName: (0, import_pg_core.text)("external_florist_name"),
  externalFloristPhone: (0, import_pg_core.text)("external_florist_phone"),
  externalCourierName: (0, import_pg_core.text)("external_courier_name"),
  externalCourierPhone: (0, import_pg_core.text)("external_courier_phone"),
  comment: (0, import_pg_core.text)("comment"),
  paymentStatus: paymentStatusEnum("payment_status").default("NOT_PAID"),
  paymentMethod: (0, import_pg_core.text)("payment_method"),
  paymentDetails: (0, import_pg_core.text)("payment_details"),
  clientSource: clientSourceEnum("client_source").default("PHONE"),
  clientSourceId: (0, import_pg_core.text)("client_source_id"),
  latitude: (0, import_pg_core.doublePrecision)("latitude"),
  longitude: (0, import_pg_core.doublePrecision)("longitude"),
  geoStatus: geoStatusEnum("geo_status").default("NONE"),
  geoUpdatedAt: (0, import_pg_core.timestamp)("geo_updated_at"),
  createdAt: (0, import_pg_core.bigint)("created_at", { mode: "number" }).notNull().default(import_drizzle_orm.sql`extract(epoch from now()) * 1000`),
  updatedAt: (0, import_pg_core.bigint)("updated_at", { mode: "number" }).notNull().default(import_drizzle_orm.sql`extract(epoch from now()) * 1000`)
}, (table) => [
  (0, import_pg_core.index)("orders_org_idx").on(table.organizationId),
  (0, import_pg_core.index)("orders_status_idx").on(table.status),
  (0, import_pg_core.index)("orders_delivery_idx").on(table.deliveryDateTime)
]);
var attachments = (0, import_pg_core.pgTable)("attachments", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  orderId: (0, import_pg_core.varchar)("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  type: (0, import_pg_core.text)("type").notNull().default("PHOTO"),
  uri: (0, import_pg_core.text)("uri").notNull(),
  uploadedByUserId: (0, import_pg_core.varchar)("uploaded_by_user_id"),
  createdAt: (0, import_pg_core.bigint)("created_at", { mode: "number" }).notNull().default(import_drizzle_orm.sql`extract(epoch from now()) * 1000`)
}, (table) => [
  (0, import_pg_core.index)("attachments_order_idx").on(table.orderId)
]);
var orderHistory = (0, import_pg_core.pgTable)("order_history", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  orderId: (0, import_pg_core.varchar)("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: orderStatusEnum("from_status"),
  toStatus: orderStatusEnum("to_status").notNull(),
  changedByUserId: (0, import_pg_core.varchar)("changed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  changedAt: (0, import_pg_core.bigint)("changed_at", { mode: "number" }).notNull().default(import_drizzle_orm.sql`extract(epoch from now()) * 1000`),
  note: (0, import_pg_core.text)("note")
}, (table) => [
  (0, import_pg_core.index)("history_order_idx").on(table.orderId)
]);
var sessions = (0, import_pg_core.pgTable)("sessions", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  userId: (0, import_pg_core.varchar)("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: (0, import_pg_core.text)("token").notNull().unique(),
  expiresAt: (0, import_pg_core.bigint)("expires_at", { mode: "number" }).notNull(),
  createdAt: (0, import_pg_core.bigint)("created_at", { mode: "number" }).notNull().default(import_drizzle_orm.sql`extract(epoch from now()) * 1000`)
}, (table) => [
  (0, import_pg_core.index)("sessions_token_idx").on(table.token),
  (0, import_pg_core.index)("sessions_user_idx").on(table.userId)
]);
var orderExpenses = (0, import_pg_core.pgTable)("order_expenses", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  orderId: (0, import_pg_core.varchar)("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  amount: (0, import_pg_core.integer)("amount").notNull(),
  comment: (0, import_pg_core.text)("comment").notNull(),
  createdByUserId: (0, import_pg_core.varchar)("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: (0, import_pg_core.bigint)("created_at", { mode: "number" }).notNull().default(import_drizzle_orm.sql`extract(epoch from now()) * 1000`)
}, (table) => [
  (0, import_pg_core.index)("expenses_order_idx").on(table.orderId)
]);
var businessExpenses = (0, import_pg_core.pgTable)("business_expenses", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  organizationId: (0, import_pg_core.varchar)("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  category: businessExpenseCategoryEnum("category").notNull(),
  amount: (0, import_pg_core.integer)("amount").notNull(),
  comment: (0, import_pg_core.text)("comment").notNull(),
  date: (0, import_pg_core.bigint)("date", { mode: "number" }).notNull().default(import_drizzle_orm.sql`extract(epoch from now()) * 1000`),
  createdByUserId: (0, import_pg_core.varchar)("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: (0, import_pg_core.bigint)("created_at", { mode: "number" }).notNull().default(import_drizzle_orm.sql`extract(epoch from now()) * 1000`)
}, (table) => [
  (0, import_pg_core.index)("biz_expenses_org_idx").on(table.organizationId),
  (0, import_pg_core.index)("biz_expenses_date_idx").on(table.date)
]);
var assistantRoleEnum = (0, import_pg_core.pgEnum)("assistant_role", ["FLORIST", "COURIER"]);
var orderAssistants = (0, import_pg_core.pgTable)("order_assistants", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  orderId: (0, import_pg_core.varchar)("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  userId: (0, import_pg_core.varchar)("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: assistantRoleEnum("role").notNull(),
  createdAt: (0, import_pg_core.bigint)("created_at", { mode: "number" }).notNull().default(import_drizzle_orm.sql`extract(epoch from now()) * 1000`)
}, (table) => [
  (0, import_pg_core.index)("assistants_order_idx").on(table.orderId),
  (0, import_pg_core.index)("assistants_user_idx").on(table.userId)
]);
var courierLocationLatest = (0, import_pg_core.pgTable)("courier_location_latest", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  organizationId: (0, import_pg_core.varchar)("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  courierUserId: (0, import_pg_core.varchar)("courier_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lat: (0, import_pg_core.doublePrecision)("lat").notNull(),
  lon: (0, import_pg_core.doublePrecision)("lon").notNull(),
  accuracy: (0, import_pg_core.doublePrecision)("accuracy"),
  recordedAt: (0, import_pg_core.bigint)("recorded_at", { mode: "number" }).notNull(),
  updatedAt: (0, import_pg_core.bigint)("updated_at", { mode: "number" }).notNull().default(import_drizzle_orm.sql`extract(epoch from now()) * 1000`),
  activeOrderId: (0, import_pg_core.varchar)("active_order_id")
}, (table) => [
  (0, import_pg_core.uniqueIndex)("courier_loc_latest_org_user_idx").on(table.organizationId, table.courierUserId),
  (0, import_pg_core.index)("courier_loc_latest_org_idx").on(table.organizationId)
]);
var courierLocations = (0, import_pg_core.pgTable)("courier_locations", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`gen_random_uuid()`),
  organizationId: (0, import_pg_core.varchar)("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  courierUserId: (0, import_pg_core.varchar)("courier_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lat: (0, import_pg_core.doublePrecision)("lat").notNull(),
  lon: (0, import_pg_core.doublePrecision)("lon").notNull(),
  accuracy: (0, import_pg_core.doublePrecision)("accuracy"),
  recordedAt: (0, import_pg_core.bigint)("recorded_at", { mode: "number" }).notNull(),
  createdAt: (0, import_pg_core.bigint)("created_at", { mode: "number" }).notNull().default(import_drizzle_orm.sql`extract(epoch from now()) * 1000`),
  activeOrderId: (0, import_pg_core.varchar)("active_order_id")
}, (table) => [
  (0, import_pg_core.index)("courier_loc_history_org_user_time_idx").on(table.organizationId, table.courierUserId, table.recordedAt),
  (0, import_pg_core.index)("courier_loc_history_org_idx").on(table.organizationId)
]);
var devSettings = (0, import_pg_core.pgTable)("dev_settings", {
  id: (0, import_pg_core.varchar)("id").primaryKey().default(import_drizzle_orm.sql`'default'`),
  devLogin: (0, import_pg_core.text)("dev_login").notNull().default("developer"),
  devPassword: (0, import_pg_core.text)("dev_password").notNull().default("20242024"),
  updatedAt: (0, import_pg_core.bigint)("updated_at", { mode: "number" }).notNull().default(import_drizzle_orm.sql`extract(epoch from now()) * 1000`)
});
var insertOrganizationSchema = (0, import_drizzle_zod.createInsertSchema)(organizations).pick({
  name: true
});
var insertUserSchema = (0, import_drizzle_zod.createInsertSchema)(users).pick({
  email: true,
  password: true,
  name: true,
  phone: true,
  role: true
});
var insertOrderSchema = (0, import_drizzle_zod.createInsertSchema)(orders).pick({
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
  clientSourceId: true
});
var insertBusinessExpenseSchema = (0, import_drizzle_zod.createInsertSchema)(businessExpenses).pick({
  category: true,
  amount: true,
  comment: true,
  date: true
});
var insertAttachmentSchema = (0, import_drizzle_zod.createInsertSchema)(attachments).pick({
  orderId: true,
  type: true,
  uri: true
});
var ORDER_STATUS_LABELS = {
  NEW: "\u041D\u043E\u0432\u044B\u0439",
  IN_WORK: "\u0412 \u0440\u0430\u0431\u043E\u0442\u0435",
  ASSEMBLED: "\u0421\u043E\u0431\u0440\u0430\u043D",
  ON_DELIVERY: "\u0412 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0435",
  DELIVERED: "\u0414\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D",
  CANCELED: "\u041E\u0442\u043C\u0435\u043D\u0435\u043D"
};
var USER_ROLE_LABELS = {
  OWNER: "\u0420\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044C",
  MANAGER: "\u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440",
  FLORIST: "\u0424\u043B\u043E\u0440\u0438\u0441\u0442",
  COURIER: "\u041A\u0443\u0440\u044C\u0435\u0440"
};
var PAYMENT_STATUS_LABELS = {
  NOT_PAID: "\u041D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E",
  ADVANCE: "\u0410\u0432\u0430\u043D\u0441",
  PAID: "\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E"
};
var CLIENT_SOURCE_LABELS = {
  PHONE: "\u0422\u0435\u043B\u0435\u0444\u043E\u043D",
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  INSTAGRAM: "Instagram",
  WEBSITE: "\u0421\u0430\u0439\u0442",
  OTHER: "\u0414\u0440\u0443\u0433\u043E\u0435"
};
var BUSINESS_EXPENSE_CATEGORY_LABELS = {
  TAXES: "\u041D\u0430\u043B\u043E\u0433\u0438",
  RENT: "\u0410\u0440\u0435\u043D\u0434\u0430",
  SALARY: "\u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430",
  SUPPLIES: "\u0420\u0430\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u044B",
  MARKETING: "\u041C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433",
  TRANSPORT: "\u0422\u0440\u0430\u043D\u0441\u043F\u043E\u0440\u0442",
  OTHER: "\u041F\u0440\u043E\u0447\u0435\u0435"
};

// server/db.ts
var { Pool } = import_pg.default;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });

// server/routes.ts
var import_drizzle_orm3 = require("drizzle-orm");

// server/auth.ts
var import_drizzle_orm2 = require("drizzle-orm");
var import_crypto = require("crypto");
function hashPassword(password) {
  return (0, import_crypto.createHash)("sha256").update(password).digest("hex");
}
function generateToken() {
  return (0, import_crypto.randomBytes)(32).toString("hex");
}
async function createSession(userId) {
  const token = generateToken();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1e3;
  await db.insert(sessions).values({
    userId,
    token,
    expiresAt
  });
  return token;
}
async function validateSession(token) {
  const [session] = await db.select().from(sessions).where((0, import_drizzle_orm2.eq)(sessions.token, token));
  if (!session || session.expiresAt < Date.now()) {
    return null;
  }
  const [user] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.id, session.userId));
  if (!user || !user.isActive) {
    return null;
  }
  const [org] = await db.select().from(organizations).where((0, import_drizzle_orm2.eq)(organizations.id, user.organizationId));
  return { user, session, organization: org };
}
async function deleteSession(token) {
  await db.delete(sessions).where((0, import_drizzle_orm2.eq)(sessions.token, token));
}
async function register(email, password, name, orgName) {
  const [existingUser] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.email, email.toLowerCase()));
  if (existingUser) {
    throw new Error("Email already registered");
  }
  const [organization] = await db.insert(organizations).values({ name: orgName }).returning();
  const [user] = await db.insert(users).values({
    organizationId: organization.id,
    email: email.toLowerCase(),
    password: hashPassword(password),
    plainPassword: password,
    name,
    role: "OWNER"
  }).returning();
  const token = await createSession(user.id);
  return { user, organization, token };
}
async function login(email, password) {
  const [user] = await db.select().from(users).where((0, import_drizzle_orm2.eq)(users.email, email.toLowerCase()));
  if (!user || user.password !== hashPassword(password)) {
    throw new Error("Invalid email or password");
  }
  if (!user.isActive) {
    throw new Error("Account is deactivated");
  }
  const token = await createSession(user.id);
  const [org] = await db.select().from(organizations).where((0, import_drizzle_orm2.eq)(organizations.id, user.organizationId));
  return { user, organization: org, token };
}

// server/routes.ts
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const session = await validateSession(token);
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
  req.user = session.user;
  req.organization = session.organization;
  next();
}
async function registerRoutes(app2) {
  const existingDevSettings = await db.select().from(devSettings).where((0, import_drizzle_orm3.eq)(devSettings.id, "default"));
  if (existingDevSettings.length === 0) {
    await db.insert(devSettings).values({ id: "default", devPassword: "20242024" });
  }
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name, organizationName, devPassword } = req.body;
      if (!email || !password || !name || !organizationName) {
        return res.status(400).json({ error: "All fields are required" });
      }
      if (!devPassword) {
        return res.status(400).json({ error: "\u041F\u0430\u0440\u043E\u043B\u044C \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u0435\u043D" });
      }
      const settings = await db.select().from(devSettings).where((0, import_drizzle_orm3.eq)(devSettings.id, "default"));
      const currentDevPassword = settings[0]?.devPassword || "20242024";
      if (devPassword !== currentDevPassword) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      const result = await register(email, password, name, organizationName);
      res.json({
        user: { ...result.user, password: void 0 },
        organization: result.organization,
        token: result.token
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }
      const result = await login(email, password);
      res.json({
        user: { ...result.user, password: void 0 },
        organization: result.organization,
        token: result.token
      });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      await deleteSession(token);
    }
    res.json({ success: true });
  });
  app2.get("/api/auth/me", authMiddleware, async (req, res) => {
    res.json({
      user: { ...req.user, password: void 0 },
      organization: req.organization
    });
  });
  app2.get("/api/users", authMiddleware, async (req, res) => {
    const orgUsers = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.organizationId, req.organization.id));
    res.json(orgUsers.map((u) => ({ ...u, password: void 0 })));
  });
  app2.post("/api/users", authMiddleware, async (req, res) => {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({ error: "Only owner can create users" });
    }
    const { email, password, name, phone, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password and name required" });
    }
    try {
      const [user] = await db.insert(users).values({
        organizationId: req.organization.id,
        email: email.toLowerCase(),
        password: hashPassword(password),
        plainPassword: password,
        name,
        phone: phone || null,
        role: role || "MANAGER"
      }).returning();
      res.json({ ...user, password: void 0 });
    } catch (error) {
      res.status(400).json({ error: "Email already exists" });
    }
  });
  app2.put("/api/users/:id", authMiddleware, async (req, res) => {
    if (req.user.role !== "OWNER" && req.user.id !== req.params.id) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const { name, phone, role, isActive, password } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== void 0) updateData.phone = phone;
    if (role && req.user.role === "OWNER") updateData.role = role;
    if (isActive !== void 0 && req.user.role === "OWNER") updateData.isActive = isActive;
    if (password) {
      updateData.password = hashPassword(password);
      updateData.plainPassword = password;
    }
    const [updated] = await db.update(users).set(updateData).where((0, import_drizzle_orm3.and)(
      (0, import_drizzle_orm3.eq)(users.id, req.params.id),
      (0, import_drizzle_orm3.eq)(users.organizationId, req.organization.id)
    )).returning();
    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ ...updated, password: void 0 });
  });
  app2.delete("/api/users/:id", authMiddleware, async (req, res) => {
    if (req.user.role !== "OWNER") {
      return res.status(403).json({ error: "Only owner can delete users" });
    }
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }
    const userId = req.params.id;
    const orgId = req.organization.id;
    try {
      await db.delete(sessions).where((0, import_drizzle_orm3.eq)(sessions.userId, userId));
      await db.delete(courierLocationLatest).where((0, import_drizzle_orm3.eq)(courierLocationLatest.courierUserId, userId));
      await db.delete(courierLocations).where((0, import_drizzle_orm3.eq)(courierLocations.courierUserId, userId));
      await db.delete(orderAssistants).where((0, import_drizzle_orm3.eq)(orderAssistants.userId, userId));
      await db.update(orders).set({ managerId: null }).where((0, import_drizzle_orm3.eq)(orders.managerId, userId));
      await db.update(orders).set({ floristId: null }).where((0, import_drizzle_orm3.eq)(orders.floristId, userId));
      await db.update(orders).set({ courierId: null }).where((0, import_drizzle_orm3.eq)(orders.courierId, userId));
      await db.update(orderHistory).set({ changedByUserId: null }).where((0, import_drizzle_orm3.eq)(orderHistory.changedByUserId, userId));
      await db.update(orderExpenses).set({ createdByUserId: null }).where((0, import_drizzle_orm3.eq)(orderExpenses.createdByUserId, userId));
      await db.update(businessExpenses).set({ createdByUserId: null }).where((0, import_drizzle_orm3.eq)(businessExpenses.createdByUserId, userId));
      await db.delete(users).where((0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(users.id, userId),
        (0, import_drizzle_orm3.eq)(users.organizationId, orgId)
      ));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to delete user" });
    }
  });
  app2.get("/api/orders", authMiddleware, async (req, res) => {
    try {
      let query = db.select().from(orders).where((0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id)).orderBy((0, import_drizzle_orm3.desc)(orders.deliveryDateTime));
      const allOrders = await query;
      let filteredOrders = allOrders;
      if (req.user.role === "FLORIST") {
        filteredOrders = allOrders.filter(
          (o) => o.floristId === req.user.id || o.status === "NEW" && !o.floristId
        );
      } else if (req.user.role === "COURIER") {
        filteredOrders = allOrders.filter(
          (o) => o.courierId === req.user.id || o.status === "ASSEMBLED" && !o.courierId
        );
      }
      res.json(filteredOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: error.message || "Failed to fetch orders" });
    }
  });
  app2.get("/api/orders/with-coordinates", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "OWNER" && req.user.role !== "MANAGER") {
        return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0443" });
      }
      const orgId = req.user.organizationId;
      const statusFilter = req.query.status;
      let conditions = [
        (0, import_drizzle_orm3.eq)(orders.organizationId, orgId),
        import_drizzle_orm3.sql`${orders.latitude} IS NOT NULL`,
        import_drizzle_orm3.sql`${orders.longitude} IS NOT NULL`
      ];
      if (statusFilter) {
        const statuses = statusFilter.split(",");
        conditions.push((0, import_drizzle_orm3.inArray)(orders.status, statuses));
      }
      const result = await db.select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        clientName: orders.clientName,
        deliveryAddress: orders.address,
        status: orders.status,
        latitude: orders.latitude,
        longitude: orders.longitude,
        courierUserId: orders.courierId,
        deliveryDateTime: orders.deliveryDateTime
      }).from(orders).where((0, import_drizzle_orm3.and)(...conditions)).orderBy((0, import_drizzle_orm3.desc)(orders.deliveryDateTime));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/orders/:id", authMiddleware, async (req, res) => {
    try {
      const [order] = await db.select().from(orders).where((0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(orders.id, req.params.id),
        (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id)
      ));
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const orderAttachments = await db.select().from(attachments).where((0, import_drizzle_orm3.eq)(attachments.orderId, order.id));
      const historyRaw = await db.select().from(orderHistory).where((0, import_drizzle_orm3.eq)(orderHistory.orderId, order.id)).orderBy((0, import_drizzle_orm3.desc)(orderHistory.changedAt));
      const historyWithNames = await Promise.all(
        historyRaw.map(async (h) => {
          let changedByName = null;
          if (h.changedByUserId) {
            const [user] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.id, h.changedByUserId));
            changedByName = user?.name || null;
          }
          return { ...h, changedByName };
        })
      );
      const assistants = await db.select().from(orderAssistants).where((0, import_drizzle_orm3.eq)(orderAssistants.orderId, order.id));
      const assistantsWithNames = await Promise.all(
        assistants.map(async (a) => {
          const [user] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.id, a.userId));
          return { ...a, userName: user?.name || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439" };
        })
      );
      res.json({ ...order, attachments: orderAttachments, history: historyWithNames, assistants: assistantsWithNames });
    } catch (error) {
      console.error("Error fetching order details:", error);
      res.status(500).json({ error: error.message || "Failed to fetch order details" });
    }
  });
  app2.post("/api/orders", authMiddleware, async (req, res) => {
    if (req.user.role !== "MANAGER" && req.user.role !== "OWNER") {
      return res.status(403).json({ error: "Only managers can create orders" });
    }
    const { clientName, clientPhone, address, deliveryDateTime, deliveryDateTimeEnd, amount, comment, floristId, courierId, externalFloristName, externalFloristPhone, externalCourierName, externalCourierPhone, paymentStatus, paymentMethod, paymentDetails, clientSource, clientSourceId } = req.body;
    if (!clientName || !clientPhone || !address || !deliveryDateTime || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const dayStart = new Date(deliveryDateTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(deliveryDateTime);
    dayEnd.setHours(23, 59, 59, 999);
    const duplicates = await db.select().from(orders).where((0, import_drizzle_orm3.and)(
      (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id),
      (0, import_drizzle_orm3.eq)(orders.clientPhone, clientPhone),
      (0, import_drizzle_orm3.eq)(orders.amount, amount),
      (0, import_drizzle_orm3.gte)(orders.deliveryDateTime, dayStart.getTime()),
      (0, import_drizzle_orm3.lte)(orders.deliveryDateTime, dayEnd.getTime())
    ));
    if (duplicates.length > 0) {
      return res.status(409).json({
        error: "Possible duplicate order found",
        duplicates
      });
    }
    const now = Date.now();
    const [maxResult] = await db.select({ maxNum: (0, import_drizzle_orm3.max)(orders.orderNumber) }).from(orders).where((0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id));
    const nextOrderNumber = (maxResult?.maxNum || 0) + 1;
    const [order] = await db.insert(orders).values({
      organizationId: req.organization.id,
      orderNumber: nextOrderNumber,
      clientName,
      clientPhone,
      address,
      deliveryDateTime,
      deliveryDateTimeEnd: deliveryDateTimeEnd || null,
      amount,
      status: "NEW",
      managerId: req.user.id,
      floristId: floristId || null,
      courierId: courierId || null,
      externalFloristName: externalFloristName || null,
      externalFloristPhone: externalFloristPhone || null,
      externalCourierName: externalCourierName || null,
      externalCourierPhone: externalCourierPhone || null,
      comment: comment || null,
      paymentStatus: paymentStatus || "NOT_PAID",
      paymentMethod: paymentMethod || null,
      paymentDetails: paymentDetails || null,
      clientSource: clientSource || "PHONE",
      clientSourceId: clientSourceId || null,
      createdAt: now,
      updatedAt: now
    }).returning();
    await db.insert(orderHistory).values({
      orderId: order.id,
      fromStatus: null,
      toStatus: "NEW",
      changedByUserId: req.user.id,
      changedAt: now,
      note: "\u0417\u0430\u043A\u0430\u0437 \u0441\u043E\u0437\u0434\u0430\u043D"
    });
    res.json(order);
  });
  app2.put("/api/orders/:id", authMiddleware, async (req, res) => {
    const [existing] = await db.select().from(orders).where((0, import_drizzle_orm3.and)(
      (0, import_drizzle_orm3.eq)(orders.id, req.params.id),
      (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id)
    ));
    if (!existing) {
      return res.status(404).json({ error: "Order not found" });
    }
    const { clientName, clientPhone, address, deliveryDateTime, deliveryDateTimeEnd, amount, status, comment, floristId, courierId, externalFloristName, externalFloristPhone, externalCourierName, externalCourierPhone, paymentStatus, paymentMethod, paymentDetails, clientSource, clientSourceId } = req.body;
    const updateData = { updatedAt: Date.now() };
    if (clientName) updateData.clientName = clientName;
    if (clientPhone) updateData.clientPhone = clientPhone;
    if (address) updateData.address = address;
    if (deliveryDateTime) updateData.deliveryDateTime = deliveryDateTime;
    if (deliveryDateTimeEnd !== void 0) updateData.deliveryDateTimeEnd = deliveryDateTimeEnd;
    if (amount !== void 0) updateData.amount = amount;
    if (status) updateData.status = status;
    if (comment !== void 0) updateData.comment = comment;
    if (floristId !== void 0) updateData.floristId = floristId;
    if (courierId !== void 0) updateData.courierId = courierId;
    if (externalFloristName !== void 0) updateData.externalFloristName = externalFloristName;
    if (externalFloristPhone !== void 0) updateData.externalFloristPhone = externalFloristPhone;
    if (externalCourierName !== void 0) updateData.externalCourierName = externalCourierName;
    if (externalCourierPhone !== void 0) updateData.externalCourierPhone = externalCourierPhone;
    if (paymentStatus !== void 0) updateData.paymentStatus = paymentStatus;
    if (paymentMethod !== void 0) updateData.paymentMethod = paymentMethod;
    if (paymentDetails !== void 0) updateData.paymentDetails = paymentDetails;
    if (clientSource !== void 0) updateData.clientSource = clientSource;
    if (clientSourceId !== void 0) updateData.clientSourceId = clientSourceId;
    const [updated] = await db.update(orders).set(updateData).where((0, import_drizzle_orm3.eq)(orders.id, req.params.id)).returning();
    if (status && status !== existing.status) {
      await db.insert(orderHistory).values({
        orderId: updated.id,
        fromStatus: existing.status,
        toStatus: status,
        changedByUserId: req.user.id,
        changedAt: Date.now(),
        note: req.body.statusNote || null
      });
    }
    res.json(updated);
  });
  app2.delete("/api/orders/:id", authMiddleware, async (req, res) => {
    if (req.user.role !== "MANAGER" && req.user.role !== "OWNER") {
      return res.status(403).json({ error: "Not authorized" });
    }
    await db.delete(orders).where((0, import_drizzle_orm3.and)(
      (0, import_drizzle_orm3.eq)(orders.id, req.params.id),
      (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id)
    ));
    res.json({ success: true });
  });
  app2.post("/api/orders/:id/attachments", authMiddleware, async (req, res) => {
    try {
      const { base64, type, mimeType } = req.body;
      if (!base64) {
        return res.status(400).json({ error: "base64 data required" });
      }
      const [order] = await db.select().from(orders).where((0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(orders.id, req.params.id),
        (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id)
      ));
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const buffer = Buffer.from(base64, "base64");
      if (buffer.length === 0) {
        return res.status(400).json({ error: "Invalid image data" });
      }
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "Image too large (max 10MB)" });
      }
      const ext = (mimeType || "image/jpeg").split("/")[1] || "jpg";
      const filename = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, filename), buffer);
      const finalUri = `/api/uploads/${filename}`;
      const [attachment] = await db.insert(attachments).values({
        orderId: order.id,
        type: type || "PHOTO",
        uri: finalUri,
        uploadedByUserId: req.user.id
      }).returning();
      res.json(attachment);
    } catch (error) {
      console.error("Attachment upload error:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });
  app2.delete("/api/attachments/:id", authMiddleware, async (req, res) => {
    try {
      const [attachment] = await db.select().from(attachments).where((0, import_drizzle_orm3.eq)(attachments.id, req.params.id));
      if (!attachment) {
        return res.status(404).json({ error: "Attachment not found" });
      }
      const isOwner = attachment.uploadedByUserId === req.user.id;
      const isManagerOrOwner = req.user.role === "OWNER" || req.user.role === "MANAGER";
      if (!isOwner && !isManagerOrOwner) {
        return res.status(403).json({ error: "Only the uploader or managers can delete photos" });
      }
      if (attachment.uri.startsWith("/uploads/") || attachment.uri.startsWith("/api/uploads/")) {
        const filename = attachment.uri.replace("/api/uploads/", "").replace("/uploads/", "");
        const filePath = path.join(process.cwd(), "uploads", filename);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.error("Failed to delete file:", e);
        }
      }
      await db.delete(attachments).where((0, import_drizzle_orm3.eq)(attachments.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Attachment delete error:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });
  app2.get("/api/orders/:id/assistants", authMiddleware, async (req, res) => {
    const [order] = await db.select().from(orders).where(
      (0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(orders.id, req.params.id), (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id))
    );
    if (!order) return res.status(404).json({ error: "Order not found" });
    const assistants = await db.select().from(orderAssistants).where((0, import_drizzle_orm3.eq)(orderAssistants.orderId, order.id));
    const assistantsWithNames = await Promise.all(
      assistants.map(async (a) => {
        const [user] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.id, a.userId));
        return { ...a, userName: user?.name || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439" };
      })
    );
    res.json(assistantsWithNames);
  });
  app2.post("/api/orders/:id/assistants", authMiddleware, async (req, res) => {
    if (req.user.role !== "MANAGER" && req.user.role !== "OWNER") {
      return res.status(403).json({ error: "Only managers can add assistants" });
    }
    const [order] = await db.select().from(orders).where(
      (0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(orders.id, req.params.id), (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id))
    );
    if (!order) return res.status(404).json({ error: "Order not found" });
    const { userId, role } = req.body;
    if (!userId || !role) return res.status(400).json({ error: "userId and role are required" });
    if (role !== "FLORIST" && role !== "COURIER") return res.status(400).json({ error: "Role must be FLORIST or COURIER" });
    const existing = await db.select().from(orderAssistants).where(
      (0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(orderAssistants.orderId, order.id), (0, import_drizzle_orm3.eq)(orderAssistants.userId, userId))
    );
    if (existing.length > 0) return res.status(400).json({ error: "User is already an assistant on this order" });
    const [assistant] = await db.insert(orderAssistants).values({
      orderId: order.id,
      userId,
      role
    }).returning();
    const [user] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
    res.json({ ...assistant, userName: user?.name || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439" });
  });
  app2.delete("/api/orders/:id/assistants/:assistantId", authMiddleware, async (req, res) => {
    if (req.user.role !== "MANAGER" && req.user.role !== "OWNER") {
      return res.status(403).json({ error: "Only managers can remove assistants" });
    }
    await db.delete(orderAssistants).where((0, import_drizzle_orm3.eq)(orderAssistants.id, req.params.assistantId));
    res.json({ success: true });
  });
  app2.get("/api/orders/:id/expenses", authMiddleware, async (req, res) => {
    try {
      const orderId = req.params.id;
      const [order] = await db.select().from(orders).where(
        (0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(orders.id, orderId), (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id))
      );
      if (!order) {
        return res.status(404).json({ error: "\u0417\u0430\u043A\u0430\u0437 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      const expenses = await db.select({
        id: orderExpenses.id,
        orderId: orderExpenses.orderId,
        amount: orderExpenses.amount,
        comment: orderExpenses.comment,
        createdByUserId: orderExpenses.createdByUserId,
        createdAt: orderExpenses.createdAt,
        createdByName: users.name
      }).from(orderExpenses).leftJoin(users, (0, import_drizzle_orm3.eq)(orderExpenses.createdByUserId, users.id)).where((0, import_drizzle_orm3.eq)(orderExpenses.orderId, orderId)).orderBy((0, import_drizzle_orm3.desc)(orderExpenses.createdAt));
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/orders/:id/expenses", authMiddleware, async (req, res) => {
    try {
      const orderId = req.params.id;
      const { amount, comment } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "\u0421\u0443\u043C\u043C\u0430 \u0440\u0430\u0441\u0445\u043E\u0434\u0430 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u0430 \u0438 \u0434\u043E\u043B\u0436\u043D\u0430 \u0431\u044B\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435 0" });
      }
      if (!comment || comment.trim().length === 0) {
        return res.status(400).json({ error: "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u0435\u043D" });
      }
      const [order] = await db.select().from(orders).where(
        (0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(orders.id, orderId), (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id))
      );
      if (!order) {
        return res.status(404).json({ error: "\u0417\u0430\u043A\u0430\u0437 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      const [expense] = await db.insert(orderExpenses).values({
        orderId,
        amount: Math.floor(amount),
        comment: comment.trim(),
        createdByUserId: req.user.id
      }).returning();
      res.json({
        ...expense,
        createdByName: req.user.name
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/expenses/:id", authMiddleware, async (req, res) => {
    try {
      const expenseId = req.params.id;
      const [expense] = await db.select().from(orderExpenses).where((0, import_drizzle_orm3.eq)(orderExpenses.id, expenseId));
      if (!expense) {
        return res.status(404).json({ error: "\u0420\u0430\u0441\u0445\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      const [order] = await db.select().from(orders).where(
        (0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(orders.id, expense.orderId), (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id))
      );
      if (!order) {
        return res.status(403).json({ error: "\u041D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430" });
      }
      if (req.user.role !== "OWNER" && req.user.role !== "MANAGER" && expense.createdByUserId !== req.user.id) {
        return res.status(403).json({ error: "\u041D\u0435\u0442 \u043F\u0440\u0430\u0432 \u043D\u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435" });
      }
      await db.delete(orderExpenses).where((0, import_drizzle_orm3.eq)(orderExpenses.id, expenseId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/business-expenses", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "OWNER") {
        return res.status(403).json({ error: "Only owner can view business expenses" });
      }
      const expenses = await db.select().from(businessExpenses).where((0, import_drizzle_orm3.eq)(businessExpenses.organizationId, req.organization.id)).orderBy((0, import_drizzle_orm3.desc)(businessExpenses.date));
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/business-expenses", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "OWNER") {
        return res.status(403).json({ error: "Only owner can add business expenses" });
      }
      const { category, amount, comment, date } = req.body;
      if (!category || !amount || !comment) {
        return res.status(400).json({ error: "Category, amount and comment are required" });
      }
      const [expense] = await db.insert(businessExpenses).values({
        organizationId: req.organization.id,
        category,
        amount,
        comment,
        date: date || Date.now(),
        createdByUserId: req.user.id
      }).returning();
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/business-expenses/:id", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "OWNER") {
        return res.status(403).json({ error: "Only owner can delete business expenses" });
      }
      const [expense] = await db.select().from(businessExpenses).where((0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(businessExpenses.id, req.params.id),
        (0, import_drizzle_orm3.eq)(businessExpenses.organizationId, req.organization.id)
      ));
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      await db.delete(businessExpenses).where((0, import_drizzle_orm3.eq)(businessExpenses.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/reports/financial", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "OWNER") {
        return res.status(403).json({ error: "Not authorized" });
      }
      const { from, to } = req.query;
      const fromDate = from ? Number(from) : Date.now() - 30 * 24 * 60 * 60 * 1e3;
      const toDate = to ? Number(to) : Date.now();
      const orgOrders = await db.select().from(orders).where((0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id),
        (0, import_drizzle_orm3.gte)(orders.createdAt, fromDate),
        (0, import_drizzle_orm3.lte)(orders.createdAt, toDate)
      ));
      const orgOrderExpenses = await db.select({
        id: orderExpenses.id,
        orderId: orderExpenses.orderId,
        amount: orderExpenses.amount,
        comment: orderExpenses.comment,
        createdByUserId: orderExpenses.createdByUserId,
        createdAt: orderExpenses.createdAt
      }).from(orderExpenses).innerJoin(orders, (0, import_drizzle_orm3.eq)(orderExpenses.orderId, orders.id)).where((0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id),
        (0, import_drizzle_orm3.gte)(orderExpenses.createdAt, fromDate),
        (0, import_drizzle_orm3.lte)(orderExpenses.createdAt, toDate)
      ));
      let bizExpenses = [];
      if (req.user.role === "OWNER") {
        bizExpenses = await db.select().from(businessExpenses).where((0, import_drizzle_orm3.and)(
          (0, import_drizzle_orm3.eq)(businessExpenses.organizationId, req.organization.id),
          (0, import_drizzle_orm3.gte)(businessExpenses.date, fromDate),
          (0, import_drizzle_orm3.lte)(businessExpenses.date, toDate)
        ));
      }
      const totalIncome = orgOrders.filter((o) => o.status === "DELIVERED").reduce((sum2, o) => sum2 + o.amount, 0);
      const totalOrderExpenses = orgOrderExpenses.reduce((sum2, e) => sum2 + e.amount, 0);
      const totalBizExpenses = bizExpenses.reduce((sum2, e) => sum2 + e.amount, 0);
      const incomeByPaymentStatus = {};
      orgOrders.forEach((o) => {
        const ps = o.paymentStatus || "NOT_PAID";
        incomeByPaymentStatus[ps] = (incomeByPaymentStatus[ps] || 0) + o.amount;
      });
      const incomeByPaymentMethod = {};
      orgOrders.filter((o) => o.paymentMethod).forEach((o) => {
        incomeByPaymentMethod[o.paymentMethod] = (incomeByPaymentMethod[o.paymentMethod] || 0) + o.amount;
      });
      const bizExpensesByCategory = {};
      bizExpenses.forEach((e) => {
        bizExpensesByCategory[e.category] = (bizExpensesByCategory[e.category] || 0) + e.amount;
      });
      const incomeBySource = {};
      orgOrders.forEach((o) => {
        const src = o.clientSource || "PHONE";
        if (!incomeBySource[src]) incomeBySource[src] = { count: 0, amount: 0 };
        incomeBySource[src].count++;
        incomeBySource[src].amount += o.amount;
      });
      const ordersByStatus = {};
      orgOrders.forEach((o) => {
        ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
      });
      res.json({
        totalIncome,
        totalOrderExpenses,
        totalBizExpenses,
        totalExpenses: totalOrderExpenses + totalBizExpenses,
        netProfit: totalIncome - totalOrderExpenses - totalBizExpenses,
        ordersCount: orgOrders.length,
        deliveredCount: orgOrders.filter((o) => o.status === "DELIVERED").length,
        canceledCount: orgOrders.filter((o) => o.status === "CANCELED").length,
        incomeByPaymentStatus,
        incomeByPaymentMethod,
        bizExpensesByCategory,
        incomeBySource,
        ordersByStatus,
        orderExpensesList: orgOrderExpenses,
        bizExpensesList: bizExpenses
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/reports/orders", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "OWNER") {
        return res.status(403).json({ error: "Not authorized" });
      }
      const { from, to, status, paymentStatus, source, paymentMethod } = req.query;
      const fromDate = from ? Number(from) : Date.now() - 30 * 24 * 60 * 60 * 1e3;
      const toDate = to ? Number(to) : Date.now();
      let orgOrders = await db.select().from(orders).where((0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id),
        (0, import_drizzle_orm3.gte)(orders.createdAt, fromDate),
        (0, import_drizzle_orm3.lte)(orders.createdAt, toDate)
      )).orderBy((0, import_drizzle_orm3.desc)(orders.createdAt));
      if (status) {
        orgOrders = orgOrders.filter((o) => o.status === status);
      }
      if (paymentStatus) {
        orgOrders = orgOrders.filter((o) => (o.paymentStatus || "NOT_PAID") === paymentStatus);
      }
      if (source) {
        orgOrders = orgOrders.filter((o) => (o.clientSource || "PHONE") === source);
      }
      if (paymentMethod) {
        orgOrders = orgOrders.filter((o) => o.paymentMethod === paymentMethod);
      }
      res.json(orgOrders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/orders/:id/assign-self", authMiddleware, async (req, res) => {
    try {
      const role = req.user.role;
      if (role !== "FLORIST" && role !== "COURIER") {
        return res.status(403).json({ error: "Only florists and couriers can self-assign" });
      }
      const [order] = await db.select().from(orders).where((0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(orders.id, req.params.id),
        (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id)
      ));
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      const updateData = { updatedAt: Date.now() };
      if (role === "FLORIST") {
        if (order.floristId) {
          return res.status(400).json({ error: "Order already has a florist assigned" });
        }
        if (order.status !== "NEW") {
          return res.status(400).json({ error: "Can only assign to NEW orders" });
        }
        updateData.floristId = req.user.id;
        updateData.status = "IN_WORK";
        await db.insert(orderHistory).values({
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "IN_WORK",
          changedByUserId: req.user.id,
          changedAt: Date.now(),
          note: `\u0424\u043B\u043E\u0440\u0438\u0441\u0442 ${req.user.name} \u0432\u0437\u044F\u043B \u0437\u0430\u043A\u0430\u0437 \u0432 \u0440\u0430\u0431\u043E\u0442\u0443`
        });
      } else {
        if (order.courierId) {
          return res.status(400).json({ error: "Order already has a courier assigned" });
        }
        if (order.status !== "ASSEMBLED") {
          return res.status(400).json({ error: "Can only assign to ASSEMBLED orders" });
        }
        updateData.courierId = req.user.id;
        updateData.status = "ON_DELIVERY";
        await db.insert(orderHistory).values({
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "ON_DELIVERY",
          changedByUserId: req.user.id,
          changedAt: Date.now(),
          note: `\u041A\u0443\u0440\u044C\u0435\u0440 ${req.user.name} \u0432\u0437\u044F\u043B \u0437\u0430\u043A\u0430\u0437 \u043D\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0443`
        });
      }
      const [updated] = await db.update(orders).set(updateData).where((0, import_drizzle_orm3.eq)(orders.id, req.params.id)).returning();
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/orders/batch-assign", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "COURIER") {
        return res.status(403).json({ error: "Only couriers can batch assign" });
      }
      const { orderIds } = req.body;
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ error: "Order IDs required" });
      }
      const results = [];
      const now = Date.now();
      for (const orderId of orderIds) {
        const [order] = await db.select().from(orders).where((0, import_drizzle_orm3.and)(
          (0, import_drizzle_orm3.eq)(orders.id, orderId),
          (0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id),
          (0, import_drizzle_orm3.eq)(orders.status, "ASSEMBLED"),
          (0, import_drizzle_orm3.isNull)(orders.courierId)
        ));
        if (order) {
          const [updated] = await db.update(orders).set({
            courierId: req.user.id,
            status: "ON_DELIVERY",
            updatedAt: now
          }).where((0, import_drizzle_orm3.eq)(orders.id, orderId)).returning();
          await db.insert(orderHistory).values({
            orderId: order.id,
            fromStatus: order.status,
            toStatus: "ON_DELIVERY",
            changedByUserId: req.user.id,
            changedAt: now,
            note: `\u041A\u0443\u0440\u044C\u0435\u0440 ${req.user.name} \u0432\u0437\u044F\u043B \u0437\u0430\u043A\u0430\u0437 \u043D\u0430 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0443 (\u043F\u0430\u043A\u0435\u0442\u043D\u043E\u0435 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435)`
          });
          results.push(updated);
        }
      }
      res.json({ assigned: results.length, orders: results });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/all-order-expenses", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "OWNER") {
        return res.status(403).json({ error: "Only owner can view all expenses" });
      }
      const expenses = await db.select({
        id: orderExpenses.id,
        orderId: orderExpenses.orderId,
        amount: orderExpenses.amount,
        comment: orderExpenses.comment,
        createdByUserId: orderExpenses.createdByUserId,
        createdAt: orderExpenses.createdAt,
        orderClientName: orders.clientName,
        orderAmount: orders.amount
      }).from(orderExpenses).innerJoin(orders, (0, import_drizzle_orm3.eq)(orderExpenses.orderId, orders.id)).where((0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id)).orderBy((0, import_drizzle_orm3.desc)(orderExpenses.createdAt));
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/stats", authMiddleware, async (req, res) => {
    const allOrders = await db.select().from(orders).where((0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id));
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1e3;
    const stats = {
      total: allOrders.length,
      byStatus: {},
      overdue: 0,
      weeklyDelivered: 0,
      weeklyRevenue: 0
    };
    allOrders.forEach((order) => {
      stats.byStatus[order.status] = (stats.byStatus[order.status] || 0) + 1;
      if (order.status !== "DELIVERED" && order.status !== "CANCELED" && order.deliveryDateTime < now) {
        stats.overdue++;
      }
      if (order.status === "DELIVERED" && order.updatedAt >= weekAgo) {
        stats.weeklyDelivered++;
        stats.weeklyRevenue += order.amount;
      }
    });
    res.json(stats);
  });
  app2.get("/api/stats/employee/:userId", authMiddleware, async (req, res) => {
    const requestingUser = req.user;
    const userId = req.params.userId;
    if (requestingUser.role !== "OWNER" && requestingUser.role !== "MANAGER" && requestingUser.id !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const targetUser = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.id, userId)).then((r) => r[0]);
    if (!targetUser || targetUser.organizationId !== req.organization.id) {
      return res.status(404).json({ error: "User not found" });
    }
    const allOrders = await db.select().from(orders).where((0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id));
    const userHistory = await db.select().from(orderHistory).where((0, import_drizzle_orm3.eq)(orderHistory.changedByUserId, userId));
    const now = Date.now();
    const todayStart = /* @__PURE__ */ new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 24 * 60 * 60 * 1e3;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1e3;
    const ordersCreated = allOrders.filter((o) => o.managerId === userId).length;
    const ordersAssembled = userHistory.filter((h) => h.toStatus === "ASSEMBLED").length;
    const ordersDelivered = userHistory.filter((h) => h.toStatus === "DELIVERED").length;
    const statusChanges = userHistory.length;
    const assignedAsFlorist = allOrders.filter((o) => o.floristId === userId).length;
    const assignedAsCourier = allOrders.filter((o) => o.courierId === userId).length;
    const activeAsFlorist = allOrders.filter((o) => o.floristId === userId && (o.status === "NEW" || o.status === "IN_WORK")).length;
    const activeAsCourier = allOrders.filter((o) => o.courierId === userId && (o.status === "ASSEMBLED" || o.status === "ON_DELIVERY")).length;
    const ordersCreatedToday = allOrders.filter((o) => o.managerId === userId && o.createdAt >= todayStart.getTime()).length;
    const ordersAssembledToday = userHistory.filter((h) => h.toStatus === "ASSEMBLED" && h.changedAt >= todayStart.getTime()).length;
    const ordersDeliveredToday = userHistory.filter((h) => h.toStatus === "DELIVERED" && h.changedAt >= todayStart.getTime()).length;
    const ordersCreatedWeek = allOrders.filter((o) => o.managerId === userId && o.createdAt >= weekAgo).length;
    const ordersAssembledWeek = userHistory.filter((h) => h.toStatus === "ASSEMBLED" && h.changedAt >= weekAgo).length;
    const ordersDeliveredWeek = userHistory.filter((h) => h.toStatus === "DELIVERED" && h.changedAt >= weekAgo).length;
    const ordersCreatedMonth = allOrders.filter((o) => o.managerId === userId && o.createdAt >= monthAgo).length;
    const ordersAssembledMonth = userHistory.filter((h) => h.toStatus === "ASSEMBLED" && h.changedAt >= monthAgo).length;
    const ordersDeliveredMonth = userHistory.filter((h) => h.toStatus === "DELIVERED" && h.changedAt >= monthAgo).length;
    const deliveredOrders = allOrders.filter((o) => o.status === "DELIVERED");
    const totalRevenueAsManager = deliveredOrders.filter((o) => o.managerId === userId).reduce((s, o) => s + o.amount, 0);
    const canceledByUser = userHistory.filter((h) => h.toStatus === "CANCELED").length;
    const managerDeliveredOrders = deliveredOrders.filter((o) => o.managerId === userId);
    const revenueToday = managerDeliveredOrders.filter((o) => o.updatedAt >= todayStart.getTime()).reduce((s, o) => s + o.amount, 0);
    const revenueWeek = managerDeliveredOrders.filter((o) => o.updatedAt >= weekAgo).reduce((s, o) => s + o.amount, 0);
    const revenueMonth = managerDeliveredOrders.filter((o) => o.updatedAt >= monthAgo).reduce((s, o) => s + o.amount, 0);
    const canceledToday = userHistory.filter((h) => h.toStatus === "CANCELED" && h.changedAt >= todayStart.getTime()).length;
    const canceledWeek = userHistory.filter((h) => h.toStatus === "CANCELED" && h.changedAt >= weekAgo).length;
    const canceledMonth = userHistory.filter((h) => h.toStatus === "CANCELED" && h.changedAt >= monthAgo).length;
    res.json({
      ordersCreated,
      ordersAssembled,
      ordersDelivered,
      statusChanges,
      assignedAsFlorist,
      assignedAsCourier,
      activeAsFlorist,
      activeAsCourier,
      today: {
        ordersCreated: ordersCreatedToday,
        ordersAssembled: ordersAssembledToday,
        ordersDelivered: ordersDeliveredToday,
        revenue: revenueToday,
        canceled: canceledToday
      },
      week: {
        ordersCreated: ordersCreatedWeek,
        ordersAssembled: ordersAssembledWeek,
        ordersDelivered: ordersDeliveredWeek,
        revenue: revenueWeek,
        canceled: canceledWeek
      },
      month: {
        ordersCreated: ordersCreatedMonth,
        ordersAssembled: ordersAssembledMonth,
        ordersDelivered: ordersDeliveredMonth,
        revenue: revenueMonth,
        canceled: canceledMonth
      },
      totalRevenueAsManager,
      canceledByUser,
      role: targetUser.role
    });
  });
  app2.get("/api/stats/employee/:userId/orders", authMiddleware, async (req, res) => {
    const requestingUser = req.user;
    const userId = req.params.userId;
    const type = req.query.type;
    const periodParam = req.query.period;
    if (requestingUser.role !== "OWNER" && requestingUser.role !== "MANAGER" && requestingUser.id !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const validTypes = ["created", "assembled", "delivered", "canceled", "assigned_florist", "assigned_courier", "active_florist", "active_courier"];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid type parameter. Must be one of: " + validTypes.join(", ") });
    }
    let periodStart = null;
    if (periodParam) {
      const now = Date.now();
      if (periodParam === "today") {
        const todayStart = /* @__PURE__ */ new Date();
        todayStart.setHours(0, 0, 0, 0);
        periodStart = todayStart.getTime();
      } else if (periodParam === "week") {
        periodStart = now - 7 * 24 * 60 * 60 * 1e3;
      } else if (periodParam === "month") {
        periodStart = now - 30 * 24 * 60 * 60 * 1e3;
      }
    }
    const targetUser = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.id, userId)).then((r) => r[0]);
    if (!targetUser || targetUser.organizationId !== req.organization.id) {
      return res.status(404).json({ error: "User not found" });
    }
    const allOrders = await db.select().from(orders).where((0, import_drizzle_orm3.eq)(orders.organizationId, req.organization.id));
    let result = [];
    if (type === "created") {
      result = allOrders.filter((o) => o.managerId === userId && (!periodStart || o.createdAt >= periodStart)).sort((a, b) => b.createdAt - a.createdAt).map((o) => ({
        ...o,
        actionTimestamp: o.createdAt
      }));
    } else if (type === "assigned_florist") {
      result = allOrders.filter((o) => o.floristId === userId).sort((a, b) => b.updatedAt - a.updatedAt).map((o) => ({ ...o, actionTimestamp: o.updatedAt }));
    } else if (type === "assigned_courier") {
      result = allOrders.filter((o) => o.courierId === userId).sort((a, b) => b.updatedAt - a.updatedAt).map((o) => ({ ...o, actionTimestamp: o.updatedAt }));
    } else if (type === "active_florist") {
      result = allOrders.filter((o) => o.floristId === userId && (o.status === "NEW" || o.status === "IN_WORK")).sort((a, b) => a.deliveryDateTime - b.deliveryDateTime).map((o) => ({ ...o, actionTimestamp: o.updatedAt }));
    } else if (type === "active_courier") {
      result = allOrders.filter((o) => o.courierId === userId && (o.status === "ASSEMBLED" || o.status === "ON_DELIVERY")).sort((a, b) => a.deliveryDateTime - b.deliveryDateTime).map((o) => ({ ...o, actionTimestamp: o.updatedAt }));
    } else {
      const historyConditions = [
        (0, import_drizzle_orm3.eq)(orderHistory.changedByUserId, userId),
        (0, import_drizzle_orm3.eq)(orderHistory.toStatus, type.toUpperCase())
      ];
      if (periodStart) {
        historyConditions.push((0, import_drizzle_orm3.gte)(orderHistory.changedAt, periodStart));
      }
      const userHistory = await db.select().from(orderHistory).where((0, import_drizzle_orm3.and)(...historyConditions));
      const orderIds = userHistory.map((h) => h.orderId);
      const relevantOrders = allOrders.filter((o) => orderIds.includes(o.id));
      result = userHistory.map((history) => {
        const order = relevantOrders.find((o) => o.id === history.orderId);
        return order ? {
          ...order,
          actionTimestamp: history.changedAt
        } : null;
      }).filter((o) => o !== null).sort((a, b) => b.actionTimestamp - a.actionTimestamp);
    }
    res.json(result);
  });
  app2.post("/api/dev/verify", async (req, res) => {
    try {
      const { devLogin, devPassword } = req.body;
      if (!devLogin || !devPassword) {
        return res.status(400).json({ error: "\u041B\u043E\u0433\u0438\u043D \u0438 \u043F\u0430\u0440\u043E\u043B\u044C \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B" });
      }
      const settings = await db.select().from(devSettings).where((0, import_drizzle_orm3.eq)(devSettings.id, "default"));
      const currentDevLogin = settings[0]?.devLogin || "developer";
      const currentDevPassword = settings[0]?.devPassword || "20242024";
      if (devLogin !== currentDevLogin || devPassword !== currentDevPassword) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043B\u043E\u0433\u0438\u043D \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      res.json({ success: true, login: currentDevLogin });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/dev/change-credentials", async (req, res) => {
    try {
      const { currentLogin, currentPassword, newLogin, newPassword } = req.body;
      if (!currentLogin || !currentPassword) {
        return res.status(400).json({ error: "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043B\u043E\u0433\u0438\u043D \u0438 \u043F\u0430\u0440\u043E\u043B\u044C \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B" });
      }
      const settings = await db.select().from(devSettings).where((0, import_drizzle_orm3.eq)(devSettings.id, "default"));
      const currentDevLogin = settings[0]?.devLogin || "developer";
      const currentDevPassword = settings[0]?.devPassword || "20242024";
      if (currentLogin !== currentDevLogin || currentPassword !== currentDevPassword) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0442\u0435\u043A\u0443\u0449\u0438\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435" });
      }
      const updates = { updatedAt: Date.now() };
      if (newLogin) updates.devLogin = newLogin;
      if (newPassword) updates.devPassword = newPassword;
      await db.update(devSettings).set(updates).where((0, import_drizzle_orm3.eq)(devSettings.id, "default"));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  async function verifyDevCredentials(devLogin, devPassword) {
    const settings = await db.select().from(devSettings).where((0, import_drizzle_orm3.eq)(devSettings.id, "default"));
    const currentDevLogin = settings[0]?.devLogin || "developer";
    const currentDevPassword = settings[0]?.devPassword || "20242024";
    return devLogin === currentDevLogin && devPassword === currentDevPassword;
  }
  app2.post("/api/dev/organizations", async (req, res) => {
    try {
      const { devLogin, devPassword } = req.body;
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      const allOrganizations = await db.select().from(organizations);
      res.json(allOrganizations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/dev/users", async (req, res) => {
    try {
      const { devLogin, devPassword, organizationId } = req.body;
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      let allUsers;
      if (organizationId) {
        allUsers = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.organizationId, organizationId));
      } else {
        allUsers = await db.select().from(users);
      }
      res.json(allUsers.map((u) => ({
        ...u,
        password: void 0,
        testPassword: u.plainPassword || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D"
      })));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/dev/orders", async (req, res) => {
    try {
      const { devLogin, devPassword, organizationId } = req.body;
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      let allOrders;
      if (organizationId) {
        allOrders = await db.select().from(orders).where((0, import_drizzle_orm3.eq)(orders.organizationId, organizationId)).orderBy((0, import_drizzle_orm3.desc)(orders.createdAt));
      } else {
        allOrders = await db.select().from(orders).orderBy((0, import_drizzle_orm3.desc)(orders.createdAt));
      }
      res.json(allOrders);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/dev/login-as-user", async (req, res) => {
    try {
      const { devLogin, devPassword, userId } = req.body;
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      if (!userId) {
        return res.status(400).json({ error: "ID \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u0435\u043D" });
      }
      const [user] = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      if (!user) {
        return res.status(404).json({ error: "\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      const token = crypto.randomUUID();
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1e3;
      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt
      });
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          isActive: user.isActive
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/dev/stats", async (req, res) => {
    try {
      const { devLogin, devPassword } = req.body;
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      const allOrganizations = await db.select().from(organizations);
      const allUsers = await db.select().from(users);
      const allOrders = await db.select().from(orders);
      const allSessions = await db.select().from(sessions);
      const now = Date.now();
      const activeSessions = allSessions.filter((s) => s.expiresAt > now);
      const stats = {
        totalOrganizations: allOrganizations.length,
        totalUsers: allUsers.length,
        totalOrders: allOrders.length,
        activeSessions: activeSessions.length,
        ordersByStatus: {},
        totalRevenue: 0
      };
      allOrders.forEach((order) => {
        stats.ordersByStatus[order.status] = (stats.ordersByStatus[order.status] || 0) + 1;
        if (order.status === "DELIVERED") {
          stats.totalRevenue += order.amount;
        }
      });
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/dev/organizations/delete", async (req, res) => {
    try {
      const { devLogin, devPassword, organizationId } = req.body;
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      await db.delete(courierLocationLatest).where((0, import_drizzle_orm3.eq)(courierLocationLatest.organizationId, organizationId));
      await db.delete(courierLocations).where((0, import_drizzle_orm3.eq)(courierLocations.organizationId, organizationId));
      await db.delete(businessExpenses).where((0, import_drizzle_orm3.eq)(businessExpenses.organizationId, organizationId));
      const orgOrders = await db.select().from(orders).where((0, import_drizzle_orm3.eq)(orders.organizationId, organizationId));
      for (const order of orgOrders) {
        await db.delete(attachments).where((0, import_drizzle_orm3.eq)(attachments.orderId, order.id));
        await db.delete(orderHistory).where((0, import_drizzle_orm3.eq)(orderHistory.orderId, order.id));
        await db.delete(orderExpenses).where((0, import_drizzle_orm3.eq)(orderExpenses.orderId, order.id));
      }
      await db.delete(orders).where((0, import_drizzle_orm3.eq)(orders.organizationId, organizationId));
      const orgUsers = await db.select().from(users).where((0, import_drizzle_orm3.eq)(users.organizationId, organizationId));
      for (const user of orgUsers) {
        await db.delete(sessions).where((0, import_drizzle_orm3.eq)(sessions.userId, user.id));
      }
      await db.delete(users).where((0, import_drizzle_orm3.eq)(users.organizationId, organizationId));
      await db.delete(organizations).where((0, import_drizzle_orm3.eq)(organizations.id, organizationId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/dev/users/delete", async (req, res) => {
    try {
      const { devLogin, devPassword, userId } = req.body;
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      await db.delete(sessions).where((0, import_drizzle_orm3.eq)(sessions.userId, userId));
      await db.delete(users).where((0, import_drizzle_orm3.eq)(users.id, userId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/dev/orders/delete", async (req, res) => {
    try {
      const { devLogin, devPassword, orderId } = req.body;
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      await db.delete(attachments).where((0, import_drizzle_orm3.eq)(attachments.orderId, orderId));
      await db.delete(orderHistory).where((0, import_drizzle_orm3.eq)(orderHistory.orderId, orderId));
      await db.delete(orders).where((0, import_drizzle_orm3.eq)(orders.id, orderId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/dev/sessions", async (req, res) => {
    try {
      const { devLogin, devPassword } = req.body;
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      const allSessions = await db.select().from(sessions);
      const allUsers = await db.select().from(users);
      const allOrgs = await db.select().from(organizations);
      const userMap = new Map(allUsers.map((u) => [u.id, u]));
      const orgMap = new Map(allOrgs.map((o) => [o.id, o]));
      const now = Date.now();
      const result = allSessions.map((s) => {
        const user = userMap.get(s.userId);
        const org = user ? orgMap.get(user.organizationId) : null;
        return {
          id: s.id,
          userId: s.userId,
          userName: user?.name || "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439",
          userEmail: user?.email || "",
          userRole: user?.role || "",
          organizationName: org?.name || "",
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          isActive: s.expiresAt > now
        };
      }).sort((a, b) => b.createdAt - a.createdAt);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/dev/sessions/delete", async (req, res) => {
    try {
      const { devLogin, devPassword, sessionId } = req.body;
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      await db.delete(sessions).where((0, import_drizzle_orm3.eq)(sessions.id, sessionId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/dev/sessions/delete-user", async (req, res) => {
    try {
      const { devLogin, devPassword, userId } = req.body;
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      await db.delete(sessions).where((0, import_drizzle_orm3.eq)(sessions.userId, userId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/dev/sessions/cleanup", async (req, res) => {
    try {
      const { devLogin, devPassword } = req.body;
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      const now = Date.now();
      const result = await db.delete(sessions).where((0, import_drizzle_orm3.lte)(sessions.expiresAt, now));
      res.json({ success: true, message: "\u041F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043D\u044B\u0435 \u0441\u0435\u0441\u0441\u0438\u0438 \u0443\u0434\u0430\u043B\u0435\u043D\u044B" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/dev/generate-test-data", async (req, res) => {
    try {
      const { devLogin, devPassword } = req.body;
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      const orgNames = [
        "\u0426\u0432\u0435\u0442\u043E\u0447\u043D\u044B\u0439 \u0440\u0430\u0439",
        "\u0411\u0443\u043A\u0435\u0442 \u0421\u0447\u0430\u0441\u0442\u044C\u044F",
        "\u0420\u043E\u0437\u043E\u0432\u044B\u0439 \u0441\u0430\u0434",
        "\u0424\u043B\u043E\u0440\u0430 \u0438 \u0424\u0430\u0443\u043D\u0430",
        "\u0426\u0432\u0435\u0442\u044B \u043E\u0442 \u041C\u0430\u0440\u0438\u0438"
      ];
      const clientNames = [
        "\u0410\u043D\u043D\u0430 \u041F\u0435\u0442\u0440\u043E\u0432\u0430",
        "\u0418\u0432\u0430\u043D \u0421\u0438\u0434\u043E\u0440\u043E\u0432",
        "\u041C\u0430\u0440\u0438\u044F \u041A\u043E\u0437\u043B\u043E\u0432\u0430",
        "\u0414\u043C\u0438\u0442\u0440\u0438\u0439 \u041D\u043E\u0432\u0438\u043A\u043E\u0432",
        "\u0415\u043B\u0435\u043D\u0430 \u0412\u043E\u043B\u043A\u043E\u0432\u0430",
        "\u0410\u043B\u0435\u043A\u0441\u0435\u0439 \u041C\u043E\u0440\u043E\u0437\u043E\u0432",
        "\u041D\u0430\u0442\u0430\u043B\u044C\u044F \u0421\u043E\u043A\u043E\u043B\u043E\u0432\u0430",
        "\u0421\u0435\u0440\u0433\u0435\u0439 \u041F\u043E\u043F\u043E\u0432",
        "\u041E\u043B\u044C\u0433\u0430 \u041B\u0435\u0431\u0435\u0434\u0435\u0432\u0430",
        "\u0410\u043D\u0434\u0440\u0435\u0439 \u0424\u0435\u0434\u043E\u0440\u043E\u0432",
        "\u0422\u0430\u0442\u044C\u044F\u043D\u0430 \u041C\u0438\u0445\u0430\u0439\u043B\u043E\u0432\u0430",
        "\u041F\u0430\u0432\u0435\u043B \u041E\u0440\u043B\u043E\u0432"
      ];
      const flowerDescriptions = [
        "\u0411\u0443\u043A\u0435\u0442 \u0438\u0437 25 \u043A\u0440\u0430\u0441\u043D\u044B\u0445 \u0440\u043E\u0437",
        '\u041A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u044F "\u0412\u0435\u0441\u0435\u043D\u043D\u044F\u044F \u0441\u0432\u0435\u0436\u0435\u0441\u0442\u044C"',
        "\u041A\u043E\u0440\u0437\u0438\u043D\u0430 \u0441 \u043B\u0438\u043B\u0438\u044F\u043C\u0438",
        "\u0421\u0432\u0430\u0434\u0435\u0431\u043D\u044B\u0439 \u0431\u0443\u043A\u0435\u0442 \u043D\u0435\u0432\u0435\u0441\u0442\u044B",
        "\u0411\u0443\u043A\u0435\u0442 \u0438\u0437 \u043F\u0438\u043E\u043D\u043E\u0432",
        "\u041A\u043E\u0440\u043E\u0431\u043A\u0430 \u0441 \u043E\u0440\u0445\u0438\u0434\u0435\u044F\u043C\u0438",
        '\u0411\u0443\u043A\u0435\u0442 "\u0420\u0430\u0434\u0443\u0433\u0430"',
        "\u041A\u043E\u043C\u043F\u043E\u0437\u0438\u0446\u0438\u044F \u0438\u0437 \u0442\u044E\u043B\u044C\u043F\u0430\u043D\u043E\u0432",
        "\u0411\u0443\u043A\u0435\u0442 \u0438\u0437 \u0445\u0440\u0438\u0437\u0430\u043D\u0442\u0435\u043C",
        "\u0422\u0440\u0430\u0443\u0440\u043D\u044B\u0439 \u0432\u0435\u043D\u043E\u043A",
        '\u0411\u0443\u043A\u0435\u0442 "\u0420\u043E\u043C\u0430\u043D\u0442\u0438\u043A\u0430"',
        "\u041A\u043E\u0440\u0437\u0438\u043D\u0430 \u0444\u0440\u0443\u043A\u0442\u043E\u0432 \u0441 \u0446\u0432\u0435\u0442\u0430\u043C\u0438"
      ];
      const moscowAddresses = [
        { addr: "\u0443\u043B. \u0422\u0432\u0435\u0440\u0441\u043A\u0430\u044F, 15, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.7648, lon: 37.6055 },
        { addr: "\u043F\u0440. \u041C\u0438\u0440\u0430, 42, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.7812, lon: 37.6332 },
        { addr: "\u0443\u043B. \u0410\u0440\u0431\u0430\u0442, 8, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.7513, lon: 37.5916 },
        { addr: "\u041A\u0443\u0442\u0443\u0437\u043E\u0432\u0441\u043A\u0438\u0439 \u043F\u0440., 23, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.7402, lon: 37.5534 },
        { addr: "\u0443\u043B. \u0411\u043E\u043B\u044C\u0448\u0430\u044F \u041E\u0440\u0434\u044B\u043D\u043A\u0430, 100, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.735, lon: 37.627 },
        { addr: "\u041B\u0435\u043D\u0438\u043D\u0433\u0440\u0430\u0434\u0441\u043A\u0438\u0439 \u043F\u0440., 5, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.7867, lon: 37.5697 },
        { addr: "\u0443\u043B. \u0411\u0430\u0443\u043C\u0430\u043D\u0441\u043A\u0430\u044F, 67, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.7722, lon: 37.6788 },
        { addr: "\u0421\u0430\u0434\u043E\u0432\u043E\u0435 \u043A\u043E\u043B\u044C\u0446\u043E, 12, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.759, lon: 37.642 },
        { addr: "\u0443\u043B. \u041F\u043E\u043A\u0440\u043E\u0432\u043A\u0430, 33, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.7595, lon: 37.6495 },
        { addr: "\u041D\u043E\u0432\u044B\u0439 \u0410\u0440\u0431\u0430\u0442, 21, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.752, lon: 37.587 },
        { addr: "\u0443\u043B. \u041C\u0430\u0440\u043E\u0441\u0435\u0439\u043A\u0430, 7, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.757, lon: 37.637 },
        { addr: "\u041F\u0440\u0435\u0447\u0438\u0441\u0442\u0435\u043D\u043A\u0430, 40, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.739, lon: 37.595 },
        { addr: "\u0443\u043B. \u041D\u0438\u043A\u043E\u043B\u044C\u0441\u043A\u0430\u044F, 10, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.757, lon: 37.623 },
        { addr: "\u041A\u043E\u043C\u0441\u043E\u043C\u043E\u043B\u044C\u0441\u043A\u0438\u0439 \u043F\u0440., 28, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.728, lon: 37.589 },
        { addr: "\u0443\u043B. \u0421\u0440\u0435\u0442\u0435\u043D\u043A\u0430, 15, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.768, lon: 37.633 },
        { addr: "\u0426\u0432\u0435\u0442\u043D\u043E\u0439 \u0431\u0443\u043B., 19, \u041C\u043E\u0441\u043A\u0432\u0430", lat: 55.771, lon: 37.62 }
      ];
      const paymentStatuses = ["NOT_PAID", "ADVANCE", "PAID"];
      const clientSources = ["PHONE", "WHATSAPP", "TELEGRAM", "INSTAGRAM", "WEBSITE"];
      const createdOrgs = [];
      const createdUsers = [];
      const createdOrders = [];
      const suffix = Date.now().toString(36);
      for (let i = 0; i < 5; i++) {
        const orgId = crypto.randomUUID();
        const orgName = orgNames[i];
        await db.insert(organizations).values({
          id: orgId,
          name: orgName,
          createdAt: Math.floor(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1e3)
        });
        createdOrgs.push({ id: orgId, name: orgName });
        const hashedPassword = await hashPassword("Test1234");
        const ownerId = crypto.randomUUID();
        await db.insert(users).values({
          id: ownerId,
          organizationId: orgId,
          email: `owner${i + 1}_${suffix}@test.ru`,
          password: hashedPassword,
          plainPassword: "Test1234",
          name: `\u0412\u043B\u0430\u0434\u0435\u043B\u0435\u0446 ${i + 1}`,
          role: "OWNER",
          isActive: true,
          createdAt: Date.now()
        });
        createdUsers.push({ id: ownerId, role: "OWNER", orgId });
        const managerId = crypto.randomUUID();
        const manager2Id = crypto.randomUUID();
        await db.insert(users).values({
          id: managerId,
          organizationId: orgId,
          email: `manager${i + 1}_${suffix}@test.ru`,
          password: hashedPassword,
          plainPassword: "Test1234",
          name: `\u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 ${i * 2 + 1}`,
          role: "MANAGER",
          isActive: true,
          createdAt: Date.now()
        });
        await db.insert(users).values({
          id: manager2Id,
          organizationId: orgId,
          email: `manager${i + 1}b_${suffix}@test.ru`,
          password: hashedPassword,
          plainPassword: "Test1234",
          name: `\u041C\u0435\u043D\u0435\u0434\u0436\u0435\u0440 ${i * 2 + 2}`,
          role: "MANAGER",
          isActive: true,
          createdAt: Date.now()
        });
        createdUsers.push({ id: managerId, role: "MANAGER", orgId });
        createdUsers.push({ id: manager2Id, role: "MANAGER", orgId });
        const floristIds = [];
        for (let f = 0; f < 3; f++) {
          const fId = crypto.randomUUID();
          await db.insert(users).values({
            id: fId,
            organizationId: orgId,
            email: `florist${i + 1}_${f + 1}_${suffix}@test.ru`,
            password: hashedPassword,
            plainPassword: "Test1234",
            name: `\u0424\u043B\u043E\u0440\u0438\u0441\u0442 ${i * 3 + f + 1}`,
            role: "FLORIST",
            isActive: true,
            createdAt: Date.now()
          });
          floristIds.push(fId);
          createdUsers.push({ id: fId, role: "FLORIST", orgId });
        }
        const courierIds = [];
        const courierNames = [`\u041A\u0443\u0440\u044C\u0435\u0440 ${i * 2 + 1}`, `\u041A\u0443\u0440\u044C\u0435\u0440 ${i * 2 + 2}`];
        for (let c = 0; c < 2; c++) {
          const cId = crypto.randomUUID();
          await db.insert(users).values({
            id: cId,
            organizationId: orgId,
            email: `courier${i + 1}_${c + 1}_${suffix}@test.ru`,
            password: hashedPassword,
            plainPassword: "Test1234",
            name: courierNames[c],
            role: "COURIER",
            isActive: true,
            phone: `+7 9${(10 + i * 2 + c).toString()} 555 ${(10 + c).toString().padStart(2, "0")} ${(20 + i).toString().padStart(2, "0")}`,
            createdAt: Date.now()
          });
          courierIds.push(cId);
          createdUsers.push({ id: cId, role: "COURIER", orgId });
        }
        const statusDistribution = [
          "NEW",
          "NEW",
          "NEW",
          "NEW",
          "IN_WORK",
          "IN_WORK",
          "IN_WORK",
          "ASSEMBLED",
          "ASSEMBLED",
          "ASSEMBLED",
          "ON_DELIVERY",
          "ON_DELIVERY",
          "ON_DELIVERY",
          "DELIVERED",
          "DELIVERED",
          "DELIVERED",
          "DELIVERED",
          "DELIVERED",
          "CANCELED",
          "CANCELED"
        ];
        for (let j = 0; j < 20; j++) {
          const status = statusDistribution[j % statusDistribution.length];
          const addrData = moscowAddresses[j % moscowAddresses.length];
          const orderCreatedAt = Math.floor(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1e3);
          const isFutureDelivery = ["NEW", "IN_WORK", "ASSEMBLED", "ON_DELIVERY"].includes(status);
          const deliveryDateTime = isFutureDelivery ? Math.floor(Date.now() + (1 + Math.random() * 3) * 24 * 60 * 60 * 1e3) : Math.floor(orderCreatedAt + (1 + Math.random() * 3) * 24 * 60 * 60 * 1e3);
          const selectedFlorist = floristIds[j % floristIds.length];
          const selectedCourier = courierIds[j % courierIds.length];
          const selectedManager = j % 3 === 0 ? manager2Id : managerId;
          const paymentStatus = status === "DELIVERED" ? "PAID" : paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
          const [newOrder] = await db.insert(orders).values({
            organizationId: orgId,
            orderNumber: j + 1,
            clientName: clientNames[Math.floor(Math.random() * clientNames.length)],
            clientPhone: `+7 9${Math.floor(Math.random() * 100).toString().padStart(2, "0")} ${Math.floor(Math.random() * 1e3).toString().padStart(3, "0")} ${Math.floor(Math.random() * 100).toString().padStart(2, "0")} ${Math.floor(Math.random() * 100).toString().padStart(2, "0")}`,
            address: addrData.addr,
            latitude: addrData.lat.toString(),
            longitude: addrData.lon.toString(),
            geoStatus: "SUCCESS",
            deliveryDateTime,
            comment: flowerDescriptions[Math.floor(Math.random() * flowerDescriptions.length)],
            amount: Math.floor(2e3 + Math.random() * 8e3),
            status,
            paymentStatus,
            clientSource: clientSources[Math.floor(Math.random() * clientSources.length)],
            floristId: ["IN_WORK", "ASSEMBLED", "ON_DELIVERY", "DELIVERED"].includes(status) ? selectedFlorist : null,
            courierId: ["ON_DELIVERY", "DELIVERED"].includes(status) ? selectedCourier : null,
            managerId: selectedManager,
            createdAt: orderCreatedAt,
            updatedAt: Math.floor(Date.now())
          }).returning();
          createdOrders.push({ id: newOrder.id, status, orgId });
          await db.insert(orderHistory).values({
            orderId: newOrder.id,
            changedByUserId: selectedManager,
            fromStatus: null,
            toStatus: "NEW",
            changedAt: orderCreatedAt
          });
          if (["IN_WORK", "ASSEMBLED", "ON_DELIVERY", "DELIVERED"].includes(status)) {
            await db.insert(orderHistory).values({
              orderId: newOrder.id,
              changedByUserId: selectedFlorist,
              fromStatus: "NEW",
              toStatus: "IN_WORK",
              changedAt: orderCreatedAt + 36e5
            });
          }
          if (["ASSEMBLED", "ON_DELIVERY", "DELIVERED"].includes(status)) {
            await db.insert(orderHistory).values({
              orderId: newOrder.id,
              changedByUserId: selectedFlorist,
              fromStatus: "IN_WORK",
              toStatus: "ASSEMBLED",
              changedAt: orderCreatedAt + 72e5
            });
          }
          if (["ON_DELIVERY", "DELIVERED"].includes(status)) {
            await db.insert(orderHistory).values({
              orderId: newOrder.id,
              changedByUserId: selectedCourier,
              fromStatus: "ASSEMBLED",
              toStatus: "ON_DELIVERY",
              changedAt: orderCreatedAt + 108e5
            });
          }
          if (status === "DELIVERED") {
            await db.insert(orderHistory).values({
              orderId: newOrder.id,
              changedByUserId: selectedCourier,
              fromStatus: "ON_DELIVERY",
              toStatus: "DELIVERED",
              changedAt: orderCreatedAt + 144e5
            });
          }
          if (status === "CANCELED") {
            await db.insert(orderHistory).values({
              orderId: newOrder.id,
              changedByUserId: selectedManager,
              fromStatus: "NEW",
              toStatus: "CANCELED",
              changedAt: orderCreatedAt + 36e5
            });
          }
        }
        const courierLocations_data = [
          { lat: 55.7558, lon: 37.6173 },
          { lat: 55.769, lon: 37.595 }
        ];
        for (let c = 0; c < courierIds.length; c++) {
          await db.insert(courierLocationLatest).values({
            organizationId: orgId,
            courierUserId: courierIds[c],
            lat: courierLocations_data[c].lat.toString(),
            lon: courierLocations_data[c].lon.toString(),
            accuracy: "15",
            recordedAt: Date.now()
          });
          await db.insert(courierLocations).values({
            organizationId: orgId,
            courierUserId: courierIds[c],
            lat: courierLocations_data[c].lat.toString(),
            lon: courierLocations_data[c].lon.toString(),
            accuracy: "15",
            recordedAt: Date.now()
          });
        }
      }
      res.json({
        success: true,
        created: {
          organizations: createdOrgs.length,
          users: createdUsers.length,
          orders: createdOrders.length
        },
        credentials: {
          password: "Test1234",
          note: "\u0412\u0441\u0435 \u0442\u0435\u0441\u0442\u043E\u0432\u044B\u0435 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u044B \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E\u0442 \u044D\u0442\u043E\u0442 \u043F\u0430\u0440\u043E\u043B\u044C"
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/dev/clear-all-data", async (req, res) => {
    try {
      const { devLogin, devPassword, confirmClear } = req.body;
      if (!await verifyDevCredentials(devLogin, devPassword)) {
        return res.status(403).json({ error: "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0443\u0447\u0435\u0442\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0430" });
      }
      if (confirmClear !== "DELETE_ALL") {
        return res.status(400).json({ error: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435" });
      }
      await db.delete(courierLocationLatest);
      await db.delete(courierLocations);
      await db.delete(attachments);
      await db.delete(orderHistory);
      await db.delete(orderExpenses);
      await db.delete(businessExpenses);
      await db.delete(orders);
      await db.delete(sessions);
      await db.delete(users);
      await db.delete(organizations);
      res.json({ success: true, message: "\u0412\u0441\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u044B" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/courier/location", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "COURIER") {
        return res.status(403).json({ error: "\u0422\u043E\u043B\u044C\u043A\u043E \u043A\u0443\u0440\u044C\u0435\u0440\u044B \u043C\u043E\u0433\u0443\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u0433\u0435\u043E\u043F\u043E\u0437\u0438\u0446\u0438\u044E" });
      }
      const { lat, lon, accuracy, activeOrderId } = req.body;
      if (typeof lat !== "number" || typeof lon !== "number") {
        return res.status(400).json({ error: "lat \u0438 lon \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B" });
      }
      const orgId = req.user.organizationId;
      const courierId = req.user.id;
      const now = Date.now();
      await db.insert(courierLocationLatest).values({
        organizationId: orgId,
        courierUserId: courierId,
        lat,
        lon,
        accuracy: accuracy ?? null,
        recordedAt: now,
        updatedAt: now,
        activeOrderId: activeOrderId ?? null
      }).onConflictDoUpdate({
        target: [courierLocationLatest.organizationId, courierLocationLatest.courierUserId],
        set: {
          lat,
          lon,
          accuracy: accuracy ?? null,
          recordedAt: now,
          updatedAt: now,
          activeOrderId: activeOrderId ?? null
        }
      });
      await db.insert(courierLocations).values({
        organizationId: orgId,
        courierUserId: courierId,
        lat,
        lon,
        accuracy: accuracy ?? null,
        recordedAt: now,
        createdAt: now,
        activeOrderId: activeOrderId ?? null
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/courier/location/latest", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "COURIER") {
        return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u043A\u0443\u0440\u044C\u0435\u0440\u0430\u043C" });
      }
      const result = await db.select().from(courierLocationLatest).where((0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(courierLocationLatest.organizationId, req.user.organizationId),
        (0, import_drizzle_orm3.eq)(courierLocationLatest.courierUserId, req.user.id)
      )).limit(1);
      res.json(result[0] ?? null);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/manager/couriers/locations", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "OWNER" && req.user.role !== "MANAGER") {
        return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0443" });
      }
      const orgId = req.user.organizationId;
      const locations = await db.select({
        id: courierLocationLatest.id,
        courierUserId: courierLocationLatest.courierUserId,
        lat: courierLocationLatest.lat,
        lon: courierLocationLatest.lon,
        accuracy: courierLocationLatest.accuracy,
        recordedAt: courierLocationLatest.recordedAt,
        activeOrderId: courierLocationLatest.activeOrderId,
        courierName: users.name,
        courierPhone: users.phone
      }).from(courierLocationLatest).innerJoin(users, (0, import_drizzle_orm3.eq)(courierLocationLatest.courierUserId, users.id)).where((0, import_drizzle_orm3.eq)(courierLocationLatest.organizationId, orgId));
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/manager/couriers/:courierId/history", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "OWNER" && req.user.role !== "MANAGER") {
        return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0443" });
      }
      const orgId = req.user.organizationId;
      const { courierId } = req.params;
      const since = Number(req.query.since) || Date.now() - 24 * 60 * 60 * 1e3;
      const history = await db.select().from(courierLocations).where((0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(courierLocations.organizationId, orgId),
        (0, import_drizzle_orm3.eq)(courierLocations.courierUserId, courierId),
        (0, import_drizzle_orm3.gte)(courierLocations.recordedAt, since)
      )).orderBy(courierLocations.recordedAt);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  const routeCache = /* @__PURE__ */ new Map();
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function nearestNeighborRoute(points, startLat, startLon) {
    const n = points.length;
    if (n === 0) return { order: [], totalDistance: 0 };
    const visited = /* @__PURE__ */ new Set();
    const routeOrder = [];
    let totalDistance = 0;
    let curLat = startLat;
    let curLon = startLon;
    for (let step = 0; step < n; step++) {
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < n; i++) {
        if (visited.has(i)) continue;
        const d = haversineDistance(curLat, curLon, points[i].lat, points[i].lon);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      visited.add(bestIdx);
      routeOrder.push(points[bestIdx].id);
      totalDistance += bestDist;
      curLat = points[bestIdx].lat;
      curLon = points[bestIdx].lon;
    }
    return { order: routeOrder, totalDistance };
  }
  function twoOptImprove(points, order, maxIterations = 100) {
    const idxMap = new Map(points.map((p, i) => [p.id, i]));
    const route = order.map((id) => idxMap.get(id));
    let improved = true;
    let iterations = 0;
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      for (let i = 0; i < route.length - 1; i++) {
        for (let j = i + 2; j < route.length; j++) {
          const a = points[route[i]], b = points[route[i + 1]];
          const c = points[route[j]], d = points[route[(j + 1) % route.length]];
          const currentDist = haversineDistance(a.lat, a.lon, b.lat, b.lon) + haversineDistance(c.lat, c.lon, d?.lat ?? a.lat, d?.lon ?? a.lon);
          const newDist = haversineDistance(a.lat, a.lon, c.lat, c.lon) + haversineDistance(b.lat, b.lon, d?.lat ?? a.lat, d?.lon ?? a.lon);
          if (newDist < currentDist - 1e-3) {
            route.splice(i + 1, j - i, ...route.slice(i + 1, j + 1).reverse());
            improved = true;
          }
        }
      }
    }
    return route.map((i) => points[i].id);
  }
  app2.get("/api/manager/couriers/:courierId/route", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "OWNER" && req.user.role !== "MANAGER") {
        return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0443" });
      }
      const orgId = req.user.organizationId;
      const { courierId } = req.params;
      const cacheKey = `route:${orgId}:${courierId}`;
      const cached = routeCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return res.json(cached.data);
      }
      const courierLoc = await db.select().from(courierLocationLatest).where((0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(courierLocationLatest.organizationId, orgId),
        (0, import_drizzle_orm3.eq)(courierLocationLatest.courierUserId, courierId)
      )).limit(1);
      const courierOrders = await db.select().from(orders).where((0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(orders.organizationId, orgId),
        (0, import_drizzle_orm3.eq)(orders.courierUserId, courierId),
        (0, import_drizzle_orm3.or)(
          (0, import_drizzle_orm3.eq)(orders.status, "ASSEMBLED"),
          (0, import_drizzle_orm3.eq)(orders.status, "ON_DELIVERY")
        )
      ));
      const geoOrders = courierOrders.filter((o) => o.latitude != null && o.longitude != null).map((o) => ({ id: o.id, lat: o.latitude, lon: o.longitude }));
      if (geoOrders.length === 0) {
        const data2 = { route: [], totalDistanceKm: 0, courierLocation: courierLoc[0] ?? null, orderCount: 0 };
        return res.json(data2);
      }
      const startLat = courierLoc[0]?.lat ?? geoOrders[0].lat;
      const startLon = courierLoc[0]?.lon ?? geoOrders[0].lon;
      let { order: routeOrder, totalDistance } = nearestNeighborRoute(geoOrders, startLat, startLon);
      if (geoOrders.length <= 30) {
        routeOrder = twoOptImprove(geoOrders, routeOrder);
      }
      const orderedOrders = routeOrder.map((id) => {
        const o = courierOrders.find((co) => co.id === id);
        const geo = geoOrders.find((g) => g.id === id);
        return { orderId: id, lat: geo.lat, lon: geo.lon, address: o.deliveryAddress, status: o.status, clientName: o.clientName };
      });
      const data = {
        route: orderedOrders,
        totalDistanceKm: Math.round(totalDistance * 10) / 10,
        courierLocation: courierLoc[0] ?? null,
        orderCount: orderedOrders.length
      };
      routeCache.set(cacheKey, { data, expiresAt: Date.now() + 45e3 });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/orders/geocode-all", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "OWNER" && req.user.role !== "MANAGER") {
        return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0443" });
      }
      const orgId = req.user.organizationId;
      const ordersToGeocode = await db.select().from(orders).where((0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(orders.organizationId, orgId),
        import_drizzle_orm3.sql`${orders.latitude} IS NULL`,
        import_drizzle_orm3.sql`${orders.address} IS NOT NULL AND ${orders.address} != ''`,
        (0, import_drizzle_orm3.inArray)(orders.status, ["NEW", "IN_WORK", "ASSEMBLED", "ON_DELIVERY"])
      ));
      let processed = 0;
      let success = 0;
      let failed = 0;
      for (const order of ordersToGeocode) {
        processed++;
        try {
          const encodedAddress = encodeURIComponent(order.address);
          const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`, {
            headers: { "User-Agent": "FloraOrders/1.0" }
          });
          const results = await response.json();
          if (results && results.length > 0) {
            await db.update(orders).set({
              latitude: parseFloat(results[0].lat),
              longitude: parseFloat(results[0].lon),
              geoStatus: "SUCCESS",
              geoUpdatedAt: /* @__PURE__ */ new Date(),
              updatedAt: Date.now()
            }).where((0, import_drizzle_orm3.eq)(orders.id, order.id));
            success++;
          } else {
            await db.update(orders).set({ geoStatus: "FAILED", geoUpdatedAt: /* @__PURE__ */ new Date(), updatedAt: Date.now() }).where((0, import_drizzle_orm3.eq)(orders.id, order.id));
            failed++;
          }
          if (processed < ordersToGeocode.length) {
            await new Promise((resolve3) => setTimeout(resolve3, 1100));
          }
        } catch (e) {
          await db.update(orders).set({ geoStatus: "FAILED", geoUpdatedAt: /* @__PURE__ */ new Date(), updatedAt: Date.now() }).where((0, import_drizzle_orm3.eq)(orders.id, order.id));
          failed++;
        }
      }
      res.json({ success, failed, processed, total: ordersToGeocode.length });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/orders/:orderId/geocode", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "OWNER" && req.user.role !== "MANAGER") {
        return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0443" });
      }
      const { orderId } = req.params;
      const order = await db.select().from(orders).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(orders.id, orderId), (0, import_drizzle_orm3.eq)(orders.organizationId, req.user.organizationId))).limit(1);
      if (!order[0]) {
        return res.status(404).json({ error: "\u0417\u0430\u043A\u0430\u0437 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      if (!order[0].address) {
        return res.status(400).json({ error: "\u0410\u0434\u0440\u0435\u0441 \u0434\u043E\u0441\u0442\u0430\u0432\u043A\u0438 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D" });
      }
      await db.update(orders).set({ geoStatus: "PENDING", updatedAt: Date.now() }).where((0, import_drizzle_orm3.eq)(orders.id, orderId));
      try {
        const encodedAddress = encodeURIComponent(order[0].address);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1`, {
          headers: { "User-Agent": "FloraOrders/1.0" }
        });
        const results = await response.json();
        if (results && results.length > 0) {
          await db.update(orders).set({
            latitude: parseFloat(results[0].lat),
            longitude: parseFloat(results[0].lon),
            geoStatus: "SUCCESS",
            geoUpdatedAt: /* @__PURE__ */ new Date(),
            updatedAt: Date.now()
          }).where((0, import_drizzle_orm3.eq)(orders.id, orderId));
          res.json({ success: true, lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) });
        } else {
          await db.update(orders).set({ geoStatus: "FAILED", geoUpdatedAt: /* @__PURE__ */ new Date(), updatedAt: Date.now() }).where((0, import_drizzle_orm3.eq)(orders.id, orderId));
          res.json({ success: false, error: "\u0410\u0434\u0440\u0435\u0441 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
        }
      } catch (geoError) {
        await db.update(orders).set({ geoStatus: "FAILED", geoUpdatedAt: /* @__PURE__ */ new Date(), updatedAt: Date.now() }).where((0, import_drizzle_orm3.eq)(orders.id, orderId));
        res.status(500).json({ error: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0433\u0435\u043E\u043A\u043E\u0434\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F: " + geoError.message });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.post("/api/orders/:orderId/coordinates", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "OWNER" && req.user.role !== "MANAGER") {
        return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443 \u0438 \u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440\u0443" });
      }
      const { orderId } = req.params;
      const { lat, lon } = req.body;
      if (typeof lat !== "number" || typeof lon !== "number") {
        return res.status(400).json({ error: "lat \u0438 lon \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u044B" });
      }
      const order = await db.select().from(orders).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(orders.id, orderId), (0, import_drizzle_orm3.eq)(orders.organizationId, req.user.organizationId))).limit(1);
      if (!order[0]) {
        return res.status(404).json({ error: "\u0417\u0430\u043A\u0430\u0437 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D" });
      }
      await db.update(orders).set({
        latitude: lat,
        longitude: lon,
        geoStatus: "SUCCESS",
        geoUpdatedAt: /* @__PURE__ */ new Date(),
        updatedAt: Date.now()
      }).where((0, import_drizzle_orm3.eq)(orders.id, orderId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.delete("/api/courier/location/history", authMiddleware, async (req, res) => {
    try {
      if (req.user.role !== "OWNER") {
        return res.status(403).json({ error: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0443" });
      }
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1e3;
      const result = await db.delete(courierLocations).where((0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(courierLocations.organizationId, req.user.organizationId),
        (0, import_drizzle_orm3.lte)(courierLocations.recordedAt, cutoff)
      ));
      res.json({ success: true, message: "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0441\u0442\u0430\u0440\u0448\u0435 7 \u0434\u043D\u0435\u0439 \u0443\u0434\u0430\u043B\u0435\u043D\u0430" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app2.get("/api/map-page", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" crossorigin="anonymous" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js" crossorigin="anonymous"></script>
<style>
  * { margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; background: #e8e8e8; }
  #map { width: 100%; height: 100%; }
  .courier-marker {
    background: #4CAF7A; color: #fff; border-radius: 50%;
    width: 40px; height: 40px; display: flex; align-items: center;
    justify-content: center; font-size: 15px; font-weight: bold;
    border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.4); cursor: pointer;
  }
  .courier-marker.selected {
    background: #FF5722; width: 46px; height: 46px;
    border: 3px solid #FFD54F; box-shadow: 0 3px 12px rgba(255,87,34,0.5);
  }
  .order-marker {
    width: 28px; height: 28px; border-radius: 50%; border: 3px solid #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center;
    justify-content: center; font-size: 10px; color: #fff; font-weight: bold; cursor: pointer;
  }
  .popup-content { font-family: -apple-system, sans-serif; font-size: 13px; line-height: 1.5; min-width: 180px; }
  .popup-content .name { font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #1a1a1a; }
  .popup-content .detail { color: #666; font-size: 12px; }
  .popup-content .status { display: inline-block; padding: 2px 8px; border-radius: 4px; color: #fff; font-size: 11px; font-weight: 500; }
  .popup-content .address { margin-top: 4px; color: #444; font-size: 12px; }
  .popup-content .time { color: #999; font-size: 11px; margin-top: 2px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  function sendMsg(data) {
    var str = JSON.stringify(data);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(str);
    } else if (window.parent !== window) {
      window.parent.postMessage(str, '*');
    }
  }

  var map = L.map('map', { zoomControl: true }).setView([55.75, 37.62], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OSM', maxZoom: 19
  }).addTo(map);

  var courierMarkers = {};
  var orderMarkersLayer = L.layerGroup().addTo(map);
  var routeLayer = L.layerGroup().addTo(map);
  var firstLoad = true;

  var statusColors = {
    NEW: '#2196F3', IN_WORK: '#FF9800', ASSEMBLED: '#9C27B0',
    ON_DELIVERY: '#FF5722', DELIVERED: '#4CAF50', CANCELED: '#757575'
  };
  var statusLabels = {
    NEW: '\u041D\u043E\u0432\u044B\u0439', IN_WORK: '\u0412 \u0440\u0430\u0431\u043E\u0442\u0435', ASSEMBLED: '\u0421\u043E\u0431\u0440\u0430\u043D',
    ON_DELIVERY: '\u0414\u043E\u0441\u0442\u0430\u0432\u043A\u0430', DELIVERED: '\u0414\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D', CANCELED: '\u041E\u0442\u043C\u0435\u043D\u0435\u043D'
  };

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.split(' ');
    return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].substring(0, 2);
  }

  function timeAgo(ts) {
    var diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return diff + ' \u0441\u0435\u043A \u043D\u0430\u0437\u0430\u0434';
    if (diff < 3600) return Math.floor(diff / 60) + ' \u043C\u0438\u043D \u043D\u0430\u0437\u0430\u0434';
    return Math.floor(diff / 3600) + ' \u0447 \u043D\u0430\u0437\u0430\u0434';
  }

  function statusIcon(status) {
    switch(status) {
      case 'NEW': return 'H'; case 'IN_WORK': return 'P';
      case 'ASSEMBLED': return 'C'; case 'ON_DELIVERY': return 'D';
      default: return '';
    }
  }

  function updateData(data) {
    var couriers = data.couriers || [];
    var orders = data.orders || [];
    var selectedCourier = data.selectedCourier;

    routeLayer.clearLayers();

    var seenIds = {};
    couriers.forEach(function(c) {
      seenIds[c.courierUserId] = true;
      var isSelected = selectedCourier === c.courierUserId;
      var initials = getInitials(c.courierName);
      var className = 'courier-marker' + (isSelected ? ' selected' : '');
      var size = isSelected ? 46 : 40;

      var popupHtml = '<div class="popup-content">' +
        '<div class="name">' + c.courierName + '</div>' +
        '<div class="time">' + timeAgo(c.recordedAt) + '</div>' +
        (c.courierPhone ? '<div class="detail">' + c.courierPhone + '</div>' : '') +
        '</div>';

      if (courierMarkers[c.courierUserId]) {
        courierMarkers[c.courierUserId].setLatLng([c.lat, c.lon]);
        var icon = L.divIcon({ className: '', html: '<div class="' + className + '">' + initials + '</div>', iconSize: [size, size], iconAnchor: [size/2, size/2] });
        courierMarkers[c.courierUserId].setIcon(icon);
        courierMarkers[c.courierUserId].setPopupContent(popupHtml);
      } else {
        var icon = L.divIcon({ className: '', html: '<div class="' + className + '">' + initials + '</div>', iconSize: [size, size], iconAnchor: [size/2, size/2] });
        var marker = L.marker([c.lat, c.lon], { icon: icon, zIndexOffset: 1000 }).addTo(map);
        marker.bindPopup(popupHtml);
        courierMarkers[c.courierUserId] = marker;
      }

      if (isSelected) {
        var courierOrders = orders.filter(function(o) { return o.courierUserId === c.courierUserId; });
        if (courierOrders.length > 0) {
          courierOrders.forEach(function(o) {
            L.polyline([[c.lat, c.lon], [o.latitude, o.longitude]], {
              color: '#FF5722', weight: 3, opacity: 0.7, dashArray: '8, 4'
            }).addTo(routeLayer);
          });
        }
      }
    });

    Object.keys(courierMarkers).forEach(function(id) {
      if (!seenIds[id]) {
        map.removeLayer(courierMarkers[id]);
        delete courierMarkers[id];
      }
    });

    orderMarkersLayer.clearLayers();
    orders.forEach(function(o) {
      var color = statusColors[o.status] || '#999';
      var letter = statusIcon(o.status);
      var icon = L.divIcon({
        className: '',
        html: '<div class="order-marker" style="background:' + color + '">' + letter + '</div>',
        iconSize: [28, 28], iconAnchor: [14, 14],
      });
      var marker = L.marker([o.latitude, o.longitude], { icon: icon }).addTo(orderMarkersLayer);
      var statusHtml = '<span class="status" style="background:' + color + '">' + (statusLabels[o.status] || o.status) + '</span>';
      var dateStr = '';
      if (o.deliveryDateTime) {
        try {
          var d = new Date(parseInt(o.deliveryDateTime));
          dateStr = '<div class="time">' + d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'}) + '</div>';
        } catch(e) {}
      }
      var orderNum = o.orderNumber ? '#' + o.orderNumber + ' - ' : '';
      var openBtn = '<div style="margin-top:8px"><a href="#" onclick="sendMsg({type:\\'openOrder\\',orderId:\\'' + o.id + '\\'});return false;" style="display:inline-block;padding:6px 12px;background:#3B82F6;color:#fff;border-radius:6px;text-decoration:none;font-size:12px;font-weight:500;">\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u043A\u0430\u0437</a></div>';
      marker.bindPopup('<div class="popup-content"><div class="name">' + orderNum + (o.clientName || '\u0411\u0435\u0437 \u0438\u043C\u0435\u043D\u0438') + '</div>' + statusHtml + '<div class="address">' + (o.deliveryAddress || '') + '</div>' + dateStr + openBtn + '</div>');

      if (selectedCourier && o.courierUserId === selectedCourier) {
        marker.openPopup();
      }
    });

    if (firstLoad) {
      firstLoad = false;
      var allPoints = [];
      couriers.forEach(function(c) { allPoints.push([c.lat, c.lon]); });
      orders.forEach(function(o) { allPoints.push([o.latitude, o.longitude]); });
      if (allPoints.length > 0) {
        map.fitBounds(L.latLngBounds(allPoints).pad(0.15));
      }
    }

    if (selectedCourier) {
      var sc = couriers.find(function(c) { return c.courierUserId === selectedCourier; });
      if (sc) {
        map.setView([sc.lat, sc.lon], 14, { animate: true });
      }
    }
  }

  document.addEventListener('message', function(e) {
    try { var data = JSON.parse(e.data); if (data.type === 'updateData') updateData(data); } catch(err) {}
  });
  window.addEventListener('message', function(e) {
    try { var data = JSON.parse(e.data); if (data.type === 'updateData') updateData(data); } catch(err) {}
  });
</script>
</body>
</html>`);
  });
  const httpServer = (0, import_node_http.createServer)(app2);
  return httpServer;
}

// server/index.ts
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));
var app = (0, import_express.default)();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    if (process.env.APP_DOMAIN) {
      origins.add(`http://${process.env.APP_DOMAIN}`);
      origins.add(`https://${process.env.APP_DOMAIN}`);
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS, PATCH"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    import_express.default.json({
      limit: "20mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(import_express.default.urlencoded({ extended: false, limit: "20mb" }));
}
function setupUploads(app2) {
  const uploadsDir = path2.resolve(process.cwd(), "uploads");
  if (!fs2.existsSync(uploadsDir)) {
    fs2.mkdirSync(uploadsDir, { recursive: true });
  }
  app2.use("/uploads", import_express.default.static(uploadsDir, {
    maxAge: "30d",
    immutable: true
  }));
  app2.use("/api/uploads", import_express.default.static(uploadsDir, {
    maxAge: "30d",
    immutable: true
  }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path3.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path2.resolve(process.cwd(), "app.json");
    const appJsonContent = fs2.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, req, res) {
  const manifestPath = path2.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs2.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifestRaw = fs2.readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestRaw);
  if (manifest.launchAsset && manifest.launchAsset.url) {
    manifest.launchAsset.url = baseUrl + manifest.launchAsset.url;
  }
  if (manifest.assets) {
    manifest.assets = manifest.assets.map((asset) => ({
      ...asset,
      url: baseUrl + asset.url
    }));
  }
  res.send(JSON.stringify(manifest));
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const isProduction = process.env.NODE_ENV === "production";
  const webDistPath = path2.resolve(process.cwd(), "dist");
  const hasWebBuild = fs2.existsSync(webDistPath) && fs2.existsSync(path2.join(webDistPath, "index.html"));
  const templatePath = path2.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs2.existsSync(templatePath) ? fs2.readFileSync(templatePath, "utf-8") : null;
  const appName = getAppName();
  if (hasWebBuild) {
    log("Production mode: serving web build from dist/");
  } else {
    log("Development mode: serving static Expo files with dynamic manifest routing");
  }
  const deployFileMap = {
    "order-id": "app/order/[id].tsx",
    "routes": "server/routes.ts",
    "delivery-map": "app/delivery-map.tsx",
    "available-orders": "app/available-orders.tsx",
    "order-create": "app/order/create.tsx",
    "reports": "app/reports.tsx",
    "home": "app/home.tsx",
    "order-card": "components/OrderCard.tsx",
    "schema": "shared/schema.ts",
    "index-server": "server/index.ts"
  };
  app2.get("/deploy-file/:name", (req, res) => {
    const filePath = deployFileMap[req.params.name];
    if (!filePath) return res.status(404).send("Not found");
    const fullPath = path2.resolve(process.cwd(), filePath);
    if (!fs2.existsSync(fullPath)) return res.status(404).send("File missing");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.sendFile(fullPath);
  });
  const presPath = path2.resolve(process.cwd(), "server", "templates", "presentation.html");
  if (fs2.existsSync(presPath)) {
    app2.get("/presentation", (_req, res) => {
      res.sendFile(presPath);
    });
  }
  const userGuidePath = path2.resolve(process.cwd(), "server", "templates", "user-guide.html");
  if (fs2.existsSync(userGuidePath)) {
    app2.get("/user-guide", (_req, res) => {
      res.sendFile(userGuidePath);
    });
  }
  const deployGuidePath = path2.resolve(process.cwd(), "server", "templates", "deploy-guide.html");
  if (fs2.existsSync(deployGuidePath)) {
    app2.get("/deploy-guide", (_req, res) => {
      res.sendFile(deployGuidePath);
    });
  }
  const deployArchivePath = path2.resolve(process.cwd(), "floraorders-deploy.tar.gz");
  if (fs2.existsSync(deployArchivePath)) {
    app2.get("/download-deploy", (_req, res) => {
      res.download(deployArchivePath, "floraorders-deploy.tar.gz");
    });
  }
  if (hasWebBuild) {
    app2.use(import_express.default.static(webDistPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html") || filePath.endsWith(".json")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else {
          res.setHeader("Cache-Control", "public, max-age=604800, immutable");
        }
      }
    }));
    app2.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      if (req.path === "/presentation" || req.path === "/user-guide" || req.path === "/deploy-guide" || req.path === "/download-deploy") {
        return next();
      }
      if (req.path.startsWith("/deploy-file")) {
        return next();
      }
      const platform = req.header("expo-platform");
      if (platform && (platform === "ios" || platform === "android")) {
        return serveExpoManifest(platform, req, res);
      }
      const indexPath = path2.join(webDistPath, "index.html");
      if (fs2.existsSync(indexPath)) {
        res.setHeader("Cache-Control", "no-cache");
        return res.sendFile(indexPath);
      }
      next();
    });
  } else {
    app2.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      if (req.path !== "/" && req.path !== "/manifest") {
        return next();
      }
      const platform = req.header("expo-platform");
      if (platform && (platform === "ios" || platform === "android")) {
        return serveExpoManifest(platform, req, res);
      }
      if (req.path === "/" && landingPageTemplate) {
        return serveLandingPage({
          req,
          res,
          landingPageTemplate,
          appName
        });
      }
      next();
    });
    app2.use("/assets", import_express.default.static(path2.resolve(process.cwd(), "assets")));
    app2.use(import_express.default.static(path2.resolve(process.cwd(), "static-build")));
    log("Expo routing: Checking expo-platform header on / and /manifest");
  }
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupUploads(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
