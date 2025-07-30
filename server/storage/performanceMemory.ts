import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and, desc, sql } from 'drizzle-orm';
import { performanceMemories } from '@shared/schema';
import type { PerformanceMemory, InsertPerformanceMemory } from '@shared/schema';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface ISkillStats {
  skillTag: string;
  totalAttempts: number;
  successfulAttempts: number;
  accuracy: number;
  lastUsed: string;
  lastFailReason?: string;
  recentFails: string[];
}

export interface IPerformanceMemoryStorage {
  recordAttempt(attempt: InsertPerformanceMemory): Promise<PerformanceMemory>;
  getStatsBySkill(agentId: string, skillTag: string): Promise<ISkillStats>;
  getRecentFails(agentId: string, skillTag: string, limit?: number): Promise<PerformanceMemory[]>;
  summarizePerformance(agentId: string): Promise<ISkillStats[]>;
  getLowPerformingSkills(agentId: string, threshold?: number): Promise<ISkillStats[]>;
  getAgentMemorySummary(agentId: string): Promise<string>;
  generateBehaviorInstructions(agentId: string, goalTitle: string): Promise<string>;
}

export class PerformanceMemoryStorage implements IPerformanceMemoryStorage {
  async recordAttempt(attemptData: InsertPerformanceMemory): Promise<PerformanceMemory> {
    try {
      const [newAttempt] = await db.insert(performanceMemories).values(attemptData).returning();
      
      console.log(`📊 Recorded performance attempt for agent: ${attemptData.agentId}, skill: ${attemptData.skillTag}, success: ${attemptData.success}`);
      return newAttempt;
    } catch (error) {
      console.error('❌ Error recording performance attempt:', error);
      throw error;
    }
  }

  async getStatsBySkill(agentId: string, skillTag: string): Promise<ISkillStats> {
    try {
      const attempts = await db
        .select()
        .from(performanceMemories)
        .where(and(
          eq(performanceMemories.agentId, agentId),
          eq(performanceMemories.skillTag, skillTag)
        ))
        .orderBy(desc(performanceMemories.timestamp));

      const totalAttempts = attempts.length;
      const successfulAttempts = attempts.filter(a => a.success).length;
      const accuracy = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;
      const lastUsed = attempts[0]?.timestamp?.toISOString() || new Date().toISOString();
      const lastFailReason = attempts.find(a => !a.success)?.failReason || undefined;
      const recentFails = attempts
        .filter(a => !a.success)
        .slice(0, 5)
        .map(a => a.failReason || 'Unknown error');

      return {
        skillTag,
        totalAttempts,
        successfulAttempts,
        accuracy,
        lastUsed,
        lastFailReason,
        recentFails
      };
    } catch (error) {
      console.error('❌ Error getting skill stats:', error);
      throw error;
    }
  }

  async getRecentFails(agentId: string, skillTag: string, limit: number = 10): Promise<PerformanceMemory[]> {
    try {
      const fails = await db
        .select()
        .from(performanceMemories)
        .where(and(
          eq(performanceMemories.agentId, agentId),
          eq(performanceMemories.skillTag, skillTag),
          eq(performanceMemories.success, false)
        ))
        .orderBy(desc(performanceMemories.timestamp))
        .limit(limit);
      
      return fails;
    } catch (error) {
      console.error('❌ Error getting recent fails:', error);
      throw error;
    }
  }

  async summarizePerformance(agentId: string): Promise<ISkillStats[]> {
    try {
      // Get all unique skill tags for this agent
      const skillTags = await db
        .selectDistinct({ skillTag: performanceMemories.skillTag })
        .from(performanceMemories)
        .where(eq(performanceMemories.agentId, agentId));

      const stats: ISkillStats[] = [];
      
      for (const { skillTag } of skillTags) {
        if (skillTag) {
          const skillStats = await this.getStatsBySkill(agentId, skillTag);
          stats.push(skillStats);
        }
      }

      // Sort by accuracy (lowest first)
      return stats.sort((a, b) => a.accuracy - b.accuracy);
    } catch (error) {
      console.error('❌ Error summarizing performance:', error);
      throw error;
    }
  }

  async getLowPerformingSkills(agentId: string, threshold: number = 70): Promise<ISkillStats[]> {
    try {
      const allStats = await this.summarizePerformance(agentId);
      return allStats.filter(stats => stats.accuracy < threshold);
    } catch (error) {
      console.error('❌ Error getting low performing skills:', error);
      throw error;
    }
  }

