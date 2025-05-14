import fetch from 'node-fetch';

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
  private baseUrl: string = 'https://openrouter.ai/api/v1';
  
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
  }
  
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://titan.ai', // Required by OpenRouter
        'X-Title': 'Titan AI' // Optional but recommended
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens ?? 1000
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
    }
    
    return response.json();
  }
  
  // Helper method for Claude 3 Opus
  async claudeChat(messages: ChatMessage[]): Promise<ChatResponse> {
    return this.chat({
      model: 'claude-3-opus',
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
    
    const data = await response.json();
    return data.data.map((model: any) => model.id);
  }
} 