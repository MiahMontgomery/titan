import { OpenRouter } from '../services/openrouter';
import { loadMemory, saveMemory } from './memory';
import { logAction } from './logger';
import { agentManager } from './manager';

const openRouter = new OpenRouter();

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'research' | 'development' | 'testing' | 'deployment' | 'optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours: number;
  dependencies: string[];
  resources: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectPlan {
  id: string;
  title: string;
  description: string;
  goals: string[];
  tasks: Task[];
  timeline: {
    startDate: Date;
    endDate: Date;
    milestones: Array<{
      id: string;
      title: string;
      date: Date;
      tasks: string[];
    }>;
  };
  resources: {
    personas: string[];
    tools: string[];
    budget?: number;
  };
  risks: Array<{
    id: string;
    description: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  status: 'planning' | 'active' | 'completed' | 'failed';
}

export class ProjectPlanner {
  private plans: Map<string, ProjectPlan> = new Map();

  async createProjectPlan(
    projectId: string,
    title: string,
    description: string,
    goals: string[]
  ): Promise<ProjectPlan> {
    // Use AI to analyze the project and create a detailed plan
    const analysis = await this.analyzeProject(description, goals);
    
    const plan: ProjectPlan = {
      id: projectId,
      title,
      description,
      goals,
      tasks: analysis.tasks,
      timeline: analysis.timeline,
      resources: analysis.resources,
      risks: analysis.risks,
      status: 'planning'
    };

    this.plans.set(projectId, plan);
    await this.savePlan(plan);
    
    await logAction('project_plan_created', {
      projectId,
      title,
      taskCount: plan.tasks.length,
      estimatedHours: plan.tasks.reduce((sum, task) => sum + task.estimatedHours, 0)
    });

    return plan;
  }

  private async analyzeProject(description: string, goals: string[]): Promise<{
    tasks: Task[];
    timeline: ProjectPlan['timeline'];
    resources: ProjectPlan['resources'];
    risks: ProjectPlan['risks'];
  }> {
    const prompt = `
      Analyze this project and create a detailed execution plan.
      
      Project: ${description}
      Goals: ${goals.join(', ')}
      
      Create a comprehensive plan including:
      1. Detailed task breakdown with dependencies
      2. Timeline with milestones
      3. Required resources (personas, tools)
      4. Risk assessment and mitigation
      
      Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
      {
        "tasks": [
          {
            "id": "task_1",
            "title": "Task title",
            "description": "Detailed description",
            "type": "research",
            "priority": "high",
            "estimatedHours": 8,
            "dependencies": [],
            "resources": ["researcher"]
          }
        ],
        "timeline": {
          "startDate": "2024-01-15",
          "endDate": "2024-02-15",
          "milestones": [
            {
              "id": "milestone_1",
              "title": "Milestone title",
              "date": "2024-01-30",
              "tasks": ["task_1"]
            }
          ]
        },
        "resources": {
          "personas": ["researcher", "developer"],
          "tools": ["browser", "api"],
          "budget": 5000
        },
        "risks": [
          {
            "id": "risk_1",
            "description": "Risk description",
            "probability": "medium",
            "impact": "high",
            "mitigation": "Mitigation strategy"
          }
        ]
      }
    `;

    const response = await openRouter.chat({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert project planner. Return ONLY valid JSON without any markdown formatting or code blocks.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    try {
      const content = response.choices[0]?.message?.content || '';
      // Clean the response to remove any markdown formatting
      const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
      const planData = JSON.parse(cleanContent);
      
      // Convert string dates to Date objects and add metadata
      const tasks: Task[] = planData.tasks.map((task: any) => ({
        ...task,
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const timeline = {
        ...planData.timeline,
        startDate: new Date(planData.timeline.startDate),
        endDate: new Date(planData.timeline.endDate),
        milestones: planData.timeline.milestones.map((milestone: any) => ({
          ...milestone,
          date: new Date(milestone.date)
        }))
      };

      return {
        tasks,
        timeline,
        resources: planData.resources,
        risks: planData.risks
      };
    } catch (error) {
      throw new Error(`Failed to parse project plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getNextTask(projectId: string): Promise<Task | null> {
    const plan = this.plans.get(projectId);
    if (!plan) return null;

    // Find tasks that are ready to execute (dependencies completed)
    const completedTaskIds = plan.tasks
      .filter(task => task.status === 'completed')
      .map(task => task.id);

    const readyTasks = plan.tasks.filter(task => 
      task.status === 'pending' &&
      task.dependencies.every(depId => completedTaskIds.includes(depId))
    );

    if (readyTasks.length === 0) return null;

    // Return highest priority task
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return readyTasks.sort((a, b) => 
      priorityOrder[b.priority] - priorityOrder[a.priority]
    )[0];
  }

  async updateTaskStatus(
    projectId: string,
    taskId: string,
    status: Task['status'],
    assignedTo?: string
  ): Promise<void> {
    const plan = this.plans.get(projectId);
    if (!plan) throw new Error(`Project plan not found: ${projectId}`);

    const task = plan.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task not found: ${taskId}`);

    task.status = status;
    task.updatedAt = new Date();
    if (assignedTo) task.assignedTo = assignedTo;

    await this.savePlan(plan);
    
    await logAction('task_status_updated', {
      projectId,
      taskId,
      status,
      assignedTo
    });
  }

  async getProjectProgress(projectId: string): Promise<{
    completed: number;
    total: number;
    percentage: number;
    estimatedHoursRemaining: number;
  }> {
    const plan = this.plans.get(projectId);
    if (!plan) throw new Error(`Project plan not found: ${projectId}`);

    const completed = plan.tasks.filter(t => t.status === 'completed').length;
    const total = plan.tasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    const remainingTasks = plan.tasks.filter(t => t.status !== 'completed');
    const estimatedHoursRemaining = remainingTasks.reduce((sum, task) => sum + task.estimatedHours, 0);

    return {
      completed,
      total,
      percentage,
      estimatedHoursRemaining
    };
  }

  private async savePlan(plan: ProjectPlan): Promise<void> {
    const memory = await loadMemory();
    (memory as any)[`plan_${plan.id}`] = plan;
    await saveMemory(memory);
  }

  async loadPlan(projectId: string): Promise<ProjectPlan | null> {
    if (this.plans.has(projectId)) {
      return this.plans.get(projectId)!;
    }

    const memory = await loadMemory();
    const planData = (memory as any)[`plan_${projectId}`];
    if (planData) {
      this.plans.set(projectId, planData);
      return planData;
    }

    return null;
  }
}

export const projectPlanner = new ProjectPlanner(); 