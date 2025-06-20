import { apiRequest } from "./queryClient";
import type {
  InsertProject,
  Project,
  Feature,
  InsertFeature,
  Milestone,
  InsertMilestone,
  Goal,
  InsertGoal,
  Message,
  InsertMessage,
  Log,
  InsertLog,
  Output,
  InsertOutput,
  Sale,
  InsertSale,
  Persona,
  InsertPersona
} from "@shared/schema";

// Project API calls
export async function createProject(data: Omit<InsertProject, "userId">): Promise<Project> {
  const response = await apiRequest("POST", "/api/projects/create", {
    ...data,
    userId: 1 // Default user ID for now
  });
  return response.json();
}

export async function getProjects(): Promise<Project[]> {
  const response = await apiRequest("GET", "/api/projects");
  return response.json();
}

export async function getProject(id: number): Promise<Project> {
  const response = await apiRequest("GET", `/api/projects/${id}`);
  return response.json();
}

// Feature API calls
export async function createFeature(data: Omit<InsertFeature, "order">): Promise<Feature> {
  const response = await apiRequest("POST", "/api/features/create", data);
  return response.json();
}

export async function getFeaturesByProject(projectId: number): Promise<Feature[]> {
  const response = await apiRequest("GET", `/api/projects/${projectId}/features`);
  return response.json();
}

export async function completeFeature(id: number): Promise<Feature> {
  const response = await apiRequest("PUT", `/api/features/${id}/complete`);
  return response.json();
}

// Milestone API calls
export async function createMilestone(data: Omit<InsertMilestone, "order">): Promise<Milestone> {
  const response = await apiRequest("POST", "/api/milestones/create", data);
  return response.json();
}

export async function getMilestonesByFeature(featureId: number): Promise<Milestone[]> {
  const response = await apiRequest("GET", `/api/features/${featureId}/milestones`);
  return response.json();
}

// Goal API calls
export async function createGoal(data: Omit<InsertGoal, "order">): Promise<Goal> {
  const response = await apiRequest("POST", "/api/goals/create", data);
  return response.json();
}

export async function getGoalsByMilestone(milestoneId: number): Promise<Goal[]> {
  const response = await apiRequest("GET", `/api/milestones/${milestoneId}/goals`);
  return response.json();
}

export async function completeGoal(id: number): Promise<Goal> {
  const response = await apiRequest("PUT", `/api/goals/${id}/complete`);
  return response.json();
}

// Message API calls
export async function createMessage(data: Omit<InsertMessage, "metadata"> & { metadata?: Record<string, any> }): Promise<Message> {
  const response = await apiRequest("POST", "/api/messages/create", data);
  return response.json();
}

export async function getMessagesByProject(projectId: number): Promise<Message[]> {
  const response = await apiRequest("GET", `/api/projects/${projectId}/messages`);
  return response.json();
}

// Log API calls
export async function createLog(data: InsertLog): Promise<Log> {
  const response = await apiRequest("POST", "/api/logs/create", data);
  return response.json();
}

export async function getLogsByProject(projectId: number): Promise<Log[]> {
  const response = await apiRequest("GET", `/api/projects/${projectId}/logs`);
  return response.json();
}

// Output API calls
export async function createOutput(data: InsertOutput): Promise<Output> {
  const response = await apiRequest("POST", "/api/outputs/create", data);
  return response.json();
}

export async function getOutputsByProject(projectId: number): Promise<Output[]> {
  const response = await apiRequest("GET", `/api/projects/${projectId}/outputs`);
  return response.json();
}

export async function approveOutput(id: number): Promise<Output> {
  const response = await apiRequest("PUT", `/api/outputs/${id}/approve`);
  return response.json();
}

export async function rejectOutput(id: number): Promise<Output> {
  const response = await apiRequest("PUT", `/api/outputs/${id}/reject`);
  return response.json();
}

// Sales API calls
export async function createSale(data: InsertSale): Promise<Sale> {
  const response = await apiRequest("POST", "/api/sales/create", data);
  return response.json();
}

export async function getSalesByProject(projectId: number): Promise<Sale[]> {
  const response = await apiRequest("GET", `/api/projects/${projectId}/sales`);
  return response.json();
}

export async function getProjectPerformance(projectId: number): Promise<{
  messages: number;
  content: number;
  income: number;
}> {
  const response = await apiRequest("GET", `/api/projects/${projectId}/performance`);
  return response.json();
}

// Task API calls
export async function createTask(data: {
  type: string;
  projectId: string;
  url?: string;
  priority?: number;
  metadata?: Record<string, any>;
}) {
  const response = await apiRequest("POST", "/api/tasks", data);
  return response.json();
}

// Persona API calls
export async function getPersonas(): Promise<Persona[]> {
  const response = await apiRequest("GET", "/api/personas");
  return response.json();
}

export async function getPersona(id: number): Promise<Persona> {
  const response = await apiRequest("GET", `/api/personas/${id}`);
  return response.json();
}

export async function createPersona(data: InsertPersona): Promise<Persona> {
  const response = await apiRequest("POST", "/api/personas", data);
  return response.json();
}

export async function updatePersona(id: number, data: InsertPersona): Promise<Persona> {
  const response = await apiRequest("PUT", `/api/personas/${id}`, data);
  return response.json();
}

export async function deletePersona(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/personas/${id}`);
}

// Test credentials for a specific platform
export async function testCredentials(personaId: number, platform: string, credentials: Record<string, any>): Promise<{ success: boolean; message: string; details?: any }> {
  const response = await apiRequest("POST", `/api/personas/${personaId}/test-credentials`, {
    platform,
    credentials
  });
  return response.json();
}

// Test all credentials for a persona
export async function testAllCredentials(personaId: number): Promise<{
  personaId: number;
  results: Record<string, any>;
  summary: { total: number; successful: number; failed: number };
}> {
  const response = await apiRequest("POST", `/api/personas/${personaId}/test-all-credentials`);
  return response.json();
}
