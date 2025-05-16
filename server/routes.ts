import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from "ws";
import { z } from "zod";
import { 
  insertProjectSchema, 
  insertFeatureSchema, 
  insertMilestoneSchema,
  insertGoalSchema,
  insertMessageSchema,
  insertLogSchema,
  insertOutputSchema,
  insertSaleSchema
} from "@shared/schema";
import dotenv from "dotenv";

export async function registerRoutes(app: Express): Promise<Server> {
  // Load environment variables
  dotenv.config();
  
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      try {
        // Handle WebSocket messages
        console.log('Received message:', message.toString());
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  // Broadcast to all connected clients
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  // Project routes
  app.post('/api/projects/create', async (req, res) => {
    console.log('Received project creation request with body:', req.body);
    try {
      const projectData = insertProjectSchema.parse(req.body);
      console.log('Validated project data:', projectData);
      
      const project = await storage.createProject(projectData);
      console.log('Project created successfully:', project);
      
      // Broadcast new project to all clients
      broadcast({ type: 'project_created', project });
      
      res.status(201).json(project);
    } catch (error) {
      console.error('Project creation error:', error);
      if (error instanceof z.ZodError) {
        console.error('Validation error details:', error.errors);
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create project' });
      }
    }
  });
  
  app.get('/api/projects', async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get projects' });
    }
  });
  
  app.get('/api/projects/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get project' });
    }
  });
  
  // Feature routes
  app.post('/api/features/create', async (req, res) => {
    try {
      const featureData = insertFeatureSchema.parse(req.body);
      const feature = await storage.createFeature(featureData);
      
      // Broadcast new feature
      broadcast({ type: 'feature_created', feature });
      
      res.status(201).json(feature);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create feature' });
      }
    }
  });
  
  app.get('/api/projects/:id/features', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const features = await storage.getFeaturesByProject(projectId);
      res.json(features);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get features' });
    }
  });
  
  app.put('/api/features/:id/complete', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const feature = await storage.completeFeature(id);
      
      if (!feature) {
        return res.status(404).json({ error: 'Feature not found' });
      }
      
      // Broadcast feature update
      broadcast({ type: 'feature_updated', feature });
      
      res.json(feature);
    } catch (error) {
      res.status(500).json({ error: 'Failed to complete feature' });
    }
  });
  
  // Milestone routes
  app.post('/api/milestones/create', async (req, res) => {
    try {
      const milestoneData = insertMilestoneSchema.parse(req.body);
      const milestone = await storage.createMilestone(milestoneData);
      
      // Broadcast new milestone
      broadcast({ type: 'milestone_created', milestone });
      
      res.status(201).json(milestone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create milestone' });
      }
    }
  });
  
  app.get('/api/features/:id/milestones', async (req, res) => {
    try {
      const featureId = parseInt(req.params.id);
      const milestones = await storage.getMilestonesByFeature(featureId);
      res.json(milestones);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get milestones' });
    }
  });
  
  // Goal routes
  app.post('/api/goals/create', async (req, res) => {
    try {
      const goalData = insertGoalSchema.parse(req.body);
      const goal = await storage.createGoal(goalData);
      
      // Broadcast new goal
      broadcast({ type: 'goal_created', goal });
      
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create goal' });
      }
    }
  });
  
  app.get('/api/milestones/:id/goals', async (req, res) => {
    try {
      const milestoneId = parseInt(req.params.id);
      const goals = await storage.getGoalsByMilestone(milestoneId);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get goals' });
    }
  });
  
  app.put('/api/goals/:id/complete', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const goal = await storage.completeGoal(id);
      
      if (!goal) {
        return res.status(404).json({ error: 'Goal not found' });
      }
      
      // Broadcast goal update
      broadcast({ type: 'goal_updated', goal });
      
      res.json(goal);
    } catch (error) {
      res.status(500).json({ error: 'Failed to complete goal' });
    }
  });
  
  // Message routes
  app.post('/api/messages/create', async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      
      // Broadcast new message
      broadcast({ type: 'message_created', message });
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create message' });
      }
    }
  });
  
  app.get('/api/projects/:id/messages', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const messages = await storage.getMessagesByProject(projectId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });
  
  // Log routes
  app.post('/api/logs/create', async (req, res) => {
    try {
      const logData = insertLogSchema.parse(req.body);
      const log = await storage.createLog(logData);
      
      // Broadcast new log
      broadcast({ type: 'log_created', log });
      
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create log' });
      }
    }
  });
  
  app.get('/api/projects/:id/logs', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const logs = await storage.getLogsByProject(projectId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get logs' });
    }
  });
  
  // Output routes
  app.post('/api/outputs/create', async (req, res) => {
    try {
      const outputData = insertOutputSchema.parse(req.body);
      const output = await storage.createOutput(outputData);
      
      // Broadcast new output
      broadcast({ type: 'output_created', output });
      
      res.status(201).json(output);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create output' });
      }
    }
  });
  
  app.get('/api/projects/:id/outputs', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const outputs = await storage.getOutputsByProject(projectId);
      res.json(outputs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get outputs' });
    }
  });
  
  app.put('/api/outputs/:id/approve', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const output = await storage.approveOutput(id);
      
      if (!output) {
        return res.status(404).json({ error: 'Output not found' });
      }
      
      // Broadcast output update
      broadcast({ type: 'output_updated', output });
      
      res.json(output);
    } catch (error) {
      res.status(500).json({ error: 'Failed to approve output' });
    }
  });
  
  app.put('/api/outputs/:id/reject', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const output = await storage.rejectOutput(id);
      
      if (!output) {
        return res.status(404).json({ error: 'Output not found' });
      }
      
      // Broadcast output update
      broadcast({ type: 'output_updated', output });
      
      res.json(output);
    } catch (error) {
      res.status(500).json({ error: 'Failed to reject output' });
    }
  });
  
  // Sales routes
  app.post('/api/sales/create', async (req, res) => {
    try {
      const saleData = insertSaleSchema.parse(req.body);
      const sale = await storage.createSale(saleData);
      
      // Broadcast new sale
      broadcast({ type: 'sale_created', sale });
      
      res.status(201).json(sale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create sale' });
      }
    }
  });
  
  app.get('/api/projects/:id/sales', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const sales = await storage.getSalesByProject(projectId);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get sales' });
    }
  });
  
  app.get('/api/projects/:id/performance', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const performance = {
        messages: await storage.countMessagesByProjectAndDate(projectId, yesterday),
        content: await storage.countOutputsByProjectAndDate(projectId, yesterday),
        income: await storage.getSalesAmountByProjectAndDate(projectId, yesterday),
      };
      
      res.json(performance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get performance metrics' });
    }
  });
  
  // ElevenLabs config endpoint
  app.get('/api/elevenlabs/config', (req, res) => {
    // ElevenLabs configuration data
    res.json({
      // We don't expose the actual key here, but let the client know it's configured
      elevenLabsConfigured: process.env.ELEVENLABS_SIGNING_KEY ? true : false
    });
  });

  return httpServer;
}
