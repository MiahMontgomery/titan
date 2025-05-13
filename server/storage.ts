import { 
  users, 
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
  type InsertSale
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project methods
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  
  // Feature methods
  createFeature(feature: InsertFeature): Promise<Feature>;
  getFeaturesByProject(projectId: number): Promise<Feature[]>;
  completeFeature(id: number): Promise<Feature | undefined>;
  
  // Milestone methods
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  getMilestonesByFeature(featureId: number): Promise<Milestone[]>;
  
  // Goal methods
  createGoal(goal: InsertGoal): Promise<Goal>;
  getGoalsByMilestone(milestoneId: number): Promise<Goal[]>;
  completeGoal(id: number): Promise<Goal | undefined>;
  
  // Message methods
  createMessage(message: InsertMessage & { metadata?: Record<string, any> }): Promise<Message>;
  getMessagesByProject(projectId: number): Promise<Message[]>;
  
  // Log methods
  createLog(log: InsertLog): Promise<Log>;
  getLogsByProject(projectId: number): Promise<Log[]>;
  
  // Output methods
  createOutput(output: InsertOutput): Promise<Output>;
  getOutputsByProject(projectId: number): Promise<Output[]>;
  approveOutput(id: number): Promise<Output | undefined>;
  rejectOutput(id: number): Promise<Output | undefined>;
  
  // Sale methods
  createSale(sale: InsertSale): Promise<Sale>;
  getSalesByProject(projectId: number): Promise<Sale[]>;
  
  // Performance metrics
  countMessagesByProjectAndDate(projectId: number, date: Date): Promise<number>;
  countOutputsByProjectAndDate(projectId: number, date: Date): Promise<number>;
  getSalesAmountByProjectAndDate(projectId: number, date: Date): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private features: Map<number, Feature>;
  private milestones: Map<number, Milestone>;
  private goals: Map<number, Goal>;
  private messages: Map<number, Message>;
  private logs: Map<number, Log>;
  private outputs: Map<number, Output>;
  private sales: Map<number, Sale>;
  
  private userId: number;
  private projectId: number;
  private featureId: number;
  private milestoneId: number;
  private goalId: number;
  private messageId: number;
  private logId: number;
  private outputId: number;
  private saleId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.features = new Map();
    this.milestones = new Map();
    this.goals = new Map();
    this.messages = new Map();
    this.logs = new Map();
    this.outputs = new Map();
    this.sales = new Map();
    
    this.userId = 1;
    this.projectId = 1;
    this.featureId = 1;
    this.milestoneId = 1;
    this.goalId = 1;
    this.messageId = 1;
    this.logId = 1;
    this.outputId = 1;
    this.saleId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Project methods
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  async createProject(project: InsertProject): Promise<Project> {
    const id = this.projectId++;
    const newProject: Project = {
      ...project,
      id,
      createdAt: new Date(),
      active: true
    };
    this.projects.set(id, newProject);
    return newProject;
  }
  
  // Feature methods
  async createFeature(feature: InsertFeature): Promise<Feature> {
    const id = this.featureId++;
    const newFeature: Feature = {
      ...feature,
      id,
      completed: false,
      order: feature.order || 0
    };
    this.features.set(id, newFeature);
    return newFeature;
  }
  
  async getFeaturesByProject(projectId: number): Promise<Feature[]> {
    return Array.from(this.features.values())
      .filter(feature => feature.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  }
  
  async completeFeature(id: number): Promise<Feature | undefined> {
    const feature = this.features.get(id);
    if (!feature) return undefined;
    
    const updatedFeature: Feature = {
      ...feature,
      completed: true
    };
    this.features.set(id, updatedFeature);
    return updatedFeature;
  }
  
  // Milestone methods
  async createMilestone(milestone: InsertMilestone): Promise<Milestone> {
    const id = this.milestoneId++;
    const newMilestone: Milestone = {
      ...milestone,
      id,
      completed: false,
      order: milestone.order || 0
    };
    this.milestones.set(id, newMilestone);
    return newMilestone;
  }
  
  async getMilestonesByFeature(featureId: number): Promise<Milestone[]> {
    return Array.from(this.milestones.values())
      .filter(milestone => milestone.featureId === featureId)
      .sort((a, b) => a.order - b.order);
  }
  
  // Goal methods
  async createGoal(goal: InsertGoal): Promise<Goal> {
    const id = this.goalId++;
    const newGoal: Goal = {
      ...goal,
      id,
      completed: false,
      order: goal.order || 0
    };
    this.goals.set(id, newGoal);
    return newGoal;
  }
  
  async getGoalsByMilestone(milestoneId: number): Promise<Goal[]> {
    return Array.from(this.goals.values())
      .filter(goal => goal.milestoneId === milestoneId)
      .sort((a, b) => a.order - b.order);
  }
  
  async completeGoal(id: number): Promise<Goal | undefined> {
    const goal = this.goals.get(id);
    if (!goal) return undefined;
    
    const updatedGoal: Goal = {
      ...goal,
      completed: true
    };
    this.goals.set(id, updatedGoal);
    return updatedGoal;
  }
  
  // Message methods
  async createMessage(message: InsertMessage & { metadata?: Record<string, any> }): Promise<Message> {
    const id = this.messageId++;
    const newMessage: Message = {
      ...message,
      id,
      timestamp: new Date(),
      metadata: message.metadata || null
    };
    this.messages.set(id, newMessage);
    return newMessage;
  }
  
  async getMessagesByProject(projectId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.projectId === projectId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
  
  // Log methods
  async createLog(log: InsertLog): Promise<Log> {
    const id = this.logId++;
    const newLog: Log = {
      ...log,
      id,
      timestamp: new Date()
    };
    this.logs.set(id, newLog);
    return newLog;
  }
  
  async getLogsByProject(projectId: number): Promise<Log[]> {
    return Array.from(this.logs.values())
      .filter(log => log.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  // Output methods
  async createOutput(output: InsertOutput): Promise<Output> {
    const id = this.outputId++;
    const newOutput: Output = {
      ...output,
      id,
      approved: null,
      createdAt: new Date()
    };
    this.outputs.set(id, newOutput);
    return newOutput;
  }
  
  async getOutputsByProject(projectId: number): Promise<Output[]> {
    return Array.from(this.outputs.values())
      .filter(output => output.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async approveOutput(id: number): Promise<Output | undefined> {
    const output = this.outputs.get(id);
    if (!output) return undefined;
    
    const updatedOutput: Output = {
      ...output,
      approved: true
    };
    this.outputs.set(id, updatedOutput);
    return updatedOutput;
  }
  
  async rejectOutput(id: number): Promise<Output | undefined> {
    const output = this.outputs.get(id);
    if (!output) return undefined;
    
    const updatedOutput: Output = {
      ...output,
      approved: false
    };
    this.outputs.set(id, updatedOutput);
    return updatedOutput;
  }
  
  // Sale methods
  async createSale(sale: InsertSale): Promise<Sale> {
    const id = this.saleId++;
    const newSale: Sale = {
      ...sale,
      id,
      timestamp: new Date()
    };
    this.sales.set(id, newSale);
    return newSale;
  }
  
  async getSalesByProject(projectId: number): Promise<Sale[]> {
    return Array.from(this.sales.values())
      .filter(sale => sale.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  // Performance metrics
  async countMessagesByProjectAndDate(projectId: number, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.messages.values())
      .filter(message => 
        message.projectId === projectId &&
        new Date(message.timestamp) >= startOfDay &&
        new Date(message.timestamp) <= endOfDay
      ).length;
  }
  
  async countOutputsByProjectAndDate(projectId: number, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.outputs.values())
      .filter(output => 
        output.projectId === projectId &&
        new Date(output.createdAt) >= startOfDay &&
        new Date(output.createdAt) <= endOfDay
      ).length;
  }
  
  async getSalesAmountByProjectAndDate(projectId: number, date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.sales.values())
      .filter(sale => 
        sale.projectId === projectId &&
        new Date(sale.timestamp) >= startOfDay &&
        new Date(sale.timestamp) <= endOfDay
      )
      .reduce((total, sale) => total + sale.amount, 0);
  }
}

export const storage = new MemStorage();