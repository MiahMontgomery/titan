import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Base user schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Project schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  active: boolean("active").default(true).notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  prompt: true,
  userId: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Feature schema
export const features = pgTable("features", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: integer("project_id").notNull(),
  completed: boolean("completed").default(false).notNull(),
  order: integer("order").default(0).notNull(),
});

export const insertFeatureSchema = createInsertSchema(features).pick({
  title: true,
  description: true,
  projectId: true,
  order: true,
});

export type InsertFeature = z.infer<typeof insertFeatureSchema>;
export type Feature = typeof features.$inferSelect;

// Milestone schema
export const milestones = pgTable("milestones", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  featureId: integer("feature_id").notNull(),
  completed: boolean("completed").default(false).notNull(),
  order: integer("order").default(0).notNull(),
});

export const insertMilestoneSchema = createInsertSchema(milestones).pick({
  title: true,
  featureId: true,
  order: true,
});

export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestones.$inferSelect;

// Goal schema
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  milestoneId: integer("milestone_id").notNull(),
  completed: boolean("completed").default(false).notNull(),
  order: integer("order").default(0).notNull(),
});

export const insertGoalSchema = createInsertSchema(goals).pick({
  title: true,
  milestoneId: true,
  order: true,
});

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

// Message schema
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  content: text("content").notNull(),
  sender: text("sender").notNull(), // 'user' or 'jason'
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: json("metadata"), // For screenshots, code blocks, etc.
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  projectId: true,
  content: true,
  sender: true,
  metadata: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Log schema
export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  type: text("type").notNull(), // 'execution', 'feature_update', 'rollback', etc.
  title: text("title").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertLogSchema = createInsertSchema(logs).pick({
  projectId: true,
  type: true,
  title: true,
  details: true,
});

export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logs.$inferSelect;

// Output schema
export const outputs = pgTable("outputs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'audio', 'video', 'pdf', etc.
  content: text("content").notNull(), // URL or path
  approved: boolean("approved"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOutputSchema = createInsertSchema(outputs).pick({
  projectId: true,
  title: true,
  type: true,
  content: true,
});

export type InsertOutput = z.infer<typeof insertOutputSchema>;
export type Output = typeof outputs.$inferSelect;

// Sales schema
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  type: text("type").notNull(), // 'pdf', 'video', etc.
  amount: integer("amount").notNull(), // In cents
  quantity: integer("quantity").default(1).notNull(),
  platform: text("platform"), // 'shopify', 'fansly', etc.
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertSaleSchema = createInsertSchema(sales).pick({
  projectId: true,
  type: true,
  amount: true,
  quantity: true,
  platform: true,
});

export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;
