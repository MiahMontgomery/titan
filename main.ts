import { loadMemory, saveMemory } from './core/memory';
import { getNextTask, removeTask } from './data/queue';
import { executeTask } from './core/brain';
import { logAction } from './core/logger';
import { updateStatus } from './core/status';

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
            type: task.type,
            data: {
              task,
              result,
              success: true
            }
          }
        ]
      });
    }
  } catch (error: any) {
    console.error('Error in main loop:', error);
    await logAction('error', {
      error: error.message,
      stack: error.stack
    });
  }
  
  // Schedule next iteration
  setTimeout(runLoop, 60000); // Run every 60 seconds
}

// Export the run function for external use
export async function runAutonomousLoop() {
  console.log('🤖 Starting Titan autonomous AI system...');
  return runLoop();
}

// Start the loop when this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runLoop().catch(console.error);
} 