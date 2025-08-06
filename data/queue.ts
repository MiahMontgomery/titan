import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Task {
  id: string;
  type: string;
  projectId: string;
  url?: string;
  createdAt: string;
  priority?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}

const QUEUE_FILE = path.join(__dirname, 'queue.json');

// Initialize queue file if it doesn't exist
async function initializeQueue(): Promise<void> {
  try {
    await fs.access(QUEUE_FILE);
  } catch {
    await fs.writeFile(QUEUE_FILE, JSON.stringify([], null, 2));
  }
}

// Get next task from queue
export async function getNextTask(): Promise<Task | null> {
  await initializeQueue();
  const data = await fs.readFile(QUEUE_FILE, 'utf-8');
  const queue: Task[] = JSON.parse(data);
  
  // Sort by priority (higher first) and creation time (older first)
  const sortedQueue = queue
    .filter(task => task.status === 'pending')
    .sort((a, b) => {
      const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  
  if (sortedQueue.length === 0) return null;
  
  const nextTask = sortedQueue[0];
  nextTask.status = 'in_progress';
  await saveQueue(queue);
  
  return nextTask;
}

// Add new task to queue
export async function addTask(task: Omit<Task, 'id' | 'createdAt' | 'status'>): Promise<Task> {
  await initializeQueue();
  const data = await fs.readFile(QUEUE_FILE, 'utf-8');
  const queue: Task[] = JSON.parse(data);
  
  const newTask: Task = {
    ...task,
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  
  queue.push(newTask);
  await saveQueue(queue);
  
  return newTask;
}

// Remove task from queue
export async function removeTask(taskId: string): Promise<void> {
  await initializeQueue();
  const data = await fs.readFile(QUEUE_FILE, 'utf-8');
  const queue: Task[] = JSON.parse(data);
  
  const updatedQueue = queue.filter(task => task.id !== taskId);
  await saveQueue(updatedQueue);
}

// Update task status
export async function updateTaskStatus(taskId: string, status: Task['status']): Promise<void> {
  await initializeQueue();
  const data = await fs.readFile(QUEUE_FILE, 'utf-8');
  const queue: Task[] = JSON.parse(data);
  
  const taskIndex = queue.findIndex(task => task.id === taskId);
  if (taskIndex !== -1) {
    queue[taskIndex].status = status;
    await saveQueue(queue);
  }
}

// Save queue to file
async function saveQueue(queue: Task[]): Promise<void> {
  await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));
} 