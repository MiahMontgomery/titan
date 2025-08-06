import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface MemoryState {
  pastInteractions: Array<{
    timestamp: string;
    type: string;
    data: any;
  }>;
  tasksCompleted: Array<{
    taskId: string;
    projectId: string;
    type: string;
    result: any;
    timestamp: string;
  }>;
  failures: Array<{
    taskId: string;
    projectId: string;
    error: string;
    timestamp: string;
  }>;
  learningNotes: Array<{
    timestamp: string;
    note: string;
    context: any;
  }>;
  agents: {
    [agentId: string]: {
      memory: any;
      lastUpdate: string;
    };
  };
  // Add index signature for flexible agent data access
  [key: string]: any;
}

const MEMORY_FILE = path.join(__dirname, '../data/memory.json');

// Initialize memory file if it doesn't exist
async function initializeMemory(): Promise<void> {
  try {
    await fs.access(MEMORY_FILE);
  } catch {
    const initialMemory: MemoryState = {
      pastInteractions: [],
      tasksCompleted: [],
      failures: [],
      learningNotes: [],
      agents: {}
    };
    await fs.writeFile(MEMORY_FILE, JSON.stringify(initialMemory, null, 2));
  }
}

// Load memory state from file
export async function loadMemory(): Promise<MemoryState> {
  await initializeMemory();
  const data = await fs.readFile(MEMORY_FILE, 'utf-8');
  return JSON.parse(data);
}

// Save updated memory state
export async function saveMemory(memory: MemoryState): Promise<void> {
  await fs.writeFile(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// Append a new memory entry
export async function appendToMemory(
  type: 'interaction' | 'task' | 'failure' | 'note',
  data: any
): Promise<void> {
  const memory = await loadMemory();
  
  switch (type) {
    case 'interaction':
      memory.pastInteractions.push({
        timestamp: new Date().toISOString(),
        type: data.type,
        data: data.content
      });
      break;
    case 'task':
      memory.tasksCompleted.push({
        taskId: data.taskId,
        projectId: data.projectId,
        type: data.type,
        result: data.result,
        timestamp: new Date().toISOString()
      });
      break;
    case 'failure':
      memory.failures.push({
        taskId: data.taskId,
        projectId: data.projectId,
        error: data.error,
        timestamp: new Date().toISOString()
      });
      break;
    case 'note':
      memory.learningNotes.push({
        timestamp: new Date().toISOString(),
        note: data.note,
        context: data.context
      });
      break;
  }
  
  await saveMemory(memory);
}

// Save agent memory
export async function saveAgentMemory(
  agentId: string,
  memory: any
): Promise<void> {
  const state = await loadMemory();
  state.agents[agentId] = {
    memory,
    lastUpdate: new Date().toISOString()
  };
  await saveMemory(state);
}

// Load agent memory
export async function loadAgentMemory(agentId: string): Promise<any> {
  const state = await loadMemory();
  return state.agents[agentId]?.memory || {};
} 