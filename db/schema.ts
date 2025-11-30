import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  vector,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

// ============================================
// Enums
// ============================================

export const tenantRoleEnum = pgEnum("tenant_role", ["owner", "admin", "member"]);
export const modelProviderEnum = pgEnum("model_provider", [
  "openai",
  "anthropic",
  "google",
]);
export const widgetPositionEnum = pgEnum("widget_position", [
  "bottom_right",
  "bottom_left",
  "top_right",
  "top_left",
]);
export const evalStatusEnum = pgEnum("eval_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

// ============================================
// Auth Tables (NextAuth compatible)
// ============================================

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ============================================
// Multi-tenant Tables
// ============================================

export const tenants = pgTable("tenants", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),

  // Visual configuration
  primaryColor: text("primary_color").default("#6366f1").notNull(),
  accentColor: text("accent_color").default("#8b5cf6").notNull(),
  logoUrl: text("logo_url"),
  welcomeMessage: text("welcome_message")
    .default("Hi! How can I help you today?")
    .notNull(),

  // AI Configuration
  instructions: text("instructions")
    .default("You are a helpful customer support assistant.")
    .notNull(),
  modelProvider: modelProviderEnum("model_provider").default("openai").notNull(),
  modelName: text("model_name").default("gpt-5-mini").notNull(),
  temperature: real("temperature").default(0.7).notNull(),

  // API Keys (should be encrypted in production)
  openaiApiKey: text("openai_api_key"),
  anthropicApiKey: text("anthropic_api_key"),
  googleApiKey: text("google_api_key"),

  // Widget settings
  widgetPosition: widgetPositionEnum("widget_position").default("bottom_right").notNull(),
  widgetEnabled: boolean("widget_enabled").default(true).notNull(),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const tenantMembers = pgTable(
  "tenant_members",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    role: tenantRoleEnum("role").default("member").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (tm) => [
    unique().on(tm.userId, tm.tenantId),
    index("tenant_members_user_idx").on(tm.userId),
    index("tenant_members_tenant_idx").on(tm.tenantId),
  ],
);

// ============================================
// Document & Embedding Tables
// ============================================

export const documents = pgTable(
  "documents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    title: text("title").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (doc) => [index("documents_tenant_idx").on(doc.tenantId)],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    chunkIndex: integer("chunk_index").notNull(),
    metadata: jsonb("metadata"),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (chunk) => [index("document_chunks_document_idx").on(chunk.documentId)],
);

// ============================================
// NOTE: Conversations and traces are stored in Braintrust, not Postgres.
// We query them via BTQL API. This keeps Postgres lean and avoids O(messages) storage.
// ============================================

// ============================================
// Dataset & Eval Tables
// ============================================

// Datasets are stored in Postgres for listing/metadata
// Actual records are stored in a single Braintrust dataset "saved_conversations"
// with metadata filtering by dataset_id
export const datasets = pgTable(
  "datasets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    name: text("name").notNull(),
    description: text("description"),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (ds) => [
    unique().on(ds.tenantId, ds.name),
    index("datasets_tenant_idx").on(ds.tenantId),
  ],
);

export const evals = pgTable(
  "evals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    name: text("name").notNull(),
    status: evalStatusEnum("status").default("pending").notNull(),

    // Parameters at time of eval
    parameters: jsonb("parameters").notNull(), // instructions, model, temperature, etc.

    // Results
    results: jsonb("results"),
    summary: jsonb("summary"),
    braintrustExpId: text("braintrust_exp_id"), // Braintrust experiment ID

    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    datasetId: text("dataset_id")
      .notNull()
      .references(() => datasets.id),

    startedAt: timestamp("started_at", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (ev) => [
    index("evals_tenant_idx").on(ev.tenantId),
    index("evals_dataset_idx").on(ev.datasetId),
  ],
);

// ============================================
// Relations
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  tenantMembers: many(tenantMembers),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  members: many(tenantMembers),
  documents: many(documents),
  datasets: many(datasets),
  evals: many(evals),
}));

export const tenantMembersRelations = relations(tenantMembers, ({ one }) => ({
  user: one(users, {
    fields: [tenantMembers.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [tenantMembers.tenantId],
    references: [tenants.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [documents.tenantId],
    references: [tenants.id],
  }),
  chunks: many(documentChunks),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}));

export const datasetsRelations = relations(datasets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [datasets.tenantId],
    references: [tenants.id],
  }),
  evals: many(evals),
}));

export const evalsRelations = relations(evals, ({ one }) => ({
  tenant: one(tenants, {
    fields: [evals.tenantId],
    references: [tenants.id],
  }),
  dataset: one(datasets, {
    fields: [evals.datasetId],
    references: [datasets.id],
  }),
}));

// ============================================
// Type Exports
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type TenantMember = typeof tenantMembers.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type Dataset = typeof datasets.$inferSelect;
export type Eval = typeof evals.$inferSelect;
