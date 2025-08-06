import { OpenRouter } from '../services/openrouter';
import { loadMemory, saveMemory } from './memory';
import { logAction } from './logger';
import { agentManager } from './manager';
import { projectPlanner } from './planner';
import { researchEngine } from './researcher';
import { selfImprover } from './self-improver';

const openRouter = new OpenRouter();

export interface CollaborationTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignedPersonas: string[];
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  deadline?: Date;
}

export interface ResourceAllocation {
  id: string;
  projectId: string;
  personaId: string;
  resourceType: 'time' | 'compute' | 'api_calls' | 'memory';
  allocated: number;
  used: number;
  available: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  startTime: Date;
  endTime?: Date;
}

export interface ConflictResolution {
  id: string;
  projectId: string;
  conflictType: 'resource' | 'priority' | 'dependency' | 'timeline';
  description: string;
  involvedPersonas: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolution: string;
  status: 'open' | 'resolved' | 'escalated';
  createdAt: Date;
  resolvedAt?: Date;
}

export class Coordinator {
  private collaborations: Map<string, CollaborationTask[]> = new Map();
  private allocations: Map<string, ResourceAllocation[]> = new Map();
  private conflicts: Map<string, ConflictResolution[]> = new Map();

  async createCollaboration(
    projectId: string,
    title: string,
    description: string,
    requiredPersonas: string[],
    deadline?: Date
  ): Promise<CollaborationTask> {
    // Analyze task requirements and assign optimal personas
    const assignedPersonas = await this.optimizePersonaAssignment(
      projectId,
      requiredPersonas,
      description
    );

    const collaboration: CollaborationTask = {
      id: `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      title,
      description,
      assignedPersonas,
      dependencies: [],
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deadline
    };

    if (!this.collaborations.has(projectId)) {
      this.collaborations.set(projectId, []);
    }
    this.collaborations.get(projectId)!.push(collaboration);

    // Allocate resources for assigned personas
    await this.allocateResources(projectId, assignedPersonas, collaboration.id);

    await this.saveCollaborations(projectId);
    
    await logAction('collaboration_created', {
      projectId,
      collaborationId: collaboration.id,
      personaCount: assignedPersonas.length
    });

    return collaboration;
  }

  private async optimizePersonaAssignment(
    projectId: string,
    requiredPersonas: string[],
    taskDescription: string
  ): Promise<string[]> {
    const prompt = `
      Optimize persona assignment for this task:
      
      Task Description: ${taskDescription}
      Required Personas: ${requiredPersonas.join(', ')}
      
      Consider:
      1. Persona expertise and skills
      2. Current workload and availability
      3. Collaboration compatibility
      4. Resource efficiency
      
      Return the optimal persona assignment as JSON array:
      ["persona1", "persona2", "persona3"]
    `;

    const response = await openRouter.chat({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a resource optimization expert. Assign personas optimally for maximum efficiency.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    try {
      const content = response.choices[0]?.message?.content || '';
      return JSON.parse(content);
    } catch (error) {
      return requiredPersonas; // Fallback to original requirements
    }
  }

  private async allocateResources(
    projectId: string,
    personaIds: string[],
    collaborationId: string
  ): Promise<void> {
    const allocations: ResourceAllocation[] = [];

    for (const personaId of personaIds) {
      // Allocate time resources
      allocations.push({
        id: `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectId,
        personaId,
        resourceType: 'time',
        allocated: 8, // 8 hours per day
        used: 0,
        available: 8,
        priority: 'medium',
        startTime: new Date()
      });

