import { takeScreenshot } from '../puppeteer/screenshot';
import { logAction } from './logger';
import { loadMemory, saveMemory, type MemoryState } from './memory';
import { Task } from '../data/queue';
import { OpenRouter } from '../services/openrouter';
import { ElevenLabs } from '../services/elevenlabs';
import { projectPlanner } from './planner';
import { researchEngine } from './researcher';
import { selfImprover } from './self-improver';
import { coordinator } from './coordinator';
import { agentManager } from './manager';

const openRouter = new OpenRouter();
const elevenLabs = new ElevenLabs();

// Export the executeTask function for main.ts
export async function executeTask(task: Task): Promise<TaskResult> {
  const brain = new EnhancedBrain();
  return await brain.executeTask(task);
}

interface TaskResult {
  success: boolean;
  output?: any;
  error?: string;
  screenshotPath?: string;
  audioPath?: string;
}

interface AutonomousProject {
  id: string;
  title: string;
  description: string;
  goals: string[];
  status: 'planning' | 'researching' | 'executing' | 'optimizing' | 'completed' | 'failed';
  currentPhase: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

export class EnhancedBrain {
  private autonomousProjects: Map<string, AutonomousProject> = new Map();

  async executeTask(task: Task): Promise<TaskResult> {
    try {
      switch (task.type) {
        case 'screenshot':
          return await handleScreenshotTask(task);
        
        case 'chat':
          return await handleChatTask(task);
        
        case 'voice':
          return await handleVoiceTask(task);
        
        case 'plan':
          return await handlePlanningTask(task);
        
        case 'research':
          return await handleResearchTask(task);
        
        case 'autonomous_project':
          return await handleAutonomousProject(task);
        
        case 'optimize':
          return await handleOptimizationTask(task);
        
        case 'coordinate':
          return await handleCoordinationTask(task);
        
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
    } catch (error) {
      // Record failure for self-improvement
      await selfImprover.recordFailure(
        task.projectId || 'unknown',
        task.id || 'unknown',
        error instanceof Error ? error.message : 'Unknown error',
        { taskType: task.type, metadata: task.metadata }
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createAutonomousProject(
    title: string,
    description: string,
    goals: string[]
  ): Promise<AutonomousProject> {
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const project: AutonomousProject = {
      id: projectId,
      title,
      description,
      goals,
      status: 'planning',
      currentPhase: 'Initial Planning',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.autonomousProjects.set(projectId, project);
    await this.saveProject(project);

    // Start autonomous execution
    await this.executeAutonomousProject(projectId);

    return project;
  }

  private async executeAutonomousProject(projectId: string): Promise<void> {
    const project = this.autonomousProjects.get(projectId);
    if (!project) return;

    try {
      // Phase 1: Planning
      await this.updateProjectStatus(projectId, 'planning', 'Creating Project Plan');
      const plan = await projectPlanner.createProjectPlan(
        projectId,
        project.title,
        project.description,
        project.goals
      );
      await this.updateProjectProgress(projectId, 20);

      // Phase 2: Research
      await this.updateProjectStatus(projectId, 'researching', 'Conducting Research');
      const researchTask = await researchEngine.createResearchTask(
        project.title,
        'comprehensive',
        [
          'What are the current market trends?',
          'Who are the key competitors?',
          'What technologies are most suitable?',
          'What are the potential risks and opportunities?'
        ]
      );
      const findings = await researchEngine.executeResearch(researchTask.id);
      await this.updateProjectProgress(projectId, 40);

      // Phase 3: Execution
      await this.updateProjectStatus(projectId, 'executing', 'Executing Project Plan');
      await this.executeProjectPlan(projectId, plan);
      await this.updateProjectProgress(projectId, 80);

      // Phase 4: Optimization
      await this.updateProjectStatus(projectId, 'optimizing', 'Optimizing Performance');
      await this.optimizeProject(projectId);
      await this.updateProjectProgress(projectId, 95);

      // Phase 5: Completion
      await this.updateProjectStatus(projectId, 'completed', 'Project Completed');
      await this.updateProjectProgress(projectId, 100);

      await logAction('autonomous_project_completed', {
        projectId,
        title: project.title
      });

    } catch (error) {
      await this.updateProjectStatus(projectId, 'failed', 'Project Failed');
      await selfImprover.recordFailure(
        projectId,
        'autonomous_execution',
        error instanceof Error ? error.message : 'Unknown error',
        { projectTitle: project.title }
      );
    }
  }

  private async executeProjectPlan(projectId: string, plan: any): Promise<void> {
    let completedTasks = 0;
    const totalTasks = plan.tasks.length;

    for (const task of plan.tasks) {
      try {
        // Assign task to appropriate persona
        const assignedPersona = await this.assignTaskToPersona(task);
        
        // Create collaboration if multiple personas needed
        if (task.resources && task.resources.length > 1) {
          await coordinator.createCollaboration(
            projectId,
            task.title,
            task.description,
            task.resources
          );
        }

        // Execute task
        await this.executeTaskByType(task, assignedPersona);
        
        // Update task status
        await projectPlanner.updateTaskStatus(projectId, task.id, 'completed', assignedPersona);
        
        completedTasks++;
        await this.updateProjectProgress(projectId, 40 + (completedTasks / totalTasks) * 40);

        // Record success metric
        await selfImprover.recordMetric(
          projectId,
          'task_completion_rate',
          (completedTasks / totalTasks) * 100,
          90,
          'percentage'
        );

      } catch (error) {
        await projectPlanner.updateTaskStatus(projectId, task.id, 'failed');
        throw error;
      }
    }
  }

  private async assignTaskToPersona(task: any): Promise<string> {
    // Simple persona assignment based on task type
    const personaMap: { [key: string]: string } = {
      'research': 'researcher',
      'development': 'developer',
      'testing': 'tester',
      'deployment': 'devops',
      'optimization': 'optimizer'
    };

    return personaMap[task.type] || 'general';
  }

  private async executeTaskByType(task: any, personaId: string): Promise<void> {
    switch (task.type) {
      case 'research':
        await this.executeResearchTask(task);
        break;
      case 'development':
        await this.executeDevelopmentTask(task);
        break;
      case 'testing':
        await this.executeTestingTask(task);
        break;
      case 'deployment':
        await this.executeDeploymentTask(task);
        break;
      case 'optimization':
        await this.executeOptimizationTask(task);
        break;
      default:
        await this.executeGenericTask(task);
    }
  }

  private async executeResearchTask(task: any): Promise<void> {
    // Execute research using the research engine
    const researchTask = await researchEngine.createResearchTask(
      task.title,
      'focused',
      [task.description]
    );
    await researchEngine.executeResearch(researchTask.id);
  }

  private async executeDevelopmentTask(task: any): Promise<void> {
    // Execute development task using browser automation or API calls
    // This would integrate with actual development tools
    await logAction('development_task_executed', {
      taskId: task.id,
      title: task.title
    });
  }

  private async executeTestingTask(task: any): Promise<void> {
    // Execute testing task
    await logAction('testing_task_executed', {
      taskId: task.id,
      title: task.title
    });
  }

  private async executeDeploymentTask(task: any): Promise<void> {
    // Execute deployment task
    await logAction('deployment_task_executed', {
      taskId: task.id,
      title: task.title
    });
  }

  private async executeOptimizationTask(task: any): Promise<void> {
    // Execute optimization task
    await logAction('optimization_task_executed', {
      taskId: task.id,
      title: task.title
    });
  }

  private async executeGenericTask(task: any): Promise<void> {
    // Execute generic task using AI
    const response = await openRouter.chat({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an autonomous agent executing tasks. Complete the given task efficiently.'
        },
        {
          role: 'user',
          content: `Execute this task: ${task.description}`
        }
      ]
    });

    await logAction('generic_task_executed', {
      taskId: task.id,
      title: task.title,
      result: response.choices[0]?.message?.content
    });
  }

  private async optimizeProject(projectId: string): Promise<void> {
    // Get performance report
    const report = await selfImprover.getPerformanceReport(projectId);
    
    // Implement optimizations based on recommendations
    for (const recommendation of report.recommendations) {
      await this.implementOptimization(projectId, recommendation);
    }

    // Optimize workflow
    const workflowOptimization = await coordinator.optimizeWorkflow(projectId);
    for (const optimization of workflowOptimization.optimizations) {
      await this.implementWorkflowOptimization(projectId, optimization);
    }
  }

  private async implementOptimization(projectId: string, recommendation: string): Promise<void> {
    // Implement optimization based on recommendation
    await logAction('optimization_implemented', {
      projectId,
      recommendation
    });
  }

  private async implementWorkflowOptimization(projectId: string, optimization: string): Promise<void> {
    // Implement workflow optimization
    await logAction('workflow_optimization_implemented', {
      projectId,
      optimization
    });
  }

  private async updateProjectStatus(
    projectId: string,
    status: AutonomousProject['status'],
    phase: string
  ): Promise<void> {
    const project = this.autonomousProjects.get(projectId);
    if (!project) return;

    project.status = status;
    project.currentPhase = phase;
    project.updatedAt = new Date();

    await this.saveProject(project);
  }

  private async updateProjectProgress(projectId: string, progress: number): Promise<void> {
    const project = this.autonomousProjects.get(projectId);
    if (!project) return;

    project.progress = progress;
    project.updatedAt = new Date();

    await this.saveProject(project);
  }

  private async saveProject(project: AutonomousProject): Promise<void> {
    const memory = await loadMemory();
    memory[`autonomous_project_${project.id}`] = project;
    await saveMemory(memory);
  }

  async getAutonomousProject(projectId: string): Promise<AutonomousProject | null> {
    if (this.autonomousProjects.has(projectId)) {
      return this.autonomousProjects.get(projectId)!;
    }

    const memory = await loadMemory();
    const projectData = memory[`autonomous_project_${projectId}`];
    if (projectData) {
      this.autonomousProjects.set(projectId, projectData);
      return projectData;
    }

    return null;
  }

  async getAllAutonomousProjects(): Promise<AutonomousProject[]> {
    return Array.from(this.autonomousProjects.values());
  }
}

// Legacy task handlers (keeping for backward compatibility)
async function handleScreenshotTask(task: Task): Promise<TaskResult> {
  if (!task.url) {
    throw new Error('URL is required for screenshot tasks');
  }
  
  const screenshot = await takeScreenshot(task.url);
  await logAction('screenshot', {
    url: task.url,
    path: screenshot.path
  });
  
  return {
    success: true,
    screenshotPath: screenshot.path
  };
}

async function handleChatTask(task: Task): Promise<TaskResult> {
  const memory = await loadMemory();
  
  const response = await openRouter.chat({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are Jason, an autonomous agent helping with tasks.'
      },
      {
        role: 'user',
        content: task.metadata?.prompt || ''
      }
    ]
  });
  
  const content = response.choices[0]?.message?.content || '';
  
  await logAction('chat', {
    prompt: task.metadata?.prompt,
    response: content
  });
  
  return {
    success: true,
    output: content
  };
}

async function handleVoiceTask(task: Task): Promise<TaskResult> {
  if (!task.metadata?.text) {
    throw new Error('Text is required for voice tasks');
  }
  
  const audioPath = await elevenLabs.generateSpeech(task.metadata.text);
  
  await logAction('voice', {
    text: task.metadata.text,
    audioPath
  });
  
  return {
    success: true,
    audioPath
  };
}

async function handlePlanningTask(task: Task): Promise<TaskResult> {
  const memory = await loadMemory();
  
  const plan = await openRouter.chat({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are Jason, creating detailed execution plans.'
      },
      {
        role: 'user',
        content: task.metadata?.prompt || ''
      }
    ]
  });
  
