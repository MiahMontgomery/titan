import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { WebSocketServer } from "ws";
import argon2 from 'argon2';
import { z } from "zod";
import { 
  insertProjectSchema, 
  insertFeatureSchema, 
  insertMilestoneSchema,
  insertGoalSchema,
  insertMessageSchema,
  insertLogSchema,
  insertOutputSchema,
  insertSaleSchema,
  insertPersonaSchema,
  insertUserSchema,
  type Feature as DBFeature,
  type Milestone as DBMilestone,
  type Goal as DBGoal,
  type Persona
} from "@shared/schema";
import dotenv from "dotenv";
dotenv.config();
import { OpenRouter } from '../services/openrouter';
import { addTask } from '../data/queue';
import { credentialsService } from './credentials';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import express from 'express';
import { enhancedBrain } from '../core/brain';
import { projectPlanner } from '../core/planner';
import { researchEngine } from '../core/researcher';
import { selfImprover } from '../core/self-improver';
import { coordinator } from '../core/coordinator';
import { agentManager } from '../core/manager';
import { checkpointStorage } from './storage/checkpoints';
import { sessionMemoryStorage } from './storage/sessionMemory';
import { performanceMemoryStorage } from './storage/performanceMemory';
import { trainingEngine } from './agents/training-engine';
import { generateInitialTasks } from './ai/openrouter';
import taskRoutes from './routes/tasks';

interface Goal {
  title: string;
  order: number;
  name?: string;
}

interface Milestone {
  title: string;
  order: number;
  goals: Goal[];
  name?: string;
}

interface Feature {
  title: string;
  description: string;
  order: number;
  milestones: Milestone[];
  name?: string;
}

interface ProjectPlan {
  features: Feature[];
}

