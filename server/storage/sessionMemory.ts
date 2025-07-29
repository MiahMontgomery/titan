import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { sessionMemories } from '@shared/schema';
import type { SessionMemory, InsertSessionMemory } from '@shared/schema';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface ISessionMemoryStorage {
  saveSession(session: InsertSessionMemory): Promise<SessionMemory>;
  getLastSession(agentId: string): Promise<SessionMemory | undefined>;
  getSessionsByAgent(agentId: string): Promise<SessionMemory[]>;
  deleteSession(id: string): Promise<void>;
  deleteOldSessions(agentId: string, maxSessions: number): Promise<void>;
}

export class SessionMemoryStorage implements ISessionMemoryStorage {
  async saveSession(sessionData: InsertSessionMemory): Promise<SessionMemory> {
    try {
      const [newSession] = await db.insert(sessionMemories).values(sessionData).returning();
      
      // Maintain max 5 sessions per agent (FIFO)
      await this.deleteOldSessions(sessionData.agentId, 5);
      
      console.log(`🧠 Saved session for agent: ${sessionData.agentId}`);
      return newSession;
    } catch (error) {
      console.error('❌ Error saving session:', error);
      throw error;
    }
  }

  async getLastSession(agentId: string): Promise<SessionMemory | undefined> {
    try {
      const results = await db
        .select()
        .from(sessionMemories)
        .where(eq(sessionMemories.agentId, agentId))
        .orderBy(desc(sessionMemories.timestamp))
        .limit(1);
      
      return results[0];
    } catch (error) {
      console.error('❌ Error getting last session:', error);
      throw error;
    }
  }

  async getSessionsByAgent(agentId: string): Promise<SessionMemory[]> {
    try {
      const results = await db
        .select()
        .from(sessionMemories)
        .where(eq(sessionMemories.agentId, agentId))
        .orderBy(desc(sessionMemories.timestamp));
      
      return results;
    } catch (error) {
      console.error('❌ Error getting sessions by agent:', error);
      throw error;
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      await db.delete(sessionMemories).where(eq(sessionMemories.id, id));
      console.log(`🗑️ Deleted session: ${id}`);
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      throw error;
    }
  }

  async deleteOldSessions(agentId: string, maxSessions: number): Promise<void> {
    try {
      // Get total count for this agent
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(sessionMemories)
        .where(eq(sessionMemories.agentId, agentId));
      
      const currentCount = countResult[0]?.count || 0;
      
      if (currentCount > maxSessions) {
        // Get IDs of oldest sessions to delete
        const oldSessions = await db
          .select({ id: sessionMemories.id })
          .from(sessionMemories)
          .where(eq(sessionMemories.agentId, agentId))
          .orderBy(sessionMemories.timestamp)
          .limit(currentCount - maxSessions);
        
        const idsToDelete = oldSessions.map(session => session.id);
        
        if (idsToDelete.length > 0) {
          await db.delete(sessionMemories).where(sql`${sessionMemories.id} = ANY(${idsToDelete})`);
          console.log(`🗑️ Deleted ${idsToDelete.length} old sessions for agent: ${agentId}`);
        }
      }
    } catch (error) {
      console.error('❌ Error deleting old sessions:', error);
      throw error;
    }
  }
}

export const sessionMemoryStorage = new SessionMemoryStorage(); 