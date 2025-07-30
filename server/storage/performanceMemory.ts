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
      const lastUsed = attempts[0]?.timestamp || new Date().toISOString();
      const lastFailReason = attempts.find(a => !a.success)?.failReason;
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
}

export const performanceMemoryStorage = new PerformanceMemoryStorage(); 