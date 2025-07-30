import { OpenRouter } from '../../services/openrouter';
import { storage } from '../storage';

const openRouter = new OpenRouter();

export interface TaskExecutionResult {
  taskId: number;
  output: string;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface TaskExecutionRequest {
  taskId: number;
  projectId: number;
  taskTitle: string;
  taskDescription?: string;
}

export class TaskExecutor {
  /**
   * Execute a single task using AI
   */
  async executeTask(request: TaskExecutionRequest): Promise<TaskExecutionResult> {
    try {
      console.log(`🤖 Executing task: ${request.taskTitle} (ID: ${request.taskId})`);

      // Build execution prompt
      const prompt = this.buildExecutionPrompt(request);
      
      // Execute with AI
      const aiResponse = await openRouter.chat({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an AI task executor. Complete the following task with a code snippet or implementation detail.

Respond with ONLY a single code block or clear implementation instructions.
Do not include explanations, comments, or additional text outside the code block.
Ensure the response is syntactically valid and executable.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500
      });

      const responseContent = aiResponse.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from AI');
      }

      // Validate and clean the response
      const validatedOutput = this.validateAndCleanOutput(responseContent);
      
      // Store execution result
      const result: TaskExecutionResult = {
        taskId: request.taskId,
        output: validatedOutput,
        success: true,
        timestamp: new Date()
      };

      // Update task status and store result
      await this.storeExecutionResult(request.taskId, result);

      console.log(`✅ Task execution completed: ${request.taskTitle}`);
      return result;

    } catch (error) {
      console.error('❌ Task execution failed:', error);
      
      const errorResult: TaskExecutionResult = {
        taskId: request.taskId,
        output: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };

      // Store error result
      await this.storeExecutionResult(request.taskId, errorResult);
      
      return errorResult;
    }
  }

  /**
   * Build execution prompt for the task
   */
  private buildExecutionPrompt(request: TaskExecutionRequest): string {
    let prompt = `Task: "${request.taskTitle}"`;
    
    if (request.taskDescription) {
      prompt += `\nDescription: "${request.taskDescription}"`;
    }
    
    prompt += `\n\nProvide a complete implementation for this task.`;
    
    return prompt;
  }

  /**
   * Validate and clean AI output
   */
  private validateAndCleanOutput(output: string): string {
    // Remove markdown code block markers if present
    let cleaned = output.replace(/```[\w]*\n?/g, '').replace(/```\n?/g, '');
    
    // Remove leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // Basic validation - ensure it's not empty
    if (!cleaned || cleaned.length < 10) {
      throw new Error('AI response too short or empty');
    }
    
    // Basic syntax validation for common languages
    if (cleaned.includes('function') || cleaned.includes('const') || cleaned.includes('let')) {
      // JavaScript/TypeScript - check for basic syntax
      if (!cleaned.includes('{') && !cleaned.includes('(')) {
        console.warn('⚠️ Potential syntax issue in JavaScript/TypeScript code');
      }
    }
    
    return cleaned;
  }

  /**
   * Store execution result in database
   */
  private async storeExecutionResult(taskId: number, result: TaskExecutionResult): Promise<void> {
    try {
      // Update task status
      if (result.success) {
        await storage.updateTaskStatus(taskId.toString(), 'completed');
      } else {
        await storage.updateTaskStatus(taskId.toString(), 'in_progress');
      }

      // Store execution output
      await storage.createOutput({
        projectId: '1', // TODO: Get actual project ID from task
        type: 'task_execution',
        content: JSON.stringify({
          taskId: result.taskId,
          output: result.output,
          success: result.success,
          error: result.error,
          timestamp: result.timestamp.toISOString()
        })
      });

      console.log(`💾 Stored execution result for task: ${taskId}`);
    } catch (error) {
      console.error('❌ Error storing execution result:', error);
      throw error;
    }
  }

  /**
   * Get execution history for a task
   */
  async getTaskExecutionHistory(taskId: number): Promise<TaskExecutionResult[]> {
    try {
      const outputs = await storage.getOutputsByProject('1'); // TODO: Get actual project ID
      
      return outputs
        .filter(output => {
          try {
            const content = JSON.parse(output.content);
            return content.taskId === taskId && output.type === 'task_execution';
          } catch {
            return false;
          }
        })
        .map(output => {
          const content = JSON.parse(output.content);
          return {
            taskId: content.taskId,
            output: content.output,
            success: content.success,
            error: content.error,
            timestamp: new Date(content.timestamp)
          };
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('❌ Error getting task execution history:', error);
      return [];
    }
  }
}

export const taskExecutor = new TaskExecutor(); 