import {
  pgTable,
  bigserial,
  varchar,
  timestamp,
  integer,
  decimal,
  text,
  date,
  bigint,
  boolean,
} from "drizzle-orm/pg-core";

export const admins = pgTable("admins", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 150 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).default("SUPERADMIN"),
  status: varchar("status", { length: 20 }).default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const customers = pgTable("customers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  email: varchar("email", { length: 150 }).unique().notNull(),
  phone: varchar("phone", { length: 20 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  loyaltyPoints: integer("loyalty_points").default(0),
  tier: varchar("tier", { length: 50 }).default("BRONZE"),
  status: varchar("status", { length: 20 }).default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  logoUrl: varchar("logo_url", { length: 255 }),
  status: varchar("status", { length: 20 }).default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const fields = pgTable("fields", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  facilities: text("facilities").array(),
  location: text("location"),
  pricePerHour: decimal("price_per_hour", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 30 }).default("AKTIF").notNull(),
  images: text("images").array(),
  mapUrl: text("map_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  bookingCode: varchar("booking_code", { length: 50 }).unique().notNull(),
  customerId: bigint("customer_id", { mode: "number" })
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  fieldId: bigint("field_id", { mode: "number" })
    .notNull()
    .references(() => fields.id, { onDelete: "cascade" }),
  paymentMethodId: bigint("payment_method_id", { mode: "number" }).references(
    () => paymentMethods.id,
    { onDelete: "set null" }
  ),
  bookingDate: date("booking_date").notNull(),
  startHour: integer("start_hour").notNull(),
  endHour: integer("end_hour").notNull(),
  // Note: duration is generated always as (end_hour - start_hour) in raw sql.
  // We don't define generated columns in drizzle schema if not inserting to it.
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  pointsEarned: integer("points_earned").default(0),
  status: varchar("status", { length: 30 }).default("MENUNGGU").notNull(),
  receiptImg: text("receipt_img"),
  rating: integer("rating"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const paymentLogs = pgTable("payment_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  bookingId: bigint("booking_id", { mode: "number" })
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  invoiceCode: varchar("invoice_code", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("PENDING"),
  logMessage: text("log_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const notifTemplates = pgTable("notif_templates", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  triggerEvent: varchar("trigger_event", { length: 100 }).notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const notifLogs = pgTable("notif_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  customerId: bigint("customer_id", { mode: "number" }).references(
    () => customers.id,
    { onDelete: "cascade" }
  ),
  templateId: bigint("template_id", { mode: "number" }).references(
    () => notifTemplates.id,
    { onDelete: "set null" }
  ),
  type: varchar("type", { length: 50 }).notNull(),
  recipient: varchar("recipient", { length: 150 }).notNull(),
  requestPayload: text("request_payload"),
  responsePayload: text("response_payload"),
  status: varchar("status", { length: 50 }).default("PENDING"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const paymentInstructions = pgTable("payment_instructions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  paymentMethodId: bigint("payment_method_id", { mode: "number" })
    .notNull()
    .references(() => paymentMethods.id, { onDelete: "cascade" }),
  title: varchar("title"),
  content: text("content"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  stepNumber: integer("step_number"),
  instructionText: text("instruction_text"),
});

