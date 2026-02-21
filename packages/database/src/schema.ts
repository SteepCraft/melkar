import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  doublePrecision,
} from 'drizzle-orm/pg-core';

// ─── ROLES ───────────────────────────────────────────────
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  permissions: text('permissions'),
  isSystem: boolean('is_system').default(false),
  status: text('status').default('Activo'),
});

// ─── USERS ───────────────────────────────────────────────
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').default('Vendedor'),
  status: text('status').default('Activo'),
});

// ─── EMPLOYEES ───────────────────────────────────────────
export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  document: text('document'),
  phone: text('phone'),
  email: text('email'),
  position: text('position'),
  status: text('status').default('Activo'),
});

// ─── PRODUCTS ────────────────────────────────────────────
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku'),
  price: numeric('price', { precision: 12, scale: 2 }).default('0'),
  stock: integer('stock').default(0),
  status: text('status').default('Sin Stock'),
  active: boolean('active').default(true),
});

// ─── CLIENTS ─────────────────────────────────────────────
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  status: text('status').default('Activo'),
});

// ─── SUPPLIERS ───────────────────────────────────────────
export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  nit: text('nit'),
  phone: text('phone'),
  location: text('location'),
  rating: doublePrecision('rating').default(0),
  email: text('email'),
  status: text('status').default('Activo'),
});

// ─── QUOTES ──────────────────────────────────────────────
export const quotes = pgTable('quotes', {
  id: serial('id').primaryKey(),
  clientId: text('client_id'),
  clientName: text('client_name'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0'),
  tax: numeric('tax', { precision: 12, scale: 2 }).default('0'),
  transport: numeric('transport', { precision: 12, scale: 2 }).default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).default('0'),
  status: text('status').default('Borrador'),
  validityDays: integer('validity_days').default(30),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── QUOTE ITEMS ─────────────────────────────────────────
export const quoteItems = pgTable('quote_items', {
  id: serial('id').primaryKey(),
  quoteId: integer('quote_id')
    .notNull()
    .references(() => quotes.id, { onDelete: 'cascade' }),
  productName: text('product_name'),
  price: numeric('price', { precision: 12, scale: 2 }).default('0'),
  quantity: integer('quantity').default(0),
});

// ─── PURCHASES ───────────────────────────────────────────
export const purchases = pgTable('purchases', {
  id: serial('id').primaryKey(),
  supplierId: integer('supplier_id'),
  supplierName: text('supplier_name'),
  total: numeric('total', { precision: 12, scale: 2 }).default('0'),
  status: text('status').default('Pendiente'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── PURCHASE ITEMS ──────────────────────────────────────
export const purchaseItems = pgTable('purchase_items', {
  id: serial('id').primaryKey(),
  purchaseId: integer('purchase_id')
    .notNull()
    .references(() => purchases.id, { onDelete: 'cascade' }),
  productName: text('product_name'),
  price: numeric('price', { precision: 12, scale: 2 }).default('0'),
  quantity: integer('quantity').default(0),
});

// ─── INVENTORY MOVEMENTS ────────────────────────────────
export const inventoryMovements = pgTable('inventory_movements', {
  id: serial('id').primaryKey(),
  productName: text('product_name'),
  type: text('type'),
  quantity: integer('quantity').default(0),
  reason: text('reason'),
  movementDate: date('movement_date').defaultNow(),
});

// ─── SALES ───────────────────────────────────────────────
export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  clientId: text('client_id'),
  clientName: text('client_name'),
  employeeName: text('employee_name'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).default('0'),
  tax: numeric('tax', { precision: 12, scale: 2 }).default('0'),
  transport: numeric('transport', { precision: 12, scale: 2 }).default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).default('0'),
  status: text('status').default('Completada'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── SALE ITEMS ──────────────────────────────────────────
export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id')
    .notNull()
    .references(() => sales.id, { onDelete: 'cascade' }),
  productId: integer('product_id'),
  productName: text('product_name'),
  price: numeric('price', { precision: 12, scale: 2 }).default('0'),
  quantity: integer('quantity').default(0),
});

// ─── PASSWORD RESETS ─────────────────────────────────────
export const passwordResets = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  email: text('email'),
  token: text('token'),
  createdAt: timestamp('created_at').defaultNow(),
  used: boolean('used').default(false),
});
