import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, doublePrecision, varchar, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users as authUsers } from "./models/auth";

// Re-export auth models
export * from "./models/auth";
export { users as authUsers } from "./models/auth";

// === ENUMS ===
export const userRoleEnum = pgEnum('user_role', ['OWNER', 'MANAGER', 'FLORIST', 'COURIER']);
export const orderStatusEnum = pgEnum('order_status', ['NEW', 'IN_WORK', 'ASSEMBLED', 'ON_DELIVERY', 'DELIVERED', 'CANCELED']);
export const paymentStatusEnum = pgEnum('payment_status', ['NOT_PAID', 'ADVANCE', 'PAID']);
export const clientSourceEnum = pgEnum('client_source', ['PHONE', 'WHATSAPP', 'TELEGRAM', 'INSTAGRAM', 'WEBSITE', 'OTHER']);
export const businessExpenseCategoryEnum = pgEnum('business_expense_category', ['TAXES', 'RENT', 'SALARY', 'SUPPLIES', 'MARKETING', 'TRANSPORT', 'OTHER']);
export const geoStatusEnum = pgEnum('geo_status', ['NONE', 'PENDING', 'SUCCESS', 'FAILED']);
export const assistantRoleEnum = pgEnum('assistant_role', ['FLORIST', 'COURIER']);

// === TABLES ===

// Extend the auth users with app-specific data using a profile table
// We use the same ID as the auth user
export const userSettings = pgTable("user_settings", {
  userId: varchar("user_id").primaryKey().references(() => authUsers.id, { onDelete: 'cascade' }),
  role: userRoleEnum("role").notNull().default('MANAGER'),
  phone: text("phone"),
  organizationName: text("organization_name").default('My Flower Shop'),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: integer("order_number").notNull(), // User-facing readable ID
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  address: text("address").notNull(),
  deliveryDateTime: timestamp("delivery_date_time").notNull(),
  deliveryDateTimeEnd: timestamp("delivery_date_time_end"),
  amount: integer("amount").notNull(), // In cents/smallest unit
  status: orderStatusEnum("status").notNull().default('NEW'),
  
  // Staff assignments
  managerId: varchar("manager_id").references(() => authUsers.id, { onDelete: 'set null' }),
  floristId: varchar("florist_id").references(() => authUsers.id, { onDelete: 'set null' }),
  courierId: varchar("courier_id").references(() => authUsers.id, { onDelete: 'set null' }),
  
  // External partners (if internal staff not used)
  externalFloristName: text("external_florist_name"),
  externalFloristPhone: text("external_florist_phone"),
  externalCourierName: text("external_courier_name"),
  externalCourierPhone: text("external_courier_phone"),
  
  comment: text("comment"),
  paymentStatus: paymentStatusEnum("payment_status").default('NOT_PAID'),
  paymentMethod: text("payment_method"),
  paymentDetails: text("payment_details"),
  clientSource: clientSourceEnum("client_source").default('PHONE'),
  
  // Geolocation
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  geoStatus: geoStatusEnum("geo_status").default('NONE'),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  type: text("type").notNull().default('PHOTO'),
  uri: text("uri").notNull(), // URL or path
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderHistory = pgTable("order_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  fromStatus: orderStatusEnum("from_status"),
  toStatus: orderStatusEnum("to_status").notNull(),
  changedByUserId: varchar("changed_by_user_id").references(() => authUsers.id, { onDelete: 'set null' }),
  changedAt: timestamp("changed_at").defaultNow(),
  note: text("note"),
});

export const orderExpenses = pgTable("order_expenses", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  amount: integer("amount").notNull(),
  comment: text("comment").notNull(),
  createdByUserId: varchar("created_by_user_id").references(() => authUsers.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Additional assistants on an order
export const orderAssistants = pgTable("order_assistants", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  role: assistantRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Courier live location tracking
export const courierLocations = pgTable("courier_locations", {
  id: serial("id").primaryKey(),
  courierUserId: varchar("courier_user_id").notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  recordedAt: timestamp("recorded_at").defaultNow(),
  activeOrderId: integer("active_order_id").references(() => orders.id),
});

// === RELATIONS ===
export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(authUsers, {
    fields: [userSettings.userId],
    references: [authUsers.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  manager: one(authUsers, { fields: [orders.managerId], references: [authUsers.id], relationName: "manager" }),
  florist: one(authUsers, { fields: [orders.floristId], references: [authUsers.id], relationName: "florist" }),
  courier: one(authUsers, { fields: [orders.courierId], references: [authUsers.id], relationName: "courier" }),
  attachments: many(attachments),
  history: many(orderHistory),
  expenses: many(orderExpenses),
  assistants: many(orderAssistants),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  order: one(orders, { fields: [attachments.orderId], references: [orders.id] }),
}));

export const orderHistoryRelations = relations(orderHistory, ({ one }) => ({
  order: one(orders, { fields: [orderHistory.orderId], references: [orders.id] }),
  changedBy: one(authUsers, { fields: [orderHistory.changedByUserId], references: [authUsers.id] }),
}));

// === SCHEMAS & TYPES ===

// Note: We use createInsertSchema to generate Zod schemas from Drizzle tables
export const insertOrderSchema = createInsertSchema(orders).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  orderNumber: true, // Generated backend-side
  geoStatus: true,
  latitude: true,
  longitude: true
});

export const insertOrderExpenseSchema = createInsertSchema(orderExpenses).omit({ 
  id: true, 
  createdAt: true, 
  createdByUserId: true 
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  userId: true,
  updatedAt: true
});

// Export types
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type UserSetting = typeof userSettings.$inferSelect;
export type AuthUser = typeof authUsers.$inferSelect;
export type OrderHistoryItem = typeof orderHistory.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type OrderExpense = typeof orderExpenses.$inferSelect;
export type OrderAssistant = typeof orderAssistants.$inferSelect;

// Combined User type for frontend
export type User = AuthUser & Partial<UserSetting>;

// API Request Types
export type CreateOrderRequest = InsertOrder;
export type UpdateOrderRequest = Partial<InsertOrder>;
export type UpdateOrderStatusRequest = { status: typeof orderStatusEnum.enumValues[number]; note?: string };
export type CreateOrderExpenseRequest = z.infer<typeof insertOrderExpenseSchema>;
export type AssignStaffRequest = { role: 'FLORIST' | 'COURIER' | 'MANAGER'; userId: string | null };

// Enum Labels for UI
export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  IN_WORK: 'In Work',
  ASSEMBLED: 'Assembled',
  ON_DELIVERY: 'On Delivery',
  DELIVERED: 'Delivered',
  CANCELED: 'Canceled',
};

export const USER_ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  FLORIST: 'Florist',
  COURIER: 'Courier',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  NOT_PAID: 'Not Paid',
  ADVANCE: 'Advance',
  PAID: 'Paid',
};
