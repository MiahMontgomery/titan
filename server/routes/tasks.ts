import { Router } from 'express';
import { taskExecutor } from '../ai/executor';
import { storage } from '../storage';

const router = Router();

/**
 * Execute a single task
 * POST /api/tasks/:id/execute
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    // Get task details from database
    const tasks = await storage.getTasksByProject('1'); // TODO: Get actual project ID
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Execute the task
    const executionRequest = {
      taskId: task.id,
      projectId: task.projectId || 1, // Fallback to 1 if null
      taskTitle: task.title,
      taskDescription: task.description || undefined
    };

    const result = await taskExecutor.executeTask(executionRequest);

    res.json({
      success: true,
      result,
      task: {
        id: task.id,
        title: task.title,
        status: result.success ? 'completed' : 'in_progress'
      }
    });

  } catch (error) {
    console.error('Error executing task:', error);
    res.status(500).json({ 
      error: 'Failed to execute task',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get task execution history
 * GET /api/tasks/:id/history
 */
router.get('/:id/history', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const history = await taskExecutor.getTaskExecutionHistory(taskId);
    
    res.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('Error getting task history:', error);
    res.status(500).json({ 
      error: 'Failed to get task history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get task details
 * GET /api/tasks/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    // Get task details from database
    const tasks = await storage.getTasksByProject('1'); // TODO: Get actual project ID
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      success: true,
      task
    });

  } catch (error) {
    console.error('Error getting task:', error);
    res.status(500).json({ 
      error: 'Failed to get task',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 