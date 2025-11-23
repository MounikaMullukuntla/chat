import {
  boolean,
  decimal,
  integer,
  json,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Chat table
export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  title: text("title").notNull(),
  user_id: uuid("user_id").notNull(),
  visibility: text("visibility").notNull(),
  lastContext: json("lastContext"),
  totalInputTokens: integer("total_input_tokens").default(0),
  totalOutputTokens: integer("total_output_tokens").default(0),
  totalCost: decimal("total_cost", { precision: 10, scale: 6 }).default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message table
export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chatId").notNull(),
  role: text("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull().default([]),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  modelUsed: text("model_used"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  cost: decimal("cost", { precision: 10, scale: 6 }),
});

// Vote table
export const vote = pgTable("Vote_v2", {
  chatId: uuid("chatId").notNull(),
  messageId: uuid("messageId").notNull(),
  isUpvoted: boolean("isUpvoted").notNull(),
});

// Document table with version control
export const document = pgTable("Document", {
  id: uuid("id").notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  title: text("title").notNull(),
  content: text("content"),
  kind: text("kind").notNull(),
  user_id: uuid("user_id").notNull(),
  chat_id: uuid("chat_id"),
  parent_version_id: uuid("parent_version_id"),
  version_number: integer("version_number").notNull().default(1),
  metadata: json("metadata").default({}),
});

// Suggestion table
export const suggestion = pgTable("Suggestion", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("documentId").notNull(),
  documentCreatedAt: timestamp("documentCreatedAt").notNull(),
  originalText: text("originalText").notNull(),
  suggestedText: text("suggestedText").notNull(),
  description: text("description"),
  isResolved: boolean("isResolved").default(false),
  user_id: uuid("user_id").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Stream table
export const stream = pgTable("Stream", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chatId").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

// Admin Config table
export const adminConfig = pgTable("admin_config", {
  id: uuid("id").primaryKey(),
  configKey: text("config_key").notNull().unique(),
  configData: json("config_data").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at"),
  createdAt: timestamp("created_at"),
});

// Model Config table
export const modelConfig = pgTable("model_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelId: varchar("model_id", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  provider: varchar("provider", { length: 50 }).notNull(),
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  thinkingEnabled: boolean("thinking_enabled").default(true),
  inputPricingPerMillionTokens: decimal("input_pricing_per_million_tokens", {
    precision: 10,
    scale: 4,
  }).notNull(),
  outputPricingPerMillionTokens: decimal("output_pricing_per_million_tokens", {
    precision: 10,
    scale: 4,
  }).notNull(),
  metadata: json("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Usage Logs table
export const usageLogs = pgTable("usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  chat_id: uuid("chat_id"),
  agentType: text("agent_type").notNull(),
  modelUsed: text("model_used"),
  provider: text("provider"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  totalTokens: integer("total_tokens"),
  inputCost: decimal("input_cost", { precision: 10, scale: 6 }),
  outputCost: decimal("output_cost", { precision: 10, scale: 6 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 6 }),
  requestTimestamp: timestamp("request_timestamp").defaultNow(),
  responseTimestamp: timestamp("response_timestamp"),
  durationMs: integer("duration_ms"),
  metadata: json("metadata"),
});

// Rate Limit Tracking table
export const rateLimitTracking = pgTable("rate_limit_tracking", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  agentType: text("agent_type").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  requestCount: integer("request_count").default(0),
  limitType: text("limit_type").notNull(),
  limitValue: integer("limit_value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// GitHub Repositories table
export const githubRepositories = pgTable("github_repositories", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  repoOwner: text("repo_owner").notNull(),
  repoName: text("repo_name").notNull(),
  repoUrl: text("repo_url"),
  defaultBranch: text("default_branch").default("main"),
  isActive: boolean("is_active").default(true),
  lastAccessed: timestamp("last_accessed"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Error Logs table
export const errorLogs = pgTable("error_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id"),
  error_type: text("error_type").notNull(),
  error_category: text("error_category").notNull(),
  error_message: text("error_message").notNull(),
  error_details: json("error_details"),
  request_path: text("request_path"),
  request_method: text("request_method"),
  user_agent: text("user_agent"),
  ip_address: text("ip_address"),
  session_id: text("session_id"),
  severity: text("severity").notNull().default("error"),
  resolved: boolean("resolved").default(false),
  resolved_by: uuid("resolved_by"),
  resolved_at: timestamp("resolved_at"),
  resolution_notes: text("resolution_notes"),
  created_at: timestamp("created_at").defaultNow(),
});

// Export types
export type Chat = typeof chat.$inferSelect;
export type DBMessage = typeof message.$inferSelect;
export type Vote = typeof vote.$inferSelect;
export type Document = typeof document.$inferSelect;
export type Suggestion = typeof suggestion.$inferSelect;
export type Stream = typeof stream.$inferSelect;
export type AdminConfig = typeof adminConfig.$inferSelect;
export type ModelConfig = typeof modelConfig.$inferSelect;
export type UsageLog = typeof usageLogs.$inferSelect;
export type RateLimitTracking = typeof rateLimitTracking.$inferSelect;
export type GithubRepository = typeof githubRepositories.$inferSelect;
export type ErrorLog = typeof errorLogs.$inferSelect;
