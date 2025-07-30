import { pgTable, text, serial, integer, boolean, timestamp, json, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base user schema
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Project schema
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = z.object({
  name: z.string(),
  prompt: z.string(),
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Feature schema
export const features = pgTable("features", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFeatureSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
});

export type InsertFeature = z.infer<typeof insertFeatureSchema>;
export type Feature = typeof features.$inferSelect;

// Milestone schema
export const milestones = pgTable("milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  featureId: uuid("feature_id").references(() => features.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMilestoneSchema = z.object({
  featureId: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  dueDate: z.date().optional(),
});

export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;

// Goal schema
export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  milestoneId: uuid("milestone_id").references(() => milestones.id),
  title: text("title").notNull(),
  description: text("description"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGoalSchema = z.object({
  milestoneId: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
});

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

// Message schema
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  sender: text("sender").notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertMessageSchema = z.object({
  projectId: z.string().uuid(),
  sender: z.string(),
  content: z.string(),
  metadata: z.any().optional(),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Log schema
export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertLogSchema = z.object({
  projectId: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  details: z.string().optional(),
});

export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logs.$inferSelect;

// Output schema
export const outputs = pgTable("outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  type: text("type").notNull(),
  content: text("content").notNull(),
  approved: boolean("approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOutputSchema = z.object({
  projectId: z.string().uuid(),
  type: z.string(),
  content: z.string(),
});

export type InsertOutput = z.infer<typeof insertOutputSchema>;
export type Output = typeof outputs.$inferSelect;

// Sales schema
export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  amount: integer("amount").notNull(),
  description: text("description"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertSaleSchema = z.object({
  projectId: z.string().uuid(),
  amount: z.number().int(),
  description: z.string().optional(),
});

export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;

// Persona schema
export const personas = pgTable("personas", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  credentials: json("credentials").notNull(),
  strategy: text("strategy"),
  schedule: text("schedule"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPersonaSchema = z.object({
  name: z.string(),
  avatar: z.string().optional(),
  credentials: z.any(),
  strategy: z.string().optional(),
  schedule: z.string().optional(),
});

export type Persona = typeof personas.$inferSelect;
export type InsertPersona = z.infer<typeof insertPersonaSchema>;

// Checkpoint schema
export const checkpoints = pgTable("checkpoints", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  goalId: integer("goal_id").references(() => goals.id),
  summary: text("summary").notNull(),
  codeDiff: text("code_diff").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertCheckpointSchema = z.object({
  projectId: z.number(),
  goalId: z.number(),
  summary: z.string(),
  codeDiff: z.string(),
});

export type Checkpoint = typeof checkpoints.$inferSelect;
export type InsertCheckpoint = z.infer<typeof insertCheckpointSchema>;

// Session Memory schema
export const sessionMemories = pgTable("session_memories", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  projectId: integer("project_id").references(() => projects.id),
  goalId: integer("goal_id").references(() => goals.id),
  featureId: integer("feature_id").references(() => features.id),
  milestoneId: integer("milestone_id").references(() => milestones.id),
  taskSummary: text("task_summary"),
  mode: text("mode").notNull(), // build/debug/optimize
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertSessionMemorySchema = z.object({
  agentId: z.string(),
  projectId: z.number().optional(),
  goalId: z.number().optional(),
  featureId: z.number().optional(),
  milestoneId: z.number().optional(),
  taskSummary: z.string().optional(),
  mode: z.enum(['build', 'debug', 'optimize']),
});

export type SessionMemory = typeof sessionMemories.$inferSelect;
export type InsertSessionMemory = z.infer<typeof insertSessionMemorySchema>;

// Performance Memory schema
export const performanceMemories = pgTable("performance_memories", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  skillTag: text("skill_tag").notNull(),
  taskType: text("task_type").notNull(),
  success: boolean("success").notNull(),
  failReason: text("fail_reason"),
  notes: text("notes"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertPerformanceMemorySchema = z.object({
  agentId: z.string(),
  skillTag: z.string(),
  taskType: z.string(),
  success: z.boolean(),
  failReason: z.string().optional(),
  notes: z.string().optional(),
});

export type PerformanceMemory = typeof performanceMemories.$inferSelect;
export type InsertPerformanceMemory = z.infer<typeof insertPerformanceMemorySchema>;
