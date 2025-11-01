import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  decimal,
  foreignKey,
  integer,
  json,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AppUsage } from "../usage";

// =====================================================
// IMPORTANT: Schema Notes
// =====================================================
// 
// 1. No User table - using Supabase auth.users directly
// 2. All user_id fields reference auth.users(id) but FK constraints
//    are defined in SQL migration (0001_initial_schema.sql), not here
//    because Drizzle cannot reference Supabase's auth schema
// 3. RLS policies are defined in SQL, enforced at database level
// 4. This schema is for TypeScript types and Drizzle ORM only

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  title: text("title").notNull(),
  user_id: uuid("user_id").notNull(), // FK to auth.users(id) - defined in SQL
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  lastContext: jsonb("lastContext").$type<AppUsage | null>(),
  totalInputTokens: integer("total_input_tokens").default(0),
  totalOutputTokens: integer("total_output_tokens").default(0),
  totalCost: decimal("total_cost", { precision: 10, scale: 6 }).default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const messageDeprecated = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  content: json("content").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull().default("[]"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  modelUsed: varchar("model_used", { length: 100 }),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  cost: decimal("cost", { precision: 10, scale: 6 }),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://chat-sdk.dev/docs/migration-guides/message-parts
export const voteDeprecated = pgTable(
  "Vote",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  }
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("kind", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    user_id: uuid("user_id").notNull(), // FK to auth.users(id) - defined in SQL
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  }
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    user_id: uuid("user_id").notNull(), // FK to auth.users(id) - defined in SQL
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

// =====================================================
// NEW TABLES (Admin & Analytics)
// =====================================================

export const adminConfig = pgTable("admin_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  configData: jsonb("config_data").notNull(),
  updatedBy: uuid("updated_by"), // References auth.users(id)
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminConfig = InferSelectModel<typeof adminConfig>;

export const usageLogs = pgTable("usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(), // References auth.users(id)
  chat_id: uuid("chat_id"), // References Chat(id), nullable
  agentType: varchar("agent_type", { length: 50 }).notNull(),
  modelUsed: varchar("model_used", { length: 100 }),
  provider: varchar("provider", { length: 50 }),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  totalTokens: integer("total_tokens"),
  inputCost: decimal("input_cost", { precision: 10, scale: 6 }),
  outputCost: decimal("output_cost", { precision: 10, scale: 6 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 6 }),
  requestTimestamp: timestamp("request_timestamp").defaultNow(),
  responseTimestamp: timestamp("response_timestamp"),
  durationMs: integer("duration_ms"),
  metadata: jsonb("metadata"),
});

export type UsageLog = InferSelectModel<typeof usageLogs>;

export const rateLimitTracking = pgTable("rate_limit_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(), // References auth.users(id)
  agentType: varchar("agent_type", { length: 50 }).notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  requestCount: integer("request_count").default(0),
  limitType: varchar("limit_type", { length: 20 }).notNull(),
  limitValue: integer("limit_value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type RateLimitTracking = InferSelectModel<typeof rateLimitTracking>;

export const githubRepositories = pgTable("github_repositories", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(), // References auth.users(id)
  repoOwner: varchar("repo_owner", { length: 100 }).notNull(),
  repoName: varchar("repo_name", { length: 100 }).notNull(),
  repoUrl: text("repo_url"),
  defaultBranch: varchar("default_branch", { length: 100 }).default("main"),
  isActive: boolean("is_active").default(true),
  lastAccessed: timestamp("last_accessed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type GithubRepository = InferSelectModel<typeof githubRepositories>;
