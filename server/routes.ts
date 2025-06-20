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
  insertSaleSchema,
  insertPersonaSchema,
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

      // 4. Return the created project with its features
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
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
  
  // Delete project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const projectId = parseInt(id, 10);

      if (isNaN(projectId)) {
        return res.status(400).json({ error: "Invalid project ID" });
      }

      // Delete the project
      await storage.deleteProject(projectId);

      res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
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
  
  app.get('/api/features', async (req, res) => {
    try {
      const projectId = parseInt(req.query.projectId as string);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }
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

  // Task routes
  app.post('/api/tasks', async (req, res) => {
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
  app.post('/api/personas', async (req, res) => {
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

  app.get('/api/personas', async (_req, res) => {
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

  app.get('/api/personas/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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

  app.put('/api/personas/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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

  app.delete('/api/personas/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePersona(id);
      res.json({ message: 'Persona deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete persona' });
    }
  });

  // Test credentials for a specific platform
  app.post('/api/personas/:id/test-credentials', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
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
  app.post('/api/personas/:id/test-all-credentials', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const persona = await storage.getPersona(id);
      if (!persona) {
        return res.status(404).json({ error: 'Persona not found' });
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

  return httpServer;
}
