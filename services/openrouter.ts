import fetch from 'node-fetch';
import { storage } from '../server/storage';
import { type Project, type Message, type Feature, type Milestone, type Goal } from '@shared/schema';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface ChatResponse {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    message: ChatMessage;
    finish_reason: string;
  }>;
}

export class OpenRouter {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  
  constructor() {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is required');
    }
    this.apiKey = process.env.OPENROUTER_API_KEY;
  }

  public async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:4000',
        'X-Title': 'Titan Project Assistant'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
    }

    return response.json() as Promise<ChatResponse>;
  }
  
  private async getProjectContext(projectId: number): Promise<string> {
    const project = await storage.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const features = await storage.getFeaturesByProject(projectId);
    const messages = await storage.getMessagesByProject(projectId);
    const logs = await storage.getLogsByProject(projectId);
    
    // Get the last 10 messages for context
    const recentMessages = messages.slice(-10);
    const recentLogs = logs.slice(-5);
    
    // Build context string
    let context = `Project: ${project.name}\n`;
    context += `Description: ${project.prompt}\n\n`;
    
    context += 'Features:\n';
    for (const feature of features) {
      context += `- ${feature.title}: ${feature.description || 'No description'}\n`;
      
      // Get milestones for this feature
      const milestones = await storage.getMilestonesByFeature(feature.id);
      for (const milestone of milestones) {
        context += `  * ${milestone.title}\n`;
        
        // Get goals for this milestone
        const goals = await storage.getGoalsByMilestone(milestone.id);
        for (const goal of goals) {
          context += `    > ${goal.title} (${goal.completed ? 'Completed' : 'Pending'})\n`;
        }
      }
    }
    
    context += '\nRecent Messages:\n';
    for (const message of recentMessages) {
      context += `${message.sender}: ${message.content}\n`;
    }

    context += '\nRecent Activity Logs:\n';
    for (const log of recentLogs) {
      context += `[${log.type}] ${log.title}: ${log.details || ''}\n`;
    }
    
    return context;
  }

  private async createSystemPrompt(projectId: number): Promise<string> {
    const context = await this.getProjectContext(projectId);
    
    return `You are an autonomous AI agent working on a project. Your goal is to help achieve the project's objectives and work towards completing features, milestones, and goals.

Current Project Context:
${context}

Instructions:
1. Always maintain awareness of the project's goals and current state
2. Provide specific, actionable responses that move the project forward
3. When appropriate, suggest new features, milestones, or goals
4. Use your knowledge to solve problems and provide insights
5. Be proactive in identifying and addressing project needs
6. Maintain a professional and focused tone
7. When suggesting actions, explain your reasoning
8. Avoid generic responses - always tie your suggestions to the project context
9. Consider the project's history and recent activities when making decisions
10. If you notice patterns or potential issues, bring them up proactively

Remember: Your responses should be tailored to the specific project context and help achieve its objectives. Avoid generic advice and focus on concrete, actionable steps that align with the project's goals.`;
  }

  async generateResponse(projectId: number, userMessage: string): Promise<string> {
    const systemPrompt = await this.createSystemPrompt(projectId);
    
    const response = await this.chat({
      model: 'anthropic/claude-3-opus-20240229',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.choices[0].message.content;
  }

  async analyzeProject(projectId: number): Promise<{
    suggestedFeatures: string[];
    suggestedMilestones: string[];
    suggestedGoals: string[];
    analysis: string;
  }> {
    const systemPrompt = await this.createSystemPrompt(projectId);
    
    const response = await this.chat({
      model: 'anthropic/claude-3-opus-20240229',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Analyze the current project state and suggest new features, milestones, and goals that would help achieve the project objectives. Also provide a brief analysis of the current progress and what needs attention.' }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content;

    // Parse the response to extract structured data
    const suggestedFeatures: string[] = [];
    const suggestedMilestones: string[] = [];
    const suggestedGoals: string[] = [];
    let analysis = '';

    // Simple parsing logic - you might want to make this more robust
    const lines = content.split('\n');
    let currentSection = '';

    for (const line of lines) {
      if (line.toLowerCase().includes('suggested features:')) {
        currentSection = 'features';
      } else if (line.toLowerCase().includes('suggested milestones:')) {
        currentSection = 'milestones';
      } else if (line.toLowerCase().includes('suggested goals:')) {
        currentSection = 'goals';
      } else if (line.toLowerCase().includes('analysis:')) {
        currentSection = 'analysis';
      } else if (line.trim() && currentSection) {
        if (currentSection === 'features') {
          suggestedFeatures.push(line.trim());
        } else if (currentSection === 'milestones') {
          suggestedMilestones.push(line.trim());
        } else if (currentSection === 'goals') {
          suggestedGoals.push(line.trim());
        } else if (currentSection === 'analysis') {
          analysis += line.trim() + '\n';
        }
      }
    }

    return {
      suggestedFeatures,
      suggestedMilestones,
      suggestedGoals,
      analysis: analysis.trim()
    };
  }
  
  // Helper method for Claude 3 Opus
  async claudeChat(messages: ChatMessage[]): Promise<ChatResponse> {
    return this.chat({
      model: 'anthropic/claude-3-opus-20240229',
      messages,
      temperature: 0.7
    });
  }
  
  // Helper method for GPT-4 Turbo
  async gpt4Chat(messages: ChatMessage[]): Promise<ChatResponse> {
    return this.chat({
      model: 'gpt-4-turbo',
      messages,
      temperature: 0.7
    });
  }
  
  // Get available models
  async getModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://titan.ai'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
    }
    
    const data = await response.json() as { data: { id: string }[] };
    return data.data.map((model) => model.id);
  }
} 