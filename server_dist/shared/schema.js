"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUSINESS_EXPENSE_CATEGORY_LABELS = exports.CLIENT_SOURCE_LABELS = exports.PAYMENT_STATUS_LABELS = exports.USER_ROLE_LABELS = exports.ORDER_STATUS_LABELS = exports.insertAttachmentSchema = exports.insertBusinessExpenseSchema = exports.insertOrderSchema = exports.insertUserSchema = exports.insertOrganizationSchema = exports.devSettings = exports.courierLocations = exports.courierLocationLatest = exports.orderAssistants = exports.assistantRoleEnum = exports.businessExpenses = exports.orderExpenses = exports.sessions = exports.orderHistory = exports.attachments = exports.orders = exports.users = exports.organizations = exports.geoStatusEnum = exports.businessExpenseCategoryEnum = exports.clientSourceEnum = exports.paymentStatusEnum = exports.orderStatusEnum = exports.userRoleEnum = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', ['OWNER', 'MANAGER', 'FLORIST', 'COURIER']);
exports.orderStatusEnum = (0, pg_core_1.pgEnum)('order_status', ['NEW', 'IN_WORK', 'ASSEMBLED', 'ON_DELIVERY', 'DELIVERED', 'CANCELED']);
exports.paymentStatusEnum = (0, pg_core_1.pgEnum)('payment_status', ['NOT_PAID', 'ADVANCE', 'PAID']);
exports.clientSourceEnum = (0, pg_core_1.pgEnum)('client_source', ['PHONE', 'WHATSAPP', 'TELEGRAM', 'INSTAGRAM', 'WEBSITE', 'OTHER']);
exports.businessExpenseCategoryEnum = (0, pg_core_1.pgEnum)('business_expense_category', ['TAXES', 'RENT', 'SALARY', 'SUPPLIES', 'MARKETING', 'TRANSPORT', 'OTHER']);
exports.geoStatusEnum = (0, pg_core_1.pgEnum)('geo_status', ['NONE', 'PENDING', 'SUCCESS', 'FAILED']);
exports.organizations = (0, pg_core_1.pgTable)("organizations", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.text)("name").notNull(),
    createdAt: (0, pg_core_1.bigint)("created_at", { mode: "number" }).notNull().default((0, drizzle_orm_1.sql) `extract(epoch from now()) * 1000`),
});
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    organizationId: (0, pg_core_1.varchar)("organization_id").notNull().references(() => exports.organizations.id, { onDelete: 'cascade' }),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
    plainPassword: (0, pg_core_1.text)("plain_password"),
    name: (0, pg_core_1.text)("name").notNull(),
    phone: (0, pg_core_1.text)("phone"),
    role: (0, exports.userRoleEnum)("role").notNull().default('MANAGER'),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.bigint)("created_at", { mode: "number" }).notNull().default((0, drizzle_orm_1.sql) `extract(epoch from now()) * 1000`),
}, (table) => [
    (0, pg_core_1.index)("users_org_idx").on(table.organizationId),
    (0, pg_core_1.index)("users_email_idx").on(table.email),
]);
exports.orders = (0, pg_core_1.pgTable)("orders", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    organizationId: (0, pg_core_1.varchar)("organization_id").notNull().references(() => exports.organizations.id, { onDelete: 'cascade' }),
    orderNumber: (0, pg_core_1.integer)("order_number"),
    clientName: (0, pg_core_1.text)("client_name").notNull(),
    clientPhone: (0, pg_core_1.text)("client_phone").notNull(),
    address: (0, pg_core_1.text)("address").notNull(),
    deliveryDateTime: (0, pg_core_1.bigint)("delivery_date_time", { mode: "number" }).notNull(),
    deliveryDateTimeEnd: (0, pg_core_1.bigint)("delivery_date_time_end", { mode: "number" }),
    amount: (0, pg_core_1.integer)("amount").notNull(),
    status: (0, exports.orderStatusEnum)("status").notNull().default('NEW'),
    managerId: (0, pg_core_1.varchar)("manager_id").references(() => exports.users.id, { onDelete: 'set null' }),
    floristId: (0, pg_core_1.varchar)("florist_id").references(() => exports.users.id, { onDelete: 'set null' }),
    courierId: (0, pg_core_1.varchar)("courier_id").references(() => exports.users.id, { onDelete: 'set null' }),
    externalFloristName: (0, pg_core_1.text)("external_florist_name"),
    externalFloristPhone: (0, pg_core_1.text)("external_florist_phone"),
    externalCourierName: (0, pg_core_1.text)("external_courier_name"),
    externalCourierPhone: (0, pg_core_1.text)("external_courier_phone"),
    comment: (0, pg_core_1.text)("comment"),
    paymentStatus: (0, exports.paymentStatusEnum)("payment_status").default('NOT_PAID'),
    paymentMethod: (0, pg_core_1.text)("payment_method"),
    paymentDetails: (0, pg_core_1.text)("payment_details"),
    clientSource: (0, exports.clientSourceEnum)("client_source").default('PHONE'),
    clientSourceId: (0, pg_core_1.text)("client_source_id"),
    latitude: (0, pg_core_1.doublePrecision)("latitude"),
    longitude: (0, pg_core_1.doublePrecision)("longitude"),
    geoStatus: (0, exports.geoStatusEnum)("geo_status").default('NONE'),
    geoUpdatedAt: (0, pg_core_1.timestamp)("geo_updated_at"),
    createdAt: (0, pg_core_1.bigint)("created_at", { mode: "number" }).notNull().default((0, drizzle_orm_1.sql) `extract(epoch from now()) * 1000`),
    updatedAt: (0, pg_core_1.bigint)("updated_at", { mode: "number" }).notNull().default((0, drizzle_orm_1.sql) `extract(epoch from now()) * 1000`),
}, (table) => [
    (0, pg_core_1.index)("orders_org_idx").on(table.organizationId),
    (0, pg_core_1.index)("orders_status_idx").on(table.status),
    (0, pg_core_1.index)("orders_delivery_idx").on(table.deliveryDateTime),
]);
exports.attachments = (0, pg_core_1.pgTable)("attachments", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    orderId: (0, pg_core_1.varchar)("order_id").notNull().references(() => exports.orders.id, { onDelete: 'cascade' }),
    type: (0, pg_core_1.text)("type").notNull().default('PHOTO'),
    uri: (0, pg_core_1.text)("uri").notNull(),
    createdAt: (0, pg_core_1.bigint)("created_at", { mode: "number" }).notNull().default((0, drizzle_orm_1.sql) `extract(epoch from now()) * 1000`),
}, (table) => [
    (0, pg_core_1.index)("attachments_order_idx").on(table.orderId),
]);
exports.orderHistory = (0, pg_core_1.pgTable)("order_history", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    orderId: (0, pg_core_1.varchar)("order_id").notNull().references(() => exports.orders.id, { onDelete: 'cascade' }),
    fromStatus: (0, exports.orderStatusEnum)("from_status"),
    toStatus: (0, exports.orderStatusEnum)("to_status").notNull(),
    changedByUserId: (0, pg_core_1.varchar)("changed_by_user_id").references(() => exports.users.id, { onDelete: 'set null' }),
    changedAt: (0, pg_core_1.bigint)("changed_at", { mode: "number" }).notNull().default((0, drizzle_orm_1.sql) `extract(epoch from now()) * 1000`),
    note: (0, pg_core_1.text)("note"),
}, (table) => [
    (0, pg_core_1.index)("history_order_idx").on(table.orderId),
]);
exports.sessions = (0, pg_core_1.pgTable)("sessions", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    token: (0, pg_core_1.text)("token").notNull().unique(),
    expiresAt: (0, pg_core_1.bigint)("expires_at", { mode: "number" }).notNull(),
    createdAt: (0, pg_core_1.bigint)("created_at", { mode: "number" }).notNull().default((0, drizzle_orm_1.sql) `extract(epoch from now()) * 1000`),
}, (table) => [
    (0, pg_core_1.index)("sessions_token_idx").on(table.token),
    (0, pg_core_1.index)("sessions_user_idx").on(table.userId),
]);
// Order expenses table - tracks expenses added by employees
exports.orderExpenses = (0, pg_core_1.pgTable)("order_expenses", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    orderId: (0, pg_core_1.varchar)("order_id").notNull().references(() => exports.orders.id, { onDelete: 'cascade' }),
    amount: (0, pg_core_1.integer)("amount").notNull(),
    comment: (0, pg_core_1.text)("comment").notNull(),
    createdByUserId: (0, pg_core_1.varchar)("created_by_user_id").references(() => exports.users.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.bigint)("created_at", { mode: "number" }).notNull().default((0, drizzle_orm_1.sql) `extract(epoch from now()) * 1000`),
}, (table) => [
    (0, pg_core_1.index)("expenses_order_idx").on(table.orderId),
]);
exports.businessExpenses = (0, pg_core_1.pgTable)("business_expenses", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    organizationId: (0, pg_core_1.varchar)("organization_id").notNull().references(() => exports.organizations.id, { onDelete: 'cascade' }),
    category: (0, exports.businessExpenseCategoryEnum)("category").notNull(),
    amount: (0, pg_core_1.integer)("amount").notNull(),
    comment: (0, pg_core_1.text)("comment").notNull(),
    date: (0, pg_core_1.bigint)("date", { mode: "number" }).notNull().default((0, drizzle_orm_1.sql) `extract(epoch from now()) * 1000`),
    createdByUserId: (0, pg_core_1.varchar)("created_by_user_id").references(() => exports.users.id, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.bigint)("created_at", { mode: "number" }).notNull().default((0, drizzle_orm_1.sql) `extract(epoch from now()) * 1000`),
}, (table) => [
    (0, pg_core_1.index)("biz_expenses_org_idx").on(table.organizationId),
    (0, pg_core_1.index)("biz_expenses_date_idx").on(table.date),
]);
exports.assistantRoleEnum = (0, pg_core_1.pgEnum)('assistant_role', ['FLORIST', 'COURIER']);
exports.orderAssistants = (0, pg_core_1.pgTable)("order_assistants", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    orderId: (0, pg_core_1.varchar)("order_id").notNull().references(() => exports.orders.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.varchar)("user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    role: (0, exports.assistantRoleEnum)("role").notNull(),
    createdAt: (0, pg_core_1.bigint)("created_at", { mode: "number" }).notNull().default((0, drizzle_orm_1.sql) `extract(epoch from now()) * 1000`),
}, (table) => [
    (0, pg_core_1.index)("assistants_order_idx").on(table.orderId),
    (0, pg_core_1.index)("assistants_user_idx").on(table.userId),
]);
exports.courierLocationLatest = (0, pg_core_1.pgTable)("courier_location_latest", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    organizationId: (0, pg_core_1.varchar)("organization_id").notNull().references(() => exports.organizations.id, { onDelete: 'cascade' }),
    courierUserId: (0, pg_core_1.varchar)("courier_user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    lat: (0, pg_core_1.doublePrecision)("lat").notNull(),
    lon: (0, pg_core_1.doublePrecision)("lon").notNull(),
    accuracy: (0, pg_core_1.doublePrecision)("accuracy"),
    recordedAt: (0, pg_core_1.bigint)("recorded_at", { mode: "number" }).notNull(),
    updatedAt: (0, pg_core_1.bigint)("updated_at", { mode: "number" }).notNull().default((0, drizzle_orm_1.sql) `extract(epoch from now()) * 1000`),
    activeOrderId: (0, pg_core_1.varchar)("active_order_id"),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("courier_loc_latest_org_user_idx").on(table.organizationId, table.courierUserId),
    (0, pg_core_1.index)("courier_loc_latest_org_idx").on(table.organizationId),
]);
exports.courierLocations = (0, pg_core_1.pgTable)("courier_locations", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    organizationId: (0, pg_core_1.varchar)("organization_id").notNull().references(() => exports.organizations.id, { onDelete: 'cascade' }),
    courierUserId: (0, pg_core_1.varchar)("courier_user_id").notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    lat: (0, pg_core_1.doublePrecision)("lat").notNull(),
    lon: (0, pg_core_1.doublePrecision)("lon").notNull(),
    accuracy: (0, pg_core_1.doublePrecision)("accuracy"),
    recordedAt: (0, pg_core_1.bigint)("recorded_at", { mode: "number" }).notNull(),
    createdAt: (0, pg_core_1.bigint)("created_at", { mode: "number" }).notNull().default((0, drizzle_orm_1.sql) `extract(epoch from now()) * 1000`),
    activeOrderId: (0, pg_core_1.varchar)("active_order_id"),
}, (table) => [
    (0, pg_core_1.index)("courier_loc_history_org_user_time_idx").on(table.organizationId, table.courierUserId, table.recordedAt),
    (0, pg_core_1.index)("courier_loc_history_org_idx").on(table.organizationId),
]);
// Developer settings table - stores dev password and other global settings
exports.devSettings = (0, pg_core_1.pgTable)("dev_settings", {
    id: (0, pg_core_1.varchar)("id").primaryKey().default((0, drizzle_orm_1.sql) `'default'`),
    devLogin: (0, pg_core_1.text)("dev_login").notNull().default('developer'),
    devPassword: (0, pg_core_1.text)("dev_password").notNull().default('20242024'),
    updatedAt: (0, pg_core_1.bigint)("updated_at", { mode: "number" }).notNull().default((0, drizzle_orm_1.sql) `extract(epoch from now()) * 1000`),
});
exports.insertOrganizationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.organizations).pick({
    name: true,
});
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).pick({
    email: true,
    password: true,
    name: true,
    phone: true,
    role: true,
});
exports.insertOrderSchema = (0, drizzle_zod_1.createInsertSchema)(exports.orders).pick({
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
exports.insertBusinessExpenseSchema = (0, drizzle_zod_1.createInsertSchema)(exports.businessExpenses).pick({
    category: true,
    amount: true,
    comment: true,
    date: true,
});
exports.insertAttachmentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.attachments).pick({
    orderId: true,
    type: true,
    uri: true,
});
exports.ORDER_STATUS_LABELS = {
    NEW: 'Новый',
    IN_WORK: 'В работе',
    ASSEMBLED: 'Собран',
    ON_DELIVERY: 'В доставке',
    DELIVERED: 'Доставлен',
    CANCELED: 'Отменен',
};
exports.USER_ROLE_LABELS = {
    OWNER: 'Руководитель',
    MANAGER: 'Менеджер',
    FLORIST: 'Флорист',
    COURIER: 'Курьер',
};
exports.PAYMENT_STATUS_LABELS = {
    NOT_PAID: 'Не оплачено',
    ADVANCE: 'Аванс',
    PAID: 'Оплачено',
};
exports.CLIENT_SOURCE_LABELS = {
    PHONE: 'Телефон',
    WHATSAPP: 'WhatsApp',
    TELEGRAM: 'Telegram',
    INSTAGRAM: 'Instagram',
    WEBSITE: 'Сайт',
    OTHER: 'Другое',
};
exports.BUSINESS_EXPENSE_CATEGORY_LABELS = {
    TAXES: 'Налоги',
    RENT: 'Аренда',
    SALARY: 'Зарплата',
    SUPPLIES: 'Расходные материалы',
    MARKETING: 'Маркетинг',
    TRANSPORT: 'Транспорт',
    OTHER: 'Прочее',
};