      // Allocate API calls
      allocations.push({
        id: `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectId,
        personaId,
        resourceType: 'api_calls',
        allocated: 1000,
        used: 0,
        available: 1000,
        priority: 'medium',
        startTime: new Date()
      });
    }

    if (!this.allocations.has(projectId)) {
      this.allocations.set(projectId, []);
    }
    this.allocations.get(projectId)!.push(...allocations);

    await this.saveAllocations(projectId);
  }

  async updateCollaborationProgress(
    projectId: string,
    collaborationId: string,
    progress: number,
    personaId: string
  ): Promise<void> {
    const projectCollaborations = this.collaborations.get(projectId);
    if (!projectCollaborations) return;

    const collaboration = projectCollaborations.find(c => c.id === collaborationId);
    if (!collaboration) return;

    collaboration.progress = Math.min(100, Math.max(0, progress));
    collaboration.updatedAt = new Date();

    if (collaboration.progress >= 100) {
      collaboration.status = 'completed';
    } else if (collaboration.progress > 0) {
      collaboration.status = 'in_progress';
    }

    await this.saveCollaborations(projectId);
    
    await logAction('collaboration_progress_updated', {
      projectId,
      collaborationId,
      progress,
      personaId
    });

    // Check for conflicts or bottlenecks
    await this.detectConflicts(projectId);
  }

  async detectConflicts(projectId: string): Promise<ConflictResolution[]> {
    const conflicts: ConflictResolution[] = [];
    const projectCollaborations = this.collaborations.get(projectId) || [];
    const projectAllocations = this.allocations.get(projectId) || [];

    // Check for resource conflicts
    const resourceConflicts = await this.detectResourceConflicts(projectAllocations);
    conflicts.push(...resourceConflicts);

    // Check for dependency conflicts
    const dependencyConflicts = await this.detectDependencyConflicts(projectCollaborations);
    conflicts.push(...dependencyConflicts);

    // Check for timeline conflicts
    const timelineConflicts = await this.detectTimelineConflicts(projectCollaborations);
    conflicts.push(...timelineConflicts);

    if (conflicts.length > 0) {
      if (!this.conflicts.has(projectId)) {
        this.conflicts.set(projectId, []);
      }
      this.conflicts.get(projectId)!.push(...conflicts);
      await this.saveConflicts(projectId);
    }

    return conflicts;
  }

  private async detectResourceConflicts(allocations: ResourceAllocation[]): Promise<ConflictResolution[]> {
    const conflicts: ConflictResolution[] = [];
    
    // Group by persona and resource type
    const personaResources = new Map<string, Map<string, ResourceAllocation[]>>();
    
    for (const allocation of allocations) {
      if (!personaResources.has(allocation.personaId)) {
        personaResources.set(allocation.personaId, new Map());
      }
      if (!personaResources.get(allocation.personaId)!.has(allocation.resourceType)) {
        personaResources.get(allocation.personaId)!.set(allocation.resourceType, []);
      }
      personaResources.get(allocation.personaId)!.get(allocation.resourceType)!.push(allocation);
    }

    // Check for over-allocation
    for (const [personaId, resourceMap] of personaResources) {
      for (const [resourceType, resourceAllocations] of resourceMap) {
        const totalAllocated = resourceAllocations.reduce((sum, a) => sum + a.allocated, 0);
        const totalUsed = resourceAllocations.reduce((sum, a) => sum + a.used, 0);
        
        if (totalUsed > totalAllocated * 0.9) { // 90% threshold
          conflicts.push({
            id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            projectId: resourceAllocations[0].projectId,
            conflictType: 'resource',
            description: `Persona ${personaId} is over-allocated for ${resourceType}`,
            involvedPersonas: [personaId],
            severity: 'high',
            resolution: 'Reallocate resources or reduce workload',
            status: 'open',
            createdAt: new Date()
          });
        }
      }
    }

    return conflicts;
  }

  private async detectDependencyConflicts(collaborations: CollaborationTask[]): Promise<ConflictResolution[]> {
    const conflicts: ConflictResolution[] = [];
    
    // Check for circular dependencies
    const dependencyGraph = new Map<string, string[]>();
    for (const collab of collaborations) {
      dependencyGraph.set(collab.id, collab.dependencies);
    }

    // Simple circular dependency detection
    for (const [collabId, dependencies] of dependencyGraph) {
      for (const depId of dependencies) {
        const depDependencies = dependencyGraph.get(depId) || [];
        if (depDependencies.includes(collabId)) {
          conflicts.push({
            id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            projectId: collaborations.find(c => c.id === collabId)?.projectId || '',
            conflictType: 'dependency',
            description: `Circular dependency detected between ${collabId} and ${depId}`,
            involvedPersonas: [],
            severity: 'critical',
            resolution: 'Break circular dependency by restructuring tasks',
            status: 'open',
            createdAt: new Date()
          });
        }
      }
    }

    return conflicts;
  }

  private async detectTimelineConflicts(collaborations: CollaborationTask[]): Promise<ConflictResolution[]> {
    const conflicts: ConflictResolution[] = [];
    
    // Check for deadline conflicts
    const tasksWithDeadlines = collaborations.filter(c => c.deadline);
    
    for (const task of tasksWithDeadlines) {
      if (!task.deadline) continue;
      
      const now = new Date();
      const timeRemaining = task.deadline.getTime() - now.getTime();
      const daysRemaining = timeRemaining / (1000 * 60 * 60 * 24);
      
      if (daysRemaining < 1 && task.progress < 80) {
        conflicts.push({
          id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          projectId: task.projectId,
          conflictType: 'timeline',
          description: `Task "${task.title}" is behind schedule`,
          involvedPersonas: task.assignedPersonas,
          severity: 'high',
          resolution: 'Increase resources or extend deadline',
          status: 'open',
          createdAt: new Date()
        });
      }
    }

    return conflicts;
  }

  async resolveConflict(
    projectId: string,
    conflictId: string,
    resolution: string
  ): Promise<void> {
    const projectConflicts = this.conflicts.get(projectId);
    if (!projectConflicts) return;

    const conflict = projectConflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    conflict.resolution = resolution;
    conflict.status = 'resolved';
    conflict.resolvedAt = new Date();

    await this.saveConflicts(projectId);
    
    await logAction('conflict_resolved', {
      projectId,
      conflictId,
      resolution
    });

    // Implement the resolution
    await this.implementConflictResolution(conflict);
  }

  private async implementConflictResolution(conflict: ConflictResolution): Promise<void> {
    switch (conflict.conflictType) {
      case 'resource':
        await this.reallocateResources(conflict);
        break;
      case 'dependency':
        await this.restructureDependencies(conflict);
        break;
      case 'timeline':
        await this.adjustTimeline(conflict);
        break;
      default:
        break;
    }
  }

  private async reallocateResources(conflict: ConflictResolution): Promise<void> {
    // Implement resource reallocation logic
    await logAction('resources_reallocated', {
      projectId: conflict.projectId,
      conflictId: conflict.id
    });
  }

  private async restructureDependencies(conflict: ConflictResolution): Promise<void> {
    // Implement dependency restructuring logic
    await logAction('dependencies_restructured', {
      projectId: conflict.projectId,
      conflictId: conflict.id
    });
  }

  private async adjustTimeline(conflict: ConflictResolution): Promise<void> {
    // Implement timeline adjustment logic
    await logAction('timeline_adjusted', {
      projectId: conflict.projectId,
      conflictId: conflict.id
    });
  }

  async getCollaborationStatus(projectId: string): Promise<{
    collaborations: CollaborationTask[];
    resourceUtilization: number;
    conflictCount: number;
    efficiency: number;
  }> {
    const collaborations = this.collaborations.get(projectId) || [];
    const allocations = this.allocations.get(projectId) || [];
    const conflicts = this.conflicts.get(projectId) || [];

    // Calculate resource utilization
    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocated, 0);
    const totalUsed = allocations.reduce((sum, a) => sum + a.used, 0);
    const resourceUtilization = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;

    // Calculate efficiency (completed tasks vs total tasks)
    const completedTasks = collaborations.filter(c => c.status === 'completed').length;
    const totalTasks = collaborations.length;
    const efficiency = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      collaborations,
      resourceUtilization,
      conflictCount: conflicts.filter(c => c.status === 'open').length,
      efficiency
    };
  }

  async optimizeWorkflow(projectId: string): Promise<{
    recommendations: string[];
    optimizations: string[];
  }> {
    const status = await this.getCollaborationStatus(projectId);
    
    const prompt = `
      Analyze this collaboration status and provide optimization recommendations:
      
      Resource Utilization: ${status.resourceUtilization}%
      Conflict Count: ${status.conflictCount}
      Efficiency: ${status.efficiency}%
      Collaboration Count: ${status.collaborations.length}
      
      Provide:
      1. Specific recommendations to improve efficiency
      2. Workflow optimizations to implement
      
      Return as JSON:
      {
        "recommendations": ["rec1", "rec2", "rec3"],
        "optimizations": ["opt1", "opt2", "opt3"]
      }
    `;

    const response = await openRouter.chat({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a workflow optimization expert. Provide actionable recommendations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    try {
      const content = response.choices[0]?.message?.content || '';
      return JSON.parse(content);
    } catch (error) {
      return {
        recommendations: ['Implement better resource allocation', 'Reduce task dependencies'],
        optimizations: ['Automate routine tasks', 'Improve communication protocols']
      };
    }
  }

  private async saveCollaborations(projectId: string): Promise<void> {
    const memory = await loadMemory();
    memory[`collaborations_${projectId}`] = this.collaborations.get(projectId) || [];
    await saveMemory(memory);
  }

  private async saveAllocations(projectId: string): Promise<void> {
    const memory = await loadMemory();
    memory[`allocations_${projectId}`] = this.allocations.get(projectId) || [];
    await saveMemory(memory);
  }

  private async saveConflicts(projectId: string): Promise<void> {
    const memory = await loadMemory();
    memory[`conflicts_${projectId}`] = this.conflicts.get(projectId) || [];
    await saveMemory(memory);
  }
}

export const coordinator = new Coordinator(); 