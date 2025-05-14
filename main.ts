import { loadMemory, saveMemory } from './core/memory';
import { getNextTask, removeTask } from './data/queue';
import { executeTask } from './core/brain';
import { logAction } from './core/logger';
import { updateStatus } from './core/status';
import { setupWebSocketServer } from './core/websocket';

// Initialize WebSocket server for real-time updates
setupWebSocketServer();

// Main execution loop
async function runLoop() {
  try {
    // Load current memory state
    const memory = await loadMemory();
    
    // Get next task from queue
    const task = await getNextTask();
    
    if (task) {
      // Execute the task
      const result = await executeTask(task);
      
      // Log the action
      await logAction(task.type, {
        taskId: task.id,
        projectId: task.projectId,
        result
      });
      
      // Update system status
      await updateStatus({
        currentTask: `${task.type} ${task.url || ''}`,
        lastUpdate: new Date().toISOString(),
        memorySize: `${memory.pastInteractions.length} items`,
        logPath: `./data/logs/log-${Date.now()}.json`
      });
      
      // Remove completed task from queue
      await removeTask(task.id);
      
      // Update memory with feedback
      await saveMemory({
        ...memory,
        pastInteractions: [
          ...memory.pastInteractions,
          {
            timestamp: new Date().toISOString(),
            task,
            result,
            success: true
          }
        ]
      });
    }
  } catch (error) {
    console.error('Error in main loop:', error);
    await logAction('error', {
      error: error.message,
      stack: error.stack
    });
  }
  
  // Schedule next iteration
  setTimeout(runLoop, 60000); // Run every 60 seconds
}

// Start the loop
runLoop().catch(console.error); 