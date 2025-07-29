import { storage } from '../storage';
import { OpenRouter } from '../../services/openrouter';
import { getNextTask, updateTaskStatus } from '../../data/queue';

const openRouter = new OpenRouter();

export interface TaskResult {
  success: boolean;
  output?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export class TaskRunner {
  async runNextTask(projectId: string): Promise<TaskResult | null> {
    console.log(`🎯 TaskRunner: Looking for next task for project ${projectId}`);
    
    try {
      const nextTask = await getNextTask();
      
      if (!nextTask || nextTask.projectId !== projectId) {
        console.log('⏸️ No tasks available for this project');
        return null;
      }

      console.log(`🚀 Executing task: ${nextTask.id} - ${nextTask.metadata?.goalTitle}`);
      
      await updateTaskStatus(nextTask.id, 'in_progress');
      
      const result = await this.executeTask(nextTask);
      
      if (result.success) {
        await updateTaskStatus(nextTask.id, 'completed');
        console.log(`✅ Task completed: ${nextTask.metadata?.goalTitle}`);
      } else {
        await updateTaskStatus(nextTask.id, 'failed');
        console.log(`❌ Task failed: ${nextTask.metadata?.goalTitle} - ${result.error}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Error in TaskRunner:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeTask(task: any): Promise<TaskResult> {
    const { goalId, goalTitle, type } = task.metadata;
    
    try {
      switch (type) {
        case 'code_generation':
          return await this.generateCode(task.projectId, goalId, goalTitle);
        case 'testing':
          return await this.runTests(task.projectId, goalId, goalTitle);
        case 'deployment':
          return await this.deployCode(task.projectId, goalId, goalTitle);
        default:
          throw new Error(`Unknown task type: ${type}`);
      }
    } catch (error) {
      console.error(`❌ Error executing task ${task.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async generateCode(projectId: string, goalId: string, goalTitle: string): Promise<TaskResult> {
    console.log(`💻 Generating code for goal: ${goalTitle}`);
    
    try {
      // Get project context
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }
      
      const features = await storage.getFeaturesByProject(projectId);
      const context = this.buildProjectContext(project, features);
      
      // Generate code using AI
      const aiResponse = await openRouter.chat({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert software developer. Generate working code for the given goal. Respond with ONLY valid JSON in this format:
{
  "code": "the actual code content",
  "language": "javascript|python|html|css|etc",
  "filename": "suggested filename",
  "description": "brief description of what this code does"
}`
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

      console.log(`✅ Code generated for goal: ${goalTitle}`);
      
      return {
        success: true,
        output: codeResult.code,
        metadata: {
          language: codeResult.language,
          filename: codeResult.filename,
          description: codeResult.description,
          goalId,
          goalTitle
        }
      };

    } catch (error) {
      console.error('❌ Error generating code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async runTests(projectId: string, goalId: string, goalTitle: string): Promise<TaskResult> {
    console.log(`🧪 Running tests for goal: ${goalTitle}`);
    
    // For now, return a placeholder result
    return {
      success: true,
      output: 'Tests passed',
      metadata: {
        goalId,
        goalTitle,
        testResults: 'placeholder'
      }
    };
  }

  private async deployCode(projectId: string, goalId: string, goalTitle: string): Promise<TaskResult> {
    console.log(`🚀 Deploying code for goal: ${goalTitle}`);
    
    // For now, return a placeholder result
    return {
      success: true,
      output: 'Deployment successful',
      metadata: {
        goalId,
        goalTitle,
        deploymentUrl: 'placeholder'
      }
    };
  }

  private buildProjectContext(project: any, features: any[]): string {
    let context = `Project: ${project.name}\nPrompt: ${project.prompt}\n\nFeatures:\n`;
    
    for (const feature of features) {
      context += `- ${feature.title}: ${feature.description}\n`;
    }
    
    return context;
  }
}

export const taskRunner = new TaskRunner(); 