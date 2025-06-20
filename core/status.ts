import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SystemStatus {
  currentTask: string;
  lastUpdate: string;
  memorySize: string;
  logPath: string;
  projectId?: string;
  taskId?: string;
}

const STATUS_FILE = path.join(__dirname, '../output/status.json');

// Ensure output directory exists
async function ensureOutputDirectory(): Promise<void> {
  const outputDir = path.dirname(STATUS_FILE);
  try {
    await fs.access(outputDir);
  } catch {
    await fs.mkdir(outputDir, { recursive: true });
  }
}

// Initialize status file if it doesn't exist
async function initializeStatus(): Promise<void> {
  await ensureOutputDirectory();
  try {
    await fs.access(STATUS_FILE);
  } catch {
    const initialStatus: SystemStatus = {
      currentTask: 'idle',
      lastUpdate: new Date().toISOString(),
      memorySize: '0 items',
      logPath: ''
    };
    await fs.writeFile(STATUS_FILE, JSON.stringify(initialStatus, null, 2));
  }
}

// Update system status
export async function updateStatus(status: Partial<SystemStatus>): Promise<void> {
  await initializeStatus();
  
  const currentStatus = JSON.parse(
    await fs.readFile(STATUS_FILE, 'utf-8')
  ) as SystemStatus;
  
  const updatedStatus: SystemStatus = {
    ...currentStatus,
    ...status,
    lastUpdate: new Date().toISOString()
  };
  
  await fs.writeFile(STATUS_FILE, JSON.stringify(updatedStatus, null, 2));
}

// Get current status
export async function getStatus(): Promise<SystemStatus> {
  await initializeStatus();
  const data = await fs.readFile(STATUS_FILE, 'utf-8');
  return JSON.parse(data);
}

// Update task progress
export async function updateTaskProgress(
  projectId: string,
  taskId: string,
  progress: number
): Promise<void> {
  await updateStatus({
    projectId,
    taskId,
    currentTask: `Task ${taskId} in progress (${progress}%)`
  });
}

// Mark task as completed
export async function markTaskCompleted(
  projectId: string,
  taskId: string
): Promise<void> {
  await updateStatus({
    projectId,
    taskId,
    currentTask: `Task ${taskId} completed`
  });
}

// Mark task as failed
export async function markTaskFailed(
  projectId: string,
  taskId: string,
  error: string
): Promise<void> {
  await updateStatus({
    projectId,
    taskId,
    currentTask: `Task ${taskId} failed: ${error}`
  });
} 