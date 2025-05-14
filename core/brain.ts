import { takeScreenshot } from '../puppeteer/screenshot';
import { logAction } from './logger';
import { loadMemory, saveMemory } from './memory';
import { Task } from '../data/queue';
import { OpenRouter } from '../services/openrouter';
import { ElevenLabs } from '../services/elevenlabs';

const openRouter = new OpenRouter();
const elevenLabs = new ElevenLabs();

interface TaskResult {
  success: boolean;
  output?: any;
  error?: string;
  screenshotPath?: string;
  audioPath?: string;
}

export async function executeTask(task: Task): Promise<TaskResult> {
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
      
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

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
  
  // Use Claude for high-level reasoning
  const response = await openRouter.chat({
    model: 'claude-3-opus',
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
  
  // Use GPT-4 for detailed planning
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