import { storage } from '../storage';
import { addTask, getNextTask, updateTaskStatus } from '../../data/queue';
import { OpenRouter } from '../../services/openrouter';
import { checkpointStorage } from '../storage/checkpoints';
import { sessionMemoryStorage } from '../storage/sessionMemory';
import { performanceMemoryStorage } from '../storage/performanceMemory';
// Import the broadcast function from routes
// This will be replaced with the actual broadcast function when the agent is used
function broadcast(data: any) {
  console.log('📡 Broadcasting:', data);
  // In the actual implementation, this will be the broadcast function from routes.ts
}

const openRouter = new OpenRouter();

export interface AutonomousTask {
  id: string;
  projectId: string;
  goalId: string;
  goalTitle: string;
  type: 'code_generation' | 'testing' | 'deployment';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  output?: string;
  error?: string;
}

export class AutonomousProjectAgent {
  private isRunning = false;
  private currentProjectId?: string;
  private broadcastFunction: ((data: any) => void) | null = null;
  private agentId = 'autonomous-project-agent';

  async startAutonomousExecution(projectId: string): Promise<void> {
    console.log(`🚀 Starting autonomous execution for project: ${projectId}`);
    this.currentProjectId = projectId;
    this.isRunning = true;

    // Check for last session and resume if found
    await this.checkAndResumeSession(projectId);

    // Enqueue all goals for this project
    await this.enqueueProjectGoals(projectId);

    // Start the execution loop
    await this.runExecutionLoop(projectId);
  }