  const content = plan.choices[0]?.message?.content || '';
  
  await logAction('plan', {
    prompt: task.metadata?.prompt,
    plan: content
  });
  
  return {
    success: true,
    output: content
  };
}

async function handleResearchTask(task: Task): Promise<TaskResult> {
  const researchTask = await researchEngine.createResearchTask(
    task.metadata?.topic || 'General Research',
    task.metadata?.scope || 'comprehensive',
    task.metadata?.questions || ['What are the key insights?']
  );
  
  const findings = await researchEngine.executeResearch(researchTask.id);
  
  return {
    success: true,
    output: findings
  };
}

async function handleAutonomousProject(task: Task): Promise<TaskResult> {
  const project = await new EnhancedBrain().createAutonomousProject(
    task.metadata?.title || 'Autonomous Project',
    task.metadata?.description || 'Project description',
    task.metadata?.goals || ['Complete the project successfully']
  );
  
  return {
    success: true,
    output: project
  };
}

async function handleOptimizationTask(task: Task): Promise<TaskResult> {
  const report = await selfImprover.getPerformanceReport(
    task.metadata?.projectId || 'unknown'
  );
  
  return {
    success: true,
    output: report
  };
}

async function handleCoordinationTask(task: Task): Promise<TaskResult> {
  const status = await coordinator.getCollaborationStatus(
    task.metadata?.projectId || 'unknown'
  );
  
  return {
    success: true,
    output: status
  };
}

// Export the enhanced brain and legacy function
export const enhancedBrain = new EnhancedBrain(); 