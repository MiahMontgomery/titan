import fs from 'fs/promises';
import path from 'path';

interface LogEntry {
  timestamp: string;
  action: string;
  projectId?: string;
  personaId?: string;
  taskId?: string;
  result: any;
}

const LOGS_DIR = path.join(__dirname, '../data/logs');

// Ensure logs directory exists
async function ensureLogsDirectory(): Promise<void> {
  try {
    await fs.access(LOGS_DIR);
  } catch {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  }
}

// Get current log file path
function getCurrentLogPath(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(LOGS_DIR, `log-${timestamp}.json`);
}

// Log an action
export async function logAction(
  action: string,
  data: {
    projectId?: string;
    personaId?: string;
    taskId?: string;
    result: any;
  }
): Promise<string> {
  await ensureLogsDirectory();
  
  const logPath = getCurrentLogPath();
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    action,
    projectId: data.projectId,
    personaId: data.personaId,
    taskId: data.taskId,
    result: data.result
  };
  
  await fs.writeFile(logPath, JSON.stringify(entry, null, 2));
  return logPath;
}

// Get all logs
export async function getLogs(): Promise<LogEntry[]> {
  await ensureLogsDirectory();
  
  const files = await fs.readdir(LOGS_DIR);
  const logs: LogEntry[] = [];
  
  for (const file of files) {
    if (file.startsWith('log-') && file.endsWith('.json')) {
      const content = await fs.readFile(path.join(LOGS_DIR, file), 'utf-8');
      logs.push(JSON.parse(content));
    }
  }
  
  return logs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// Get recent logs
export async function getRecentLogs(limit: number = 100): Promise<LogEntry[]> {
  await ensureLogsDirectory();
  
  const files = await fs.readdir(LOGS_DIR);
  const logFiles = files
    .filter(file => file.startsWith('log-'))
    .sort()
    .reverse()
    .slice(0, limit);
  
  const logs: LogEntry[] = [];
  
  for (const file of logFiles) {
    const content = await fs.readFile(path.join(LOGS_DIR, file), 'utf-8');
    logs.push(JSON.parse(content));
  }
  
  return logs;
}

// Get logs for a specific project
export async function getProjectLogs(projectId: string): Promise<LogEntry[]> {
  await ensureLogsDirectory();
  
  const files = await fs.readdir(LOGS_DIR);
  const logs: LogEntry[] = [];
  
  for (const file of files) {
    if (file.startsWith('log-') || file.startsWith('daily-')) {
      const content = await fs.readFile(path.join(LOGS_DIR, file), 'utf-8');
      const entry = JSON.parse(content);
      if (entry.projectId === projectId) {
        logs.push(entry);
      }
    }
  }
  
  return logs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
} 