  private async enqueueProjectGoals(projectId: string): Promise<void> {
    console.log(`📋 Enqueuing goals for project: ${projectId}`);
    
    try {
      const features = await storage.getFeaturesByProject(projectId);
      
      for (const feature of features) {
        const milestones = await storage.getMilestonesByFeature(feature.id);
        
        for (const milestone of milestones) {
          const goals = await storage.getGoalsByMilestone(milestone.id);
          
          for (const goal of goals) {
            if (!goal.completed) {
              await addTask({
                type: 'goal_execution',
                projectId,
                priority: 1,
                metadata: {
                  goalId: goal.id,
                  goalTitle: goal.title,
                  milestoneId: milestone.id,
                  featureId: feature.id,
                  type: 'code_generation'
                }
              });
              
              console.log(`✅ Enqueued goal: ${goal.title}`);
              if (this.broadcastFunction) {
                this.broadcastFunction({
                  type: 'goal_enqueued',
                  projectId,
                  goalId: goal.id,
                  goalTitle: goal.title
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error enqueuing goals:', error);
      throw error;
    }
  }

  private async runExecutionLoop(projectId: string): Promise<void> {
    console.log(`🔄 Starting execution loop for project: ${projectId}`);
    
    while (this.isRunning && this.currentProjectId === projectId) {
      try {
        const nextTask = await getNextTask();
        
        if (!nextTask) {
          console.log('⏸️ No more tasks in queue, waiting...');
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          continue;
        }

        if (nextTask.projectId !== projectId) {
          console.log(`⏭️ Skipping task for different project: ${nextTask.projectId}`);
          continue;
        }

        console.log(`🎯 Processing task: ${nextTask.id} - ${nextTask.metadata?.goalTitle}`);
        
        await this.processTask(nextTask);
        
        // Small delay between tasks
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error('❌ Error in execution loop:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait before retrying
      }
    }
  }

    private async processTask(task: any): Promise<void> {
    try {
      await updateTaskStatus(task.id, 'in_progress');
      
      if (this.broadcastFunction) {
        this.broadcastFunction({
          type: 'task_started',
          projectId: task.projectId,
          taskId: task.id,
          goalTitle: task.metadata?.goalTitle
        });
      }

      const { goalId, goalTitle, type, milestoneId, featureId } = task.metadata;

      // Infer skill tag for performance tracking
      const skillTag = await this.inferSkillTag(goalTitle);

      // Save session state before processing
      await this.saveSession({
        projectId: parseInt(task.projectId),
        goalId: parseInt(goalId),
        featureId: parseInt(featureId),
        milestoneId: parseInt(milestoneId),
        taskSummary: goalTitle,
        mode: 'build'
      });

      let success = false;
      let failReason = '';

      try {
        if (type === 'code_generation') {
          await this.generateCodeForGoal(task.projectId, goalId, goalTitle);
        }

        await updateTaskStatus(task.id, 'completed');
        success = true;
        
        if (this.broadcastFunction) {
          this.broadcastFunction({
            type: 'task_completed',
            projectId: task.projectId,
            taskId: task.id,
            goalTitle: task.metadata?.goalTitle
          });
        }
      } catch (error) {
        failReason = error instanceof Error ? error.message : 'Unknown error';
        throw error;
      } finally {
        // Record performance attempt
        await performanceMemoryStorage.recordAttempt({
          agentId: this.agentId,
          skillTag,
          taskType: type,
          success,
          failReason: success ? undefined : failReason,
          notes: `Task: ${goalTitle}, Project: ${task.projectId}`
        });
      }

    } catch (error) {
      console.error('❌ Error processing task:', error);
      await updateTaskStatus(task.id, 'failed');
      
      if (this.broadcastFunction) {
        this.broadcastFunction({
          type: 'task_failed',
          projectId: task.projectId,
          taskId: task.id,
          goalTitle: task.metadata?.goalTitle,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private async inferSkillTag(goalTitle: string, goalDescription?: string): Promise<string> {
    // Simple skill inference based on goal title and description
    const text = `${goalTitle} ${goalDescription || ''}`.toLowerCase();
    
    if (text.includes('code') || text.includes('generate') || text.includes('implement')) {
      return 'code-generation';
    } else if (text.includes('test') || text.includes('validate')) {
      return 'testing';
    } else if (text.includes('deploy') || text.includes('build')) {
      return 'deployment';
    } else if (text.includes('parse') || text.includes('diff')) {
      return 'diff-parsing';
    } else if (text.includes('queue') || text.includes('route')) {
      return 'queue-routing';
    } else if (text.includes('schema') || text.includes('validate')) {
      return 'schema-validation';
    } else {
      return 'general-task';
    }
  }

  private async generateCodeForGoal(projectId: string, goalId: string, goalTitle: string): Promise<void> {
    console.log(`💻 Generating code for goal: ${goalTitle}`);
    
    try {
      // Get project context
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }
      const features = await storage.getFeaturesByProject(projectId);
      
      // Build context for AI
      const context = this.buildProjectContext(project, features);
      
      // Get agent memory summary for prompt injection
      const memorySummary = await performanceMemoryStorage.getAgentMemorySummary(this.agentId);
      
      // Get behavior instructions based on agent performance
      const behaviorInstructions = await performanceMemoryStorage.generateBehaviorInstructions(this.agentId, goalTitle);
      
      let systemPrompt = `You are an expert software developer. Generate working code for the given goal. Respond with ONLY valid JSON in this format:
{
  "code": "the actual code content",
  "language": "javascript|python|html|css|etc",
  "filename": "suggested filename",
  "description": "brief description of what this code does"
}`;

      // Inject performance memory if available
      if (memorySummary) {
        systemPrompt += `\n\n${memorySummary}`;
      }

      // Inject behavior shaping instructions
      if (behaviorInstructions) {
        systemPrompt += `\n\nBehavior Instructions:\n${behaviorInstructions}`;
      }
      
      // Generate code using AI
      const aiResponse = await openRouter.chat({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Project: ${project.name}\nContext: ${context}\nGoal: ${goalTitle}\n\nGenerate working code for this goal.`
          }
        ],
        max_tokens: 2000
      });

      const responseContent = aiResponse.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from AI');
      }

      const codeResult = JSON.parse(responseContent);
      
      // Save the output
      await storage.createOutput({
        projectId,
        type: 'code',
        content: JSON.stringify({
          code: codeResult.code,
          language: codeResult.language,
          filename: codeResult.filename,
          description: codeResult.description,
          goalId,
          goalTitle
        })
      });

      // Create checkpoint for rollback
      const checkpointSummary = `Generated ${codeResult.language} code for ${goalTitle}`;
      await checkpointStorage.createCheckpoint({
        projectId: parseInt(projectId),
        goalId: parseInt(goalId),
        summary: checkpointSummary,
        codeDiff: codeResult.code
      });

      console.log(`✅ Code generated for goal: ${goalTitle}`);
      
      if (this.broadcastFunction) {
        this.broadcastFunction({
          type: 'code_generated',
          projectId,
          goalId,
          goalTitle,
          filename: codeResult.filename,
          language: codeResult.language
        });
      }

    } catch (error) {
      console.error('❌ Error generating code:', error);
      throw error;
    }
  }

  private buildProjectContext(project: any, features: any[]): string {
    let context = `Project: ${project.name}\nPrompt: ${project.prompt}\n\nFeatures:\n`;
    
    for (const feature of features) {
      context += `- ${feature.title}: ${feature.description}\n`;
    }
    
    return context;
  }

  stopExecution(): void {
    console.log('🛑 Stopping autonomous execution');
    this.isRunning = false;
    this.currentProjectId = undefined;
  }

  private async checkAndResumeSession(projectId: string): Promise<void> {
    try {
      const lastSession = await sessionMemoryStorage.getLastSession(this.agentId);
      
      if (lastSession && lastSession.projectId === parseInt(projectId)) {
        const resumeMessage = `🧠 Resuming from last session: Project ${lastSession.projectId} / Goal ${lastSession.goalId} / Task ${lastSession.taskSummary} / Mode: ${lastSession.mode}. Last touched at ${lastSession.timestamp}`;
        
        console.log(resumeMessage);
        
        if (this.broadcastFunction) {
          this.broadcastFunction({
            type: 'agent_session_resumed',
            projectId,
            agentId: this.agentId,
            session: lastSession,
            message: resumeMessage
          });
        }
      }
    } catch (error) {
      console.error('❌ Error checking session memory:', error);
    }
  }

  private async saveSession(context: {
    projectId?: number;
    goalId?: number;
    featureId?: number;
    milestoneId?: number;
    taskSummary?: string;
    mode: 'build' | 'debug' | 'optimize';
  }): Promise<void> {
    try {
      await sessionMemoryStorage.saveSession({
        agentId: this.agentId,
        ...context
      });

      if (this.broadcastFunction) {
        this.broadcastFunction({
          type: 'agent_session_saved',
          projectId: context.projectId?.toString(),
          agentId: this.agentId,
          session: context
        });
      }
    } catch (error) {
      console.error('❌ Error saving session:', error);
    }
  }

  setBroadcastFunction(broadcastFn: (data: any) => void): void {
    this.broadcastFunction = broadcastFn;
  }

  isExecuting(): boolean {
    return this.isRunning;
  }
}

export const autonomousProjectAgent = new AutonomousProjectAgent(); 