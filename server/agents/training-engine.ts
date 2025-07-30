import { performanceMemoryStorage } from '../storage/performanceMemory';
import { addTask } from '../../data/queue';
import { OpenRouter } from '../../services/openrouter';

const openRouter = new OpenRouter();

export interface ITrainingEngine {
  scanForLowPerformingSkills(): Promise<void>;
  createRetrainingGoals(lowPerformingSkills: any[]): Promise<void>;
  generateTrainingGoal(skillTag: string, failReasons: string[]): Promise<any>;
}

export class TrainingEngine implements ITrainingEngine {
  private agentId = 'training-engine';

  async scanForLowPerformingSkills(): Promise<void> {
    try {
      console.log('🔍 Training engine scanning for low-performing skills...');
      
      // Get all agents (for now, just the autonomous project agent)
      const agents = ['autonomous-project-agent'];
      
      for (const agentId of agents) {
        const lowPerformingSkills = await performanceMemoryStorage.getLowPerformingSkills(agentId, 70);
        
        if (lowPerformingSkills.length > 0) {
          console.log(`📉 Found ${lowPerformingSkills.length} low-performing skills for agent: ${agentId}`);
          await this.createRetrainingGoals(lowPerformingSkills);
        } else {
          console.log(`✅ All skills performing well for agent: ${agentId}`);
        }
      }
    } catch (error) {
      console.error('❌ Error scanning for low-performing skills:', error);
    }
  }

  async createRetrainingGoals(lowPerformingSkills: any[]): Promise<void> {
    try {
      console.log(`🎯 Creating retraining goals for ${lowPerformingSkills.length} skills`);
      
      for (const skill of lowPerformingSkills) {
        const trainingGoal = await this.generateTrainingGoal(skill.skillTag, skill.recentFails);
        
        if (trainingGoal) {
          // Add training task to queue
          await addTask({
            type: 'agent_training',
            projectId: 'training-project', // Dedicated training project
            priority: 2, // Higher priority than regular tasks
            metadata: {
              agentId: skill.agentId || 'autonomous-project-agent',
              skillTag: skill.skillTag,
              trainingGoal: trainingGoal,
              targetAccuracy: 85, // Target 85% accuracy
              currentAccuracy: skill.accuracy
            }
          });
          
          console.log(`✅ Created training goal for skill: ${skill.skillTag}`);
        }
      }
    } catch (error) {
      console.error('❌ Error creating retraining goals:', error);
    }
  }

  async generateTrainingGoal(skillTag: string, failReasons: string[]): Promise<any> {
    try {
      const aiResponse = await openRouter.chat({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a training goal generator for AI agents. Create a specific, actionable training goal to improve the agent's performance in a given skill area. The goal should be concrete, measurable, and focused on the specific weaknesses identified.`
          },
          {
            role: 'user',
            content: `Generate a training goal for skill: "${skillTag}". Recent failure reasons: ${failReasons.join(', ')}. Create a goal that addresses these specific weaknesses.`
          }
        ],
        max_tokens: 500
      });

      const responseContent = aiResponse.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from AI');
      }

      return {
        title: `Retrain ${skillTag} skill`,
        description: responseContent,
        skillTag,
        failReasons,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error generating training goal:', error);
      return null;
    }
  }

  // Weekly training schedule
  async startWeeklyTraining(): Promise<void> {
    console.log('📅 Starting weekly training schedule');
    
    // Run training scan
    await this.scanForLowPerformingSkills();
    
    // Schedule next training in 7 days
    setTimeout(() => {
      this.startWeeklyTraining();
    }, 7 * 24 * 60 * 60 * 1000); // 7 days
  }
}

export const trainingEngine = new TrainingEngine(); 