const openRouter = new OpenRouter();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Utility to wrap async route handlers and forward errors
function catchAsync(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

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
  
  // --- Auth Endpoints ---
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, email, password } = insertUserSchema.parse(req.body);
      // Check if user/email already exists
      const existing = await storage.getUserByUsername(username);
      if (existing) return res.status(409).json({ error: 'Username already taken' });
      // Hash password
      const hashedPassword = await argon2.hash(password);
      // Store user
      const user = await storage.createUser({ username, email, password: hashedPassword });
      res.status(201).json({ id: user.id, username: user.username, email: user.email });
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const valid = await argon2.verify(user.password, password);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
      // Issue JWT
      const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ accessToken, refreshToken });
    } catch (error: unknown) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.sendStatus(401);
    jwt.verify(refreshToken, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      const accessToken = jwt.sign({ userId: user.userId }, JWT_SECRET, { expiresIn: '15m' });
      res.json({ accessToken });
    });
  });

  // --- JWT Auth Middleware ---
  function authenticateJWT(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.sendStatus(401);
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  }

  // --- Example Protected Route ---
  app.get('/api/protected', authenticateJWT, (req, res) => {
    res.json({ message: 'You are authenticated!', user: req.user });
  });
  
  // Project routes
  app.post('/api/projects/create', authenticateJWT, async (req, res) => {
    try {
      const { name, prompt, userId } = req.body;
      console.log("Creating project with name:", name, "prompt:", prompt, "userId:", userId);
      if (!name || !prompt || !userId) {
        return res.status(400).json({ error: 'Missing name, prompt, or userId' });
      }

      // 1. Generate features/milestones/goals using AI
      const aiResponse = await openRouter.chat({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: `You are an expert project manager AI. Respond ONLY with valid JSON in the following format, and do not include any commentary or explanation:\n\n{\n  "features": [\n    {\n      "title": "string",\n      "description": "string",\n      "order": 0,\n      "milestones": [\n        {\n          "title": "string",\n          "order": 0,\n          "goals": [\n            {\n              "title": "string",\n              "order": 0\n            }\n          ]\n        }\n      ]\n    }\n  ]\n}\n\nAll milestones must be nested inside their respective features, and all goals must be nested inside their respective milestones. Use the exact field names: title, description, order, milestones, goals.` },
          { role: 'user', content: `Break down this project into features, milestones, and goals: ${prompt}` }
        ],
        max_tokens: 1000
      });
      console.log("AI raw response:", aiResponse.choices[0]?.message?.content);
      let plan;
      try {
        plan = JSON.parse(aiResponse.choices[0]?.message?.content || '{}') as ProjectPlan;
        // Fallback: map 'name' to 'title' and ensure structure
        if (plan.features) {
          plan.features = plan.features.map((feature: Feature, fIdx: number) => {
            feature.title = feature.title || feature.name || `Feature ${fIdx+1}`;
            feature.order = typeof feature.order === 'number' ? feature.order : fIdx;
            feature.milestones = (feature.milestones || []).map((milestone: Milestone, mIdx: number) => {
              milestone.title = milestone.title || milestone.name || `Milestone ${mIdx+1}`;
              milestone.order = typeof milestone.order === 'number' ? milestone.order : mIdx;
              milestone.goals = (milestone.goals || []).map((goal: Goal, gIdx: number) => {
                goal.title = goal.title || goal.name || `Goal ${gIdx+1}`;
                goal.order = typeof goal.order === 'number' ? goal.order : gIdx;
                return goal;
              }).filter(goal => goal.title);
              return milestone;
            }).filter(milestone => milestone.title);
            return feature;
          }).filter(feature => feature.title);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({ error: 'AI did not return valid JSON', raw: aiResponse.choices[0]?.message?.content, details: errorMessage });
      }

      // 2. Create the project
      const projectData = insertProjectSchema.parse({ name, prompt, userId });
      const project = await storage.createProject(projectData);

      // 3. Create features, milestones, and goals
      for (const feature of plan.features || []) {
        const featureData = insertFeatureSchema.parse({
          title: feature.title,
          description: feature.description,
          projectId: project.id,
          order: feature.order || 0
        });
        const createdFeature = await storage.createFeature(featureData);

        for (const milestone of feature.milestones || []) {
          const milestoneData = insertMilestoneSchema.parse({
            title: milestone.title,
            featureId: createdFeature.id,
            order: milestone.order || 0
          });
          const createdMilestone = await storage.createMilestone(milestoneData);

          for (const goal of milestone.goals || []) {
            const goalData = insertGoalSchema.parse({
              title: goal.title,
              milestoneId: createdMilestone.id,
              order: goal.order || 0
            });
            await storage.createGoal(goalData);
          }
        }
      }

      // 4. Generate initial tasks using AI
      try {
        const taskSuggestions = await generateInitialTasks(prompt);
        
        // Save generated tasks to database
        for (const taskSuggestion of taskSuggestions) {
          await storage.createTask({
            projectId: project.id,
            title: taskSuggestion.title,
            description: taskSuggestion.description,
            status: taskSuggestion.status
          });
        }
        
        console.log(`✅ Generated ${taskSuggestions.length} initial tasks for project: ${project.id}`);
      } catch (taskError) {
        console.error('❌ Error generating initial tasks:', taskError);
        // Continue with project creation even if task generation fails
      }

      // 5. Return the created project with its features
      const features = await storage.getFeaturesByProject(project.id);
      const projectWithFeatures = {
        ...project,
        features: await Promise.all(features.map(async (feature: DBFeature) => {
          const milestones = await storage.getMilestonesByFeature(feature.id);
          return {
            ...feature,
            milestones: await Promise.all(milestones.map(async (milestone: DBMilestone) => {
              const goals = await storage.getGoalsByMilestone(milestone.id);
              return {
                ...milestone,
                goals
              };
            }))
          };
        }))
      };

      res.status(201).json(projectWithFeatures);
      
      // Start autonomous execution after project creation
      try {
        const { autonomousProjectAgent } = await import('./agents/autonomous-project');
        // Pass the broadcast function to the agent
        autonomousProjectAgent.setBroadcastFunction(broadcast);
        autonomousProjectAgent.startAutonomousExecution(project.id);
        console.log(`🚀 Started autonomous execution for project: ${project.id}`);
      } catch (error) {
        console.error('❌ Error starting autonomous execution:', error);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });
  
  app.get('/api/projects', authenticateJWT, async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get projects' });
    }
  });
  
  app.get('/api/projects/:id', authenticateJWT, async (req, res) => {
    try {
      const id = req.params.id;
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get project' });
    }
  });
  
  // Delete project
  app.delete("/api/projects/:id", authenticateJWT, catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    await storage.deleteProject(id);
    res.status(200).json({ message: "Project deleted successfully" });
  }));
  
  // Feature routes
  app.post('/api/features/create', authenticateJWT, async (req, res) => {
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
  
  app.get('/api/projects/:id/features', authenticateJWT, async (req, res) => {
    try {
      const projectId = req.params.id;
      const features = await storage.getFeaturesByProject(projectId);
      res.json(features);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get features' });
    }
  });
  
  app.get('/api/features', authenticateJWT, catchAsync(async (req: Request, res: Response) => {
    const projectId = req.query.projectId as string;
    if (!projectId) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }
    const features = await storage.getFeaturesByProject(projectId);
    res.json(features);
  }));
  
  app.put('/api/features/:id/complete', authenticateJWT, async (req, res) => {
    try {
      const id = req.params.id;
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
  app.post('/api/milestones/create', authenticateJWT, async (req, res) => {
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
  
  app.get('/api/features/:id/milestones', authenticateJWT, async (req, res) => {
    try {
      const featureId = req.params.id;
      const milestones = await storage.getMilestonesByFeature(featureId);
      res.json(milestones);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get milestones' });
    }
  });
  
  // Goal routes
  app.post('/api/goals/create', authenticateJWT, async (req, res) => {
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
  
  app.get('/api/milestones/:id/goals', authenticateJWT, async (req, res) => {
    try {
      const milestoneId = req.params.id;
      const goals = await storage.getGoalsByMilestone(milestoneId);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get goals' });
    }
  });
  
  app.put('/api/goals/:id/complete', authenticateJWT, async (req, res) => {
    try {
      const id = req.params.id;
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
  app.post('/api/messages/create', authenticateJWT, async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage({
        ...messageData,
        metadata: messageData.metadata as Record<string, any> | undefined
      });
      
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
  
  app.get('/api/projects/:id/messages', authenticateJWT, async (req, res) => {
    try {
      const projectId = req.params.id;
      const messages = await storage.getMessagesByProject(projectId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });
  
  // Log routes
  app.post('/api/logs/create', authenticateJWT, async (req, res) => {
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
  
  app.get('/api/projects/:id/logs', authenticateJWT, async (req, res) => {
    try {
      const projectId = req.params.id;
      const logs = await storage.getLogsByProject(projectId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get logs' });
    }
  });
  
  // Output routes
  app.post('/api/outputs/create', authenticateJWT, async (req, res) => {
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
  
  app.get('/api/projects/:id/outputs', authenticateJWT, async (req, res) => {
    try {
      const projectId = req.params.id;
      const outputs = await storage.getOutputsByProject(projectId);
      res.json(outputs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get outputs' });
    }
  });
  
  app.put('/api/outputs/:id/approve', authenticateJWT, async (req, res) => {
    try {
      const id = req.params.id;
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
  
  app.put('/api/outputs/:id/reject', authenticateJWT, async (req, res) => {
    try {
      const id = req.params.id;
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
  app.post('/api/sales/create', authenticateJWT, async (req, res) => {
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
  
  app.get('/api/projects/:id/sales', authenticateJWT, async (req, res) => {
    try {
      const projectId = req.params.id;
      const sales = await storage.getSalesByProject(projectId);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get sales' });
    }
  });
  
  app.get('/api/projects/:id/performance', authenticateJWT, async (req, res) => {
    try {
      const projectId = req.params.id;
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

  // Task routes
  app.post('/api/tasks', authenticateJWT, async (req, res) => {
    try {
      const { type, projectId, url, priority, metadata } = req.body;
      if (!type || !projectId) {
        return res.status(400).json({ error: 'Missing required fields: type, projectId' });
      }
      const newTask = await addTask({
        type,
        projectId,
        url,
        priority,
        metadata
      });
      res.status(201).json(newTask);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add task' });
    }
  });

  // Persona routes with enhanced credential management
  app.post('/api/personas', authenticateJWT, async (req, res) => {
    try {
      const personaData = insertPersonaSchema.parse(req.body);
      
      // Encrypt credentials if provided
      const encryptedData = {
        ...personaData,
        credentials: personaData.credentials ? credentialsService.encryptCredentials(personaData.credentials) : null
      };
      
      const persona = await storage.createPersona(encryptedData);
      res.status(201).json(persona);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create persona' });
      }
    }
  });

  app.get('/api/personas', authenticateJWT, async (_req, res) => {
    try {
      const personas = await storage.getPersonas();
      // Decrypt credentials for each persona
      const decryptedPersonas = personas.map((persona: Persona) => ({
        ...persona,
        credentials: persona.credentials ? 
          (typeof persona.credentials === 'string' ? 
            credentialsService.decryptCredentials(persona.credentials) : 
            persona.credentials) : {}
      }));
      res.json(decryptedPersonas);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get personas' });
    }
  });

  app.get('/api/personas/:id', authenticateJWT, async (req, res) => {
    try {
      const id = req.params.id;
      const persona = await storage.getPersona(id);
      if (!persona) {
        return res.status(404).json({ error: 'Persona not found' });
      }
      
      // Decrypt credentials
      const decryptedPersona = {
        ...persona,
        credentials: persona.credentials ? 
          (typeof persona.credentials === 'string' ? 
            credentialsService.decryptCredentials(persona.credentials) : 
            persona.credentials) : {}
      };
      
      res.json(decryptedPersona);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get persona' });
    }
  });

  app.put('/api/personas/:id', authenticateJWT, async (req, res) => {
    try {
      const id = req.params.id;
      const personaData = insertPersonaSchema.parse(req.body);
      
      // Get existing persona to ensure we have required fields
      const existingPersona = await storage.getPersona(id);
      if (!existingPersona) {
        return res.status(404).json({ error: 'Persona not found' });
      }
      
      // Encrypt credentials if provided, otherwise keep existing
      const encryptedData = {
        ...personaData,
        name: personaData.name || existingPersona.name, // Ensure name is always provided
        credentials: personaData.credentials ? credentialsService.encryptCredentials(personaData.credentials) : existingPersona.credentials
      };
      
      const persona = await storage.updatePersona(id, encryptedData);
      if (!persona) {
        return res.status(404).json({ error: 'Persona not found' });
      }
      
      // Decrypt credentials for response
      const decryptedPersona = {
        ...persona,
        credentials: persona.credentials ? 
          (typeof persona.credentials === 'string' ? 
            credentialsService.decryptCredentials(persona.credentials) : 
            persona.credentials) : {}
      };
      
      res.json(decryptedPersona);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update persona' });
      }
    }
  });

  app.delete('/api/personas/:id', authenticateJWT, async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deletePersona(id);
      res.json({ message: 'Persona deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete persona' });
    }
  });

  // Test credentials for a specific platform
  app.post('/api/personas/:id/test-credentials', authenticateJWT, async (req, res) => {
    try {
      const id = req.params.id;
      const { platform, credentials } = req.body;
      
      if (!platform || !credentials) {
        return res.status(400).json({ error: 'Missing platform or credentials' });
      }
      
      const persona = await storage.getPersona(id);
      if (!persona) {
        return res.status(404).json({ error: 'Persona not found' });
      }
      
      const result = await credentialsService.testCredentials(platform, credentials);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to test credentials' });
    }
  });

  // Test all credentials for a persona
  app.post('/api/personas/:id/test-all-credentials', authenticateJWT, async (req, res) => {
    try {
      const id = req.params.id;
      
      const persona = await storage.getPersona(id);
      if (!persona) {
        return res.json({ message: 'No credentials to test' });
      }
      
      if (!persona.credentials) {
        return res.json({ message: 'No credentials to test' });
      }
      
      const decryptedCredentials = typeof persona.credentials === 'string' ? 
        credentialsService.decryptCredentials(persona.credentials) : 
        persona.credentials;
      
      const results: Record<string, any> = {};
      
      // Test each platform's credentials
      for (const [platform, credentials] of Object.entries(decryptedCredentials)) {
        const result = await credentialsService.testCredentials(platform, credentials);
        results[platform] = result;
      }
      
      res.json({
        personaId: id,
        results,
        summary: {
          total: Object.keys(results).length,
          successful: Object.values(results).filter((r: any) => r.success).length,
          failed: Object.values(results).filter((r: any) => !r.success).length
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to test credentials' });
    }
  });

  // Enhanced autonomy routes
  app.post('/autonomous-projects', async (req, res) => {
    try {
      const { title, description, goals } = req.body;
      const project = await enhancedBrain.createAutonomousProject(title, description, goals);
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create autonomous project' });
    }
  });

  app.get('/autonomous-projects', async (req, res) => {
    try {
      const projects = await enhancedBrain.getAllAutonomousProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch autonomous projects' });
    }
  });

  app.get('/autonomous-projects/:id', async (req, res) => {
    try {
      const project = await enhancedBrain.getAutonomousProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'Autonomous project not found' });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch autonomous project' });
    }
  });

  // Project planning routes
  app.post('/projects/:id/plan', async (req, res) => {
    try {
      const { title, description, goals } = req.body;
      const plan = await projectPlanner.createProjectPlan(
        req.params.id,
        title,
        description,
        goals
      );
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create project plan' });
    }
  });

  app.get('/projects/:id/plan', async (req, res) => {
    try {
      const plan = await projectPlanner.loadPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: 'Project plan not found' });
      }
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch project plan' });
    }
  });

  app.get('/projects/:id/progress', async (req, res) => {
    try {
      const progress = await projectPlanner.getProjectProgress(req.params.id);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch project progress' });
    }
  });

  // Research routes
  app.post('/research', async (req, res) => {
    try {
      const { topic, scope, questions } = req.body;
      const researchTask = await researchEngine.createResearchTask(topic, scope, questions);
      res.json(researchTask);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create research task' });
    }
  });

  app.post('/research/:id/execute', async (req, res) => {
    try {
      const findings = await researchEngine.executeResearch(req.params.id);
      res.json(findings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute research' });
    }
  });

  app.get('/research/:id/summary', async (req, res) => {
    try {
      const summary = await researchEngine.getResearchSummary(req.params.id);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch research summary' });
    }
  });

  // Self-improvement routes
  app.post('/projects/:id/metrics', async (req, res) => {
    try {
      const { metric, value, target, unit, context } = req.body;
      await selfImprover.recordMetric(req.params.id, metric, value, target, unit, context);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to record metric' });
    }
  });

  app.post('/projects/:id/failures', async (req, res) => {
    try {
      const { taskId, error, context } = req.body;
      await selfImprover.recordFailure(req.params.id, taskId, error, context);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to record failure' });
    }
  });

  app.get('/projects/:id/performance', async (req, res) => {
    try {
      const report = await selfImprover.getPerformanceReport(req.params.id);
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch performance report' });
    }
  });

  // Coordination routes
  app.post('/projects/:id/collaborations', async (req, res) => {
    try {
      const { title, description, requiredPersonas, deadline } = req.body;
      const collaboration = await coordinator.createCollaboration(
        req.params.id,
        title,
        description,
        requiredPersonas,
        deadline ? new Date(deadline) : undefined
      );
      res.json(collaboration);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create collaboration' });
    }
  });

  app.put('/projects/:id/collaborations/:collabId/progress', async (req, res) => {
    try {
      const { progress, personaId } = req.body;
      await coordinator.updateCollaborationProgress(
        req.params.id,
        req.params.collabId,
        progress,
        personaId
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update collaboration progress' });
    }
  });

  app.get('/projects/:id/collaboration-status', async (req, res) => {
    try {
      const status = await coordinator.getCollaborationStatus(req.params.id);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch collaboration status' });
    }
  });

  app.get('/projects/:id/conflicts', async (req, res) => {
    try {
      const conflicts = await coordinator.detectConflicts(req.params.id);
      res.json(conflicts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to detect conflicts' });
    }
  });

  app.put('/projects/:id/conflicts/:conflictId/resolve', async (req, res) => {
    try {
      const { resolution } = req.body;
      await coordinator.resolveConflict(req.params.id, req.params.conflictId, resolution);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to resolve conflict' });
    }
  });

  app.get('/projects/:id/workflow-optimization', async (req, res) => {
    try {
      const optimization = await coordinator.optimizeWorkflow(req.params.id);
      res.json(optimization);
    } catch (error) {
      res.status(500).json({ error: 'Failed to optimize workflow' });
    }
  });

  // Agent management routes
  app.post('/agents', async (req, res) => {
    try {
      const { id, type, name } = req.body;
      const agent = await agentManager.createAgent(id, type, name);
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create agent' });
    }
  });

  app.get('/agents/:id', async (req, res) => {
    try {
      const agent = await agentManager.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch agent' });
    }
  });

  app.put('/agents/:id/status', async (req, res) => {
    try {
      const { status } = req.body;
      await agentManager.updateAgentStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update agent status' });
    }
  });

  // Task execution routes
  app.post('/tasks', async (req, res) => {
    try {
      const task = req.body;
      const result = await enhancedBrain.executeTask(task);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute task' });
    }
  });

  // Persona management routes
  app.get('/personas', async (req, res) => {
    try {
      const personas = await storage.getAllPersonas();
      res.json(personas);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch personas' });
    }
  });

  app.post('/personas', async (req, res) => {
    try {
      const persona = await storage.createPersona(req.body);
      res.json(persona);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create persona' });
    }
  });

  app.get('/personas/:id', async (req, res) => {
    try {
      const persona = await storage.getPersona(parseInt(req.params.id));
      if (!persona) {
        return res.status(404).json({ error: 'Persona not found' });
      }
      res.json(persona);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch persona' });
    }
  });

  app.put('/personas/:id', async (req, res) => {
    try {
      const persona = await storage.updatePersona(parseInt(req.params.id), req.body);
      res.json(persona);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update persona' });
    }
  });

  app.delete('/personas/:id', async (req, res) => {
    try {
      await storage.deletePersona(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete persona' });
    }
  });

  // Logs and monitoring routes
  app.get('/projects/:id/logs', async (req, res) => {
    try {
      const logs = await storage.getLogs(parseInt(req.params.id));
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  app.get('/projects/:id/messages', async (req, res) => {
    try {
      const messages = await storage.getMessages(parseInt(req.params.id));
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.get('/projects/:id/outputs', async (req, res) => {
    try {
      const outputs = await storage.getOutputs(parseInt(req.params.id));
      res.json(outputs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch outputs' });
    }
  });

  app.get('/projects/:id/sales', async (req, res) => {
    try {
      const sales = await storage.getSales(parseInt(req.params.id));
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch sales' });
    }
  });

  // Not found handler
  app.use((req, res, next) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Centralized error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ error: message });
  });

  return httpServer;
}

const router = express.Router();

// Existing routes
router.get('/projects', async (req, res) => {
  try {
    const projects = await storage.getAllProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post('/projects', async (req, res) => {
  try {
    const { name, prompt } = req.body;
    const project = await storage.createProject({ name, prompt });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const project = await storage.getProject(parseInt(req.params.id));
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Enhanced autonomy routes
router.post('/autonomous-projects', async (req, res) => {
  try {
    const { title, description, goals } = req.body;
    const project = await enhancedBrain.createAutonomousProject(title, description, goals);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create autonomous project' });
  }
});

router.get('/autonomous-projects', async (req, res) => {
  try {
    const projects = await enhancedBrain.getAllAutonomousProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch autonomous projects' });
  }
});

router.get('/autonomous-projects/:id', async (req, res) => {
  try {
    const project = await enhancedBrain.getAutonomousProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Autonomous project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch autonomous project' });
  }
});

// Project planning routes
router.post('/projects/:id/plan', async (req, res) => {
  try {
    const { title, description, goals } = req.body;
    const plan = await projectPlanner.createProjectPlan(
      req.params.id,
      title,
      description,
      goals
    );
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project plan' });
  }
});

router.get('/projects/:id/plan', async (req, res) => {
  try {
    const plan = await projectPlanner.loadPlan(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: 'Project plan not found' });
    }
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project plan' });
  }
});

router.get('/projects/:id/progress', async (req, res) => {
  try {
    const progress = await projectPlanner.getProjectProgress(req.params.id);
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project progress' });
  }
});

// Research routes
router.post('/research', async (req, res) => {
  try {
    const { topic, scope, questions } = req.body;
    const researchTask = await researchEngine.createResearchTask(topic, scope, questions);
    res.json(researchTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create research task' });
  }
});

router.post('/research/:id/execute', async (req, res) => {
  try {
    const findings = await researchEngine.executeResearch(req.params.id);
    res.json(findings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute research' });
  }
});

router.get('/research/:id/summary', async (req, res) => {
  try {
    const summary = await researchEngine.getResearchSummary(req.params.id);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch research summary' });
  }
});

// Self-improvement routes
router.post('/projects/:id/metrics', async (req, res) => {
  try {
    const { metric, value, target, unit, context } = req.body;
    await selfImprover.recordMetric(req.params.id, metric, value, target, unit, context);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record metric' });
  }
});

router.post('/projects/:id/failures', async (req, res) => {
  try {
    const { taskId, error, context } = req.body;
    await selfImprover.recordFailure(req.params.id, taskId, error, context);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record failure' });
  }
});

router.get('/projects/:id/performance', async (req, res) => {
  try {
    const report = await selfImprover.getPerformanceReport(req.params.id);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performance report' });
  }
});

// Coordination routes
router.post('/projects/:id/collaborations', async (req, res) => {
  try {
    const { title, description, requiredPersonas, deadline } = req.body;
    const collaboration = await coordinator.createCollaboration(
      req.params.id,
      title,
      description,
      requiredPersonas,
      deadline ? new Date(deadline) : undefined
    );
    res.json(collaboration);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create collaboration' });
  }
});

router.put('/projects/:id/collaborations/:collabId/progress', async (req, res) => {
  try {
    const { progress, personaId } = req.body;
    await coordinator.updateCollaborationProgress(
      req.params.id,
      req.params.collabId,
      progress,
      personaId
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update collaboration progress' });
  }
});

router.get('/projects/:id/collaboration-status', async (req, res) => {
  try {
    const status = await coordinator.getCollaborationStatus(req.params.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch collaboration status' });
  }
});

router.get('/projects/:id/conflicts', async (req, res) => {
  try {
    const conflicts = await coordinator.detectConflicts(req.params.id);
    res.json(conflicts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect conflicts' });
  }
});

router.put('/projects/:id/conflicts/:conflictId/resolve', async (req, res) => {
  try {
    const { resolution } = req.body;
    await coordinator.resolveConflict(req.params.id, req.params.conflictId, resolution);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve conflict' });
  }
});

router.get('/projects/:id/workflow-optimization', async (req, res) => {
  try {
    const optimization = await coordinator.optimizeWorkflow(req.params.id);
    res.json(optimization);
  } catch (error) {
    res.status(500).json({ error: 'Failed to optimize workflow' });
  }
});

// Agent management routes
router.post('/agents', async (req, res) => {
  try {
    const { id, type, name } = req.body;
    const agent = await agentManager.createAgent(id, type, name);
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

router.get('/agents/:id', async (req, res) => {
  try {
    const agent = await agentManager.getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

router.put('/agents/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await agentManager.updateAgentStatus(req.params.id, status);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update agent status' });
  }
});

// Task execution routes
router.post('/tasks', async (req, res) => {
  try {
    const task = req.body;
    const result = await enhancedBrain.executeTask(task);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute task' });
  }
});

// Persona management routes
router.get('/personas', async (req, res) => {
  try {
    const personas = await storage.getAllPersonas();
    res.json(personas);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch personas' });
  }
});

router.post('/personas', async (req, res) => {
  try {
    const persona = await storage.createPersona(req.body);
    res.json(persona);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create persona' });
  }
});

router.get('/personas/:id', async (req, res) => {
  try {
    const persona = await storage.getPersona(parseInt(req.params.id));
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }
    res.json(persona);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch persona' });
  }
});

router.put('/personas/:id', async (req, res) => {
  try {
    const persona = await storage.updatePersona(parseInt(req.params.id), req.body);
    res.json(persona);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update persona' });
  }
});

router.delete('/personas/:id', async (req, res) => {
  try {
    await storage.deletePersona(parseInt(req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete persona' });
  }
});

// Logs and monitoring routes
router.get('/projects/:id/logs', async (req, res) => {
  try {
    const logs = await storage.getLogs(parseInt(req.params.id));
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

router.get('/projects/:id/messages', async (req, res) => {
  try {
    const messages = await storage.getMessages(parseInt(req.params.id));
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.get('/projects/:id/outputs', async (req, res) => {
  try {
    const outputs = await storage.getOutputs(parseInt(req.params.id));
    res.json(outputs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch outputs' });
  }
});

router.get('/projects/:id/sales', async (req, res) => {
  try {
    const sales = await storage.getSales(parseInt(req.params.id));
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Checkpoint routes
router.get('/projects/:id/checkpoints', async (req, res) => {
  try {
    const projectId = req.params.id;
    const checkpoints = await checkpointStorage.getCheckpointsByProject(projectId);
    res.json(checkpoints);
  } catch (error) {
    console.error('Error fetching checkpoints:', error);
    res.status(500).json({ error: 'Failed to fetch checkpoints' });
  }
});

// Get checkpoint diff
router.get('/checkpoints/:id/diff', async (req, res) => {
  try {
    const checkpointId = req.params.id;
    
    // Validate checkpoint ID
    if (!checkpointId || isNaN(parseInt(checkpointId))) {
      return res.status(400).json({ error: 'Invalid checkpoint ID' });
    }

    const checkpoint = await checkpointStorage.getCheckpoint(checkpointId);
    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    // Broadcast preview requested event
    broadcast({
      type: 'checkpoint_preview_requested',
      checkpointId,
      projectId: checkpoint.projectId,
      goalId: checkpoint.goalId
    });

    res.json({
      codeDiff: checkpoint.codeDiff,
      summary: checkpoint.summary,
      timestamp: checkpoint.timestamp
    });
    
  } catch (error) {
    console.error('Error fetching checkpoint diff:', error);
    res.status(500).json({ error: 'Failed to fetch checkpoint diff' });
  }
});

// Rollback endpoint
router.post('/rollback', async (req, res) => {
  try {
    const { checkpointId, projectId } = req.body;
    
    if (!checkpointId || !projectId) {
      return res.status(400).json({ error: 'Missing checkpointId or projectId' });
    }

    // Get the checkpoint
    const checkpoint = await checkpointStorage.getCheckpoint(checkpointId);
    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    // Verify the checkpoint belongs to the project
    if (checkpoint.projectId !== projectId) {
      return res.status(403).json({ error: 'Checkpoint does not belong to this project' });
    }

    // Update the output with the rolled back code
    await storage.createOutput({
      projectId,
      type: 'code',
      content: JSON.stringify({
        code: checkpoint.codeDiff,
        language: 'rolled-back',
        filename: 'rolled-back-code',
        description: `Rolled back to checkpoint: ${checkpoint.summary}`,
        goalId: checkpoint.goalId,
        goalTitle: `Goal ${checkpoint.goalId.slice(-8)}`
      })
    });

    // Broadcast rollback event
    broadcast({
      type: 'rollback_completed',
      projectId,
      goalId: checkpoint.goalId,
      checkpointId,
      summary: checkpoint.summary
    });

    console.log(`✅ Rolled back to checkpoint: ${checkpointId}`);
    res.json({ success: true, checkpoint });
    
  } catch (error) {
    console.error('Error during rollback:', error);
    res.status(500).json({ error: 'Failed to rollback checkpoint' });
  }
});

// Session Memory routes
router.get('/agents/:id/session', async (req, res) => {
  try {
    const agentId = req.params.id;
    const session = await sessionMemoryStorage.getLastSession(agentId);
    
    if (!session) {
      return res.status(404).json({ error: 'No session found for agent' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error fetching agent session:', error);
    res.status(500).json({ error: 'Failed to fetch agent session' });
  }
});

router.post('/agents/:id/session/resume', async (req, res) => {
  try {
    const agentId = req.params.id;
    const session = await sessionMemoryStorage.getLastSession(agentId);
    
    if (!session) {
      return res.status(404).json({ error: 'No session found for agent' });
    }

    // Broadcast resume event
    broadcast({
      type: 'agent_session_resumed',
      projectId: session.projectId?.toString(),
      agentId,
      session,
      message: `Manually resumed session for agent: ${agentId}`
    });

    res.json({ success: true, session });
  } catch (error) {
    console.error('Error resuming agent session:', error);
    res.status(500).json({ error: 'Failed to resume agent session' });
  }
});

// Performance Memory routes
router.get('/agents/:id/performance', async (req, res) => {
  try {
    const agentId = req.params.id;
    const performanceStats = await performanceMemoryStorage.summarizePerformance(agentId);
    res.json(performanceStats);
  } catch (error) {
    console.error('Error fetching agent performance:', error);
    res.status(500).json({ error: 'Failed to fetch agent performance' });
  }
});

router.get('/agents/:id/performance/:skillTag', async (req, res) => {
  try {
    const { id: agentId, skillTag } = req.params;
    const skillStats = await performanceMemoryStorage.getStatsBySkill(agentId, skillTag);
    res.json(skillStats);
  } catch (error) {
    console.error('Error fetching skill performance:', error);
    res.status(500).json({ error: 'Failed to fetch skill performance' });
  }
});

router.post('/agents/:id/retrain/:skillTag', async (req, res) => {
  try {
    const { id: agentId, skillTag } = req.params;
    
    // Get current skill stats
    const skillStats = await performanceMemoryStorage.getStatsBySkill(agentId, skillTag);
    
    if (skillStats.totalAttempts === 0) {
      return res.status(404).json({ error: 'No performance data for this skill' });
    }

    // Generate training goal
    const trainingGoal = await trainingEngine.generateTrainingGoal(skillTag, skillStats.recentFails);
    
    if (!trainingGoal) {
      return res.status(500).json({ error: 'Failed to generate training goal' });
    }

    // Add training task to queue
    await addTask({
      type: 'agent_training',
      projectId: 'training-project',
      priority: 2,
      metadata: {
        agentId,
        skillTag,
        trainingGoal,
        targetAccuracy: 85,
        currentAccuracy: skillStats.accuracy
      }
    });

    // Broadcast training event
    broadcast({
      type: 'agent_training_triggered',
      agentId,
      skillTag,
      currentAccuracy: skillStats.accuracy,
      targetAccuracy: 85
    });

    res.json({ 
      success: true, 
      trainingGoal,
      currentAccuracy: skillStats.accuracy,
      targetAccuracy: 85
    });
    
  } catch (error) {
    console.error('Error triggering retraining:', error);
    res.status(500).json({ error: 'Failed to trigger retraining' });
  }
});

// Task routes
router.get('/projects/:id/tasks', async (req, res) => {
  try {
    const projectId = req.params.id;
    const tasks = await storage.getTasksByProject(projectId);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Mount task execution routes
router.use('/tasks', taskRoutes);

// Training engine routes
router.post('/training/scan', async (req, res) => {
  try {
    await trainingEngine.scanForLowPerformingSkills();
    res.json({ success: true, message: 'Training scan completed' });
  } catch (error) {
    console.error('Error running training scan:', error);
    res.status(500).json({ error: 'Failed to run training scan' });
  }
});

export default router;
