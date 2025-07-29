import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { checkpoints } from '@shared/schema';
import type { Checkpoint, InsertCheckpoint } from '@shared/schema';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface ICheckpointStorage {
  createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint>;
  getCheckpointsByProject(projectId: string): Promise<Checkpoint[]>;
  getCheckpointsByGoal(goalId: string): Promise<Checkpoint[]>;
  getCheckpoint(id: string): Promise<Checkpoint | undefined>;
  deleteCheckpoint(id: string): Promise<void>;
  deleteOldCheckpoints(projectId: string, maxCheckpoints: number): Promise<void>;
}

export class CheckpointStorage implements ICheckpointStorage {
  async createCheckpoint(checkpointData: InsertCheckpoint): Promise<Checkpoint> {
    try {
      const [newCheckpoint] = await db.insert(checkpoints).values(checkpointData).returning();
      
      // Maintain max 20 checkpoints per project (FIFO)
      await this.deleteOldCheckpoints(checkpointData.projectId, 20);
      
      console.log(`✅ Created checkpoint for goal: ${checkpointData.goalId}`);
      return newCheckpoint;
    } catch (error) {
      console.error('❌ Error creating checkpoint:', error);
      throw error;
    }
  }

  async getCheckpointsByProject(projectId: string): Promise<Checkpoint[]> {
    try {
      const results = await db
        .select()
        .from(checkpoints)
        .where(eq(checkpoints.projectId, projectId))
        .orderBy(desc(checkpoints.timestamp));
      
      return results;
    } catch (error) {
      console.error('❌ Error getting checkpoints by project:', error);
      throw error;
    }
  }

  async getCheckpointsByGoal(goalId: string): Promise<Checkpoint[]> {
    try {
      const results = await db
        .select()
        .from(checkpoints)
        .where(eq(checkpoints.goalId, goalId))
        .orderBy(desc(checkpoints.timestamp));
      
      return results;
    } catch (error) {
      console.error('❌ Error getting checkpoints by goal:', error);
      throw error;
    }
  }

  async getCheckpoint(id: string): Promise<Checkpoint | undefined> {
    try {
      const results = await db
        .select()
        .from(checkpoints)
        .where(eq(checkpoints.id, id))
        .limit(1);
      
      return results[0];
    } catch (error) {
      console.error('❌ Error getting checkpoint:', error);
      throw error;
    }
  }

  async deleteCheckpoint(id: string): Promise<void> {
    try {
      await db.delete(checkpoints).where(eq(checkpoints.id, id));
      console.log(`🗑️ Deleted checkpoint: ${id}`);
    } catch (error) {
      console.error('❌ Error deleting checkpoint:', error);
      throw error;
    }
  }

  async deleteOldCheckpoints(projectId: string, maxCheckpoints: number): Promise<void> {
    try {
      // Get total count for this project
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(checkpoints)
        .where(eq(checkpoints.projectId, projectId));
      
      const currentCount = countResult[0]?.count || 0;
      
      if (currentCount > maxCheckpoints) {
        // Get IDs of oldest checkpoints to delete
        const oldCheckpoints = await db
          .select({ id: checkpoints.id })
          .from(checkpoints)
          .where(eq(checkpoints.projectId, projectId))
          .orderBy(checkpoints.timestamp)
          .limit(currentCount - maxCheckpoints);
        
        const idsToDelete = oldCheckpoints.map(cp => cp.id);
        
        if (idsToDelete.length > 0) {
          await db.delete(checkpoints).where(sql`${checkpoints.id} = ANY(${idsToDelete})`);
          console.log(`🗑️ Deleted ${idsToDelete.length} old checkpoints for project: ${projectId}`);
        }
      }
    } catch (error) {
      console.error('❌ Error deleting old checkpoints:', error);
      throw error;
    }
  }
}

export const checkpointStorage = new CheckpointStorage(); 