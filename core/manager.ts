import { loadSecrets, saveSecrets } from './secrets';
import { loadMemory, saveMemory, type MemoryState } from './memory';
import { logAction } from './logger';
import { broadcastUpdate } from './websocket';

interface Agent {
  id: string;
  type: 'project' | 'persona';
  name: string;
  status: 'idle' | 'active' | 'paused';
  lastActive: string;
  memory: any;
  secrets: any;
}

class AgentManager {
  private agents: Map<string, Agent> = new Map();

  // Create new agent (project or persona)
  async createAgent(
    id: string,
    type: 'project' | 'persona',
    name: string
  ): Promise<Agent> {
    const agent: Agent = {
      id,
      type,
      name,
      status: 'idle',
      lastActive: new Date().toISOString(),
      memory: {},
      secrets: {}
    };

    // Initialize agent-specific memory and secrets
    const currentMemory = await loadMemory();
    currentMemory.agents[id] = { memory: agent.memory, lastUpdate: new Date().toISOString() };
    await saveMemory(currentMemory);
    await saveSecrets(id, agent.secrets, type);

    this.agents.set(id, agent);
    await this.broadcastAgentUpdate(agent);
    
    return agent;
  }

  // Get agent by ID
  async getAgent(id: string): Promise<Agent | null> {
    if (this.agents.has(id)) {
      return this.agents.get(id)!;
    }
    return null;
  }

  // Update agent status
  async updateAgentStatus(
    id: string,
    status: 'idle' | 'active' | 'paused'
  ): Promise<void> {
    const agent = await this.getAgent(id);
    if (agent) {
      agent.status = status;
      agent.lastActive = new Date().toISOString();
      this.agents.set(id, agent);
      await this.broadcastAgentUpdate(agent);
    }
  }

  // Load agent memory
  async loadAgentMemory(id: string): Promise<any> {
    const memory = await loadMemory();
    return memory.agents[id]?.memory || {};
  }

  // Save agent memory
  async saveAgentMemory(id: string, data: any): Promise<void> {
    const memory = await loadMemory();
    if (!memory.agents[id]) {
      memory.agents[id] = { memory: {}, lastUpdate: new Date().toISOString() };
    }
    memory.agents[id].memory = data;
    memory.agents[id].lastUpdate = new Date().toISOString();
    await saveMemory(memory);
  }

  // Load agent secrets
  async loadAgentSecrets(id: string, type: 'project' | 'persona'): Promise<any> {
    return await loadSecrets(id, type);
  }

  // Save agent secrets
  async saveAgentSecrets(
    id: string,
    type: 'project' | 'persona',
    secrets: any
  ): Promise<void> {
    await saveSecrets(id, secrets, type);
  }

  // Log agent action
  async logAgentAction(
    id: string,
    action: string,
    data: any
  ): Promise<void> {
    const agent = await this.getAgent(id);
    if (agent) {
      await logAction(action, {
        projectId: agent.type === 'project' ? id : undefined,
        personaId: agent.type === 'persona' ? id : undefined,
        result: data
      });
    }
  }

  // Broadcast agent update
  private async broadcastAgentUpdate(agent: Agent): Promise<void> {
    await broadcastUpdate({
      type: 'agent_update',
      data: {
        id: agent.id,
        type: agent.type,
        name: agent.name,
        status: agent.status,
        lastActive: agent.lastActive
      }
    });
  }
}

// Export singleton instance
export const agentManager = new AgentManager(); 