  async getAgentMemorySummary(agentId: string): Promise<string> {
    try {
      const allStats = await this.summarizePerformance(agentId);
      
      if (allStats.length === 0) {
        return '';
      }

      // Sort by most recent usage (assuming timestamp is available)
      const sortedStats = allStats.sort((a, b) => 
        new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      );

      // Get top 3 most-used skills
      const topSkills = sortedStats.slice(0, 3);
      
      // Get underperforming skills (<70% accuracy)
      const underperformingSkills = allStats.filter(stats => stats.accuracy < 70);
      
      // Get most recent failure reason
      const recentFailure = allStats
        .filter(stats => stats.lastFailReason)
        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())[0];

      let memoryString = 'PerformanceMemory: ';
      
      // Add top skills
      const skillStrings = topSkills.map(skill => 
        `Skill[${skill.skillTag}]: ${skill.accuracy.toFixed(0)}% (${skill.successfulAttempts}/${skill.totalAttempts})`
      );
      memoryString += skillStrings.join('; ');
      
      // Add underperforming skills with retraining recommendation
      if (underperformingSkills.length > 0) {
        const underperformingStrings = underperformingSkills.map(skill =>
          `Skill[${skill.skillTag}]: ${skill.accuracy.toFixed(0)}% (${skill.successfulAttempts}/${skill.totalAttempts}) — retraining recommended`
        );
        memoryString += '; ' + underperformingStrings.join('; ');
      }
      
      // Add last failure reason
      if (recentFailure?.lastFailReason) {
        memoryString += `; Last Failure: ${recentFailure.lastFailReason}`;
      }

      // Limit to 1000 characters
      if (memoryString.length > 1000) {
        memoryString = memoryString.substring(0, 997) + '...';
      }

      return memoryString;
    } catch (error) {
      console.error('❌ Error getting agent memory summary:', error);
      return '';
    }
  }

  async generateBehaviorInstructions(agentId: string, goalTitle: string): Promise<string> {
    try {
      const allStats = await this.summarizePerformance(agentId);
      
      if (allStats.length === 0) {
        return 'If skill match uncertain, default to safe verbose mode.';
      }

      // Infer skill tags from goal title
      const goalText = goalTitle.toLowerCase();
      const relevantSkills: string[] = [];
      
      if (goalText.includes('code') || goalText.includes('generate') || goalText.includes('implement')) {
        relevantSkills.push('code-generation');
      }
      if (goalText.includes('test') || goalText.includes('validate')) {
        relevantSkills.push('testing');
      }
      if (goalText.includes('deploy') || goalText.includes('build')) {
        relevantSkills.push('deployment');
      }
      if (goalText.includes('parse') || goalText.includes('diff')) {
        relevantSkills.push('diff-parsing');
      }
      if (goalText.includes('queue') || goalText.includes('route')) {
        relevantSkills.push('queue-routing');
      }
      if (goalText.includes('schema') || goalText.includes('validate')) {
        relevantSkills.push('schema-validation');
      }

      // If no specific skills matched, use top 3 most-used skills
      if (relevantSkills.length === 0) {
        relevantSkills.push(...allStats.slice(0, 3).map(skill => skill.skillTag));
      }

      const instructions: string[] = [];
      let instructionCount = 0;

      for (const skillTag of relevantSkills) {
        if (instructionCount >= 3) break; // Limit to 3 instructions

        const skillStats = allStats.find(stats => stats.skillTag === skillTag);
        if (!skillStats) continue;

        if (skillStats.accuracy < 70) {
          // Underperforming skill - add cautious instruction
          instructions.push(`If task involves Skill[${skillTag}], be cautious with implementation and provide verbose explanations with fallback examples.`);
          instructionCount++;
        } else if (skillStats.accuracy > 90) {
          // High-performing skill - allow concise responses
          instructions.push(`If using Skill[${skillTag}] (${skillStats.accuracy.toFixed(0)}% accuracy), use compact code patterns and concise explanations.`);
          instructionCount++;
        } else {
          // Moderate performance - balanced approach
          instructions.push(`If using Skill[${skillTag}] (${skillStats.accuracy.toFixed(0)}% accuracy), provide clear explanations with moderate detail.`);
          instructionCount++;
        }
      }

      // Add fallback instruction if no specific instructions were generated
      if (instructions.length === 0) {
        instructions.push('If skill match uncertain, default to safe verbose mode.');
      }

      return instructions.join('\n');
    } catch (error) {
      console.error('❌ Error generating behavior instructions:', error);
      return 'If skill match uncertain, default to safe verbose mode.';
    }
  }
}

export const performanceMemoryStorage = new PerformanceMemoryStorage(); 