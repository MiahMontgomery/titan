import dotenv from 'dotenv';
dotenv.config();

// Debug logging
console.log('Storage.ts - Environment check:', {
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  PWD: process.cwd(),
  ENV_LOADED: process.env.DATABASE_URL ? 'yes' : 'no'
});

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { 
  users, 
  projects,
  features,
  milestones,
  goals,
  messages,
  logs,
  outputs,
  sales,
  personas,
  tasks,
  type User, 
  type InsertUser,
  type Project,
  type InsertProject,
  type Feature,
  type InsertFeature,
  type Milestone,
  type InsertMilestone,
  type Goal,
  type InsertGoal,
  type Message,
  type InsertMessage,
  type Log,
  type InsertLog,
  type Output,
  type InsertOutput,
  type Sale,
  type InsertSale,
  type Persona,
  type InsertPersona,
  type Task,
  type InsertTask
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project methods
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // Feature methods
  createFeature(feature: InsertFeature): Promise<Feature>;
  getFeaturesByProject(projectId: string): Promise<Feature[]>;
  completeFeature(id: string): Promise<Feature | undefined>;
  
  // Milestone methods
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  getMilestonesByFeature(featureId: string): Promise<Milestone[]>;
  
  // Goal methods
  createGoal(goal: InsertGoal): Promise<Goal>;
  getGoalsByMilestone(milestoneId: string): Promise<Goal[]>;
  completeGoal(id: string): Promise<Goal | undefined>;
  
  // Message methods
  createMessage(message: InsertMessage & { metadata?: Record<string, any> }): Promise<Message>;
  getMessagesByProject(projectId: string): Promise<Message[]>;
  
  // Log methods
  createLog(log: InsertLog): Promise<Log>;
  getLogsByProject(projectId: string): Promise<Log[]>;
  
  // Output methods
  createOutput(output: InsertOutput): Promise<Output>;
  getOutputsByProject(projectId: string): Promise<Output[]>;
  approveOutput(id: string): Promise<Output | undefined>;
  rejectOutput(id: string): Promise<Output | undefined>;
  
  // Sale methods
  createSale(sale: InsertSale): Promise<Sale>;
  getSalesByProject(projectId: string): Promise<Sale[]>;
  
  // Performance metrics
  countMessagesByProjectAndDate(projectId: string, date: Date): Promise<number>;
  countOutputsByProjectAndDate(projectId: string, date: Date): Promise<number>;
  getSalesAmountByProjectAndDate(projectId: string, date: Date): Promise<number>;
  sumSalesByProjectAndDate(projectId: string, date: Date): Promise<number>;
  
  // Persona methods
  createPersona(persona: InsertPersona): Promise<Persona>;
  getPersonas(): Promise<Persona[]>;
  getPersona(id: string): Promise<Persona | undefined>;
  updatePersona(id: string, persona: InsertPersona): Promise<Persona>;
  deletePersona(id: string): Promise<void>;
  
  // Task methods
  createTask(task: InsertTask): Promise<Task>;
  getTasksByProject(projectId: string): Promise<Task[]>;
  updateTaskStatus(id: string, status: 'pending' | 'in_progress' | 'completed'): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export class PostgresStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Project methods
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id));
    return result[0];
  }

  async createProject(project: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(project).returning();
    return result[0];
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Feature methods
  async createFeature(feature: InsertFeature): Promise<Feature> {
    const result = await db.insert(features).values(feature).returning();
    return result[0];
  }

  async getFeaturesByProject(projectId: string): Promise<Feature[]> {
    return await db.select().from(features).where(eq(features.projectId, projectId));
  }

  async completeFeature(id: string): Promise<Feature | undefined> {
    const result = await db.update(features)
      .set({ completed: true })
      .where(eq(features.id, id))
      .returning();
    return result[0];
  }

  // Milestone methods
  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const result = await db.insert(milestones).values(milestone).returning();
    return result[0];
  }

  async getMilestonesByFeature(featureId: string): Promise<Milestone[]> {
    return await db.select().from(milestones).where(eq(milestones.featureId, featureId));
  }

  // Goal methods
  async createGoal(goal: InsertGoal): Promise<Goal> {
    const result = await db.insert(goals).values(goal).returning();
    return result[0];
  }

  async getGoalsByMilestone(milestoneId: string): Promise<Goal[]> {
    return await db.select().from(goals).where(eq(goals.milestoneId, milestoneId));
  }

  async completeGoal(id: string): Promise<Goal | undefined> {
    const result = await db.update(goals)
      .set({ completed: true })
      .where(eq(goals.id, id))
      .returning();
    return result[0];
  }

  // Message methods
  async createMessage(message: InsertMessage & { metadata?: Record<string, any> }): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  async getMessagesByProject(projectId: string): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.projectId, projectId));
  }

  // Log methods
  async createLog(log: InsertLog): Promise<Log> {
    const result = await db.insert(logs).values(log).returning();
    return result[0];
  }

  async getLogsByProject(projectId: string): Promise<Log[]> {
    return await db.select().from(logs).where(eq(logs.projectId, projectId));
  }

  // Output methods
  async createOutput(output: InsertOutput): Promise<Output> {
    const result = await db.insert(outputs).values(output).returning();
    return result[0];
  }

  async getOutputsByProject(projectId: string): Promise<Output[]> {
    return await db.select().from(outputs).where(eq(outputs.projectId, projectId));
  }

  async approveOutput(id: string): Promise<Output | undefined> {
    const result = await db.update(outputs)
      .set({ approved: true })
      .where(eq(outputs.id, id))
      .returning();
    return result[0];
  }

  async rejectOutput(id: string): Promise<Output | undefined> {
    const result = await db.update(outputs)
      .set({ approved: false })
      .where(eq(outputs.id, id))
      .returning();
    return result[0];
  }

  // Sale methods
  async createSale(sale: InsertSale): Promise<Sale> {
    const result = await db.insert(sales).values(sale).returning();
    return result[0];
  }

  async getSalesByProject(projectId: string): Promise<Sale[]> {
    return await db.select().from(sales).where(eq(sales.projectId, projectId));
  }

  // Performance metrics
  async countMessagesByProjectAndDate(projectId: string, date: Date): Promise<number> {
    const result = await db.select({ count: sql`count(*)` })
      .from(messages)
      .where(and(eq(messages.projectId, projectId), gte(messages.timestamp, date)));
    return Number(result[0]?.count || 0);
  }

  async countOutputsByProjectAndDate(projectId: string, date: Date): Promise<number> {
    const result = await db.select({ count: sql`count(*)` })
      .from(outputs)
      .where(and(eq(outputs.projectId, projectId), gte(outputs.createdAt, date)));
    return Number(result[0]?.count || 0);
  }

  async getSalesAmountByProjectAndDate(projectId: string, date: Date): Promise<number> {
    const result = await db.select({ sum: sql`sum(amount)` })
      .from(sales)
      .where(and(eq(sales.projectId, projectId), gte(sales.timestamp, date)));
    return Number(result[0]?.sum || 0);
  }

  async sumSalesByProjectAndDate(projectId: string, date: Date): Promise<number> {
    const result = await db.select({ sum: sql`sum(amount)` })
      .from(sales)
      .where(and(eq(sales.projectId, projectId), gte(sales.timestamp, date)));
    return Number(result[0]?.sum || 0);
  }

  // Persona methods
  async createPersona(persona: InsertPersona): Promise<Persona> {
    const result = await db.insert(personas).values(persona).returning();
    return result[0];
  }

  async getPersonas(): Promise<Persona[]> {
    return await db.select().from(personas);
  }

  async getPersona(id: string): Promise<Persona | undefined> {
    const result = await db.select().from(personas).where(eq(personas.id, id));
    return result[0];
  }

  async updatePersona(id: string, persona: InsertPersona): Promise<Persona> {
    const result = await db.update(personas).set(persona).where(eq(personas.id, id)).returning();
    return result[0];
  }

  async deletePersona(id: string): Promise<void> {
    await db.delete(personas).where(eq(personas.id, id));
  }

  // Task methods
  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, parseInt(projectId)))
      .orderBy(desc(tasks.createdAt));
  }

  async updateTaskStatus(id: string, status: 'pending' | 'in_progress' | 'completed'): Promise<Task | undefined> {
    const result = await db
      .update(tasks)
      .set({ status, updatedAt: new Date() })
      .where(eq(tasks.id, parseInt(id)))
      .returning();
    return result[0];
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, parseInt(id)));
  }
}

export const storage = new PostgresStorage();