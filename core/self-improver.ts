import { OpenRouter } from '../services/openrouter';
import { loadMemory, saveMemory } from './memory';
import { logAction } from './logger';
import { projectPlanner } from './planner';
import { researchEngine } from './researcher';

const openRouter = new OpenRouter();

export interface PerformanceMetric {
  id: string;
  projectId: string;
  metric: string;
  value: number;
  target: number;
  unit: string;
  timestamp: Date;
  context: any;
}

export interface FailureAnalysis {
  id: string;
  projectId: string;
  taskId: string;
  error: string;
  context: any;
  impact: 'low' | 'medium' | 'high';
  frequency: number;
  rootCause: string;
  solution: string;
  timestamp: Date;
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  targetMetric: string;
  currentValue: number;
  targetValue: number;
  actions: string[];
  status: 'proposed' | 'implemented' | 'testing' | 'active' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningPattern {
  id: string;
  pattern: string;
  context: string;
  successRate: number;
  failureRate: number;
  recommendations: string[];
  lastUsed: Date;
  usageCount: number;
}

export class SelfImprover {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private failures: Map<string, FailureAnalysis[]> = new Map();
  private strategies: Map<string, OptimizationStrategy> = new Map();
  private patterns: Map<string, LearningPattern> = new Map();

  async recordMetric(
    projectId: string,
    metric: string,
    value: number,
    target: number,
    unit: string,
    context: any = {}
  ): Promise<void> {
    const performanceMetric: PerformanceMetric = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      metric,
      value,
      target,
      unit,
      timestamp: new Date(),
      context
    };

    if (!this.metrics.has(projectId)) {
      this.metrics.set(projectId, []);
    }
    this.metrics.get(projectId)!.push(performanceMetric);

    await this.saveMetrics(projectId);
    
    await logAction('metric_recorded', {
      projectId,
      metric,
      value,
      target
    });

    // Trigger optimization if metric is below target
    if (value < target) {
      await this.analyzePerformanceGap(projectId, metric, value, target);
    }
  }

  async recordFailure(
    projectId: string,
    taskId: string,
    error: string,
    context: any = {}
  ): Promise<void> {
    const failureAnalysis: FailureAnalysis = {
      id: `failure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      taskId,
      error,
      context,
      impact: 'medium',
      frequency: 1,
      rootCause: '',
      solution: '',
      timestamp: new Date()
    };

    // Analyze the failure
    const analysis = await this.analyzeFailure(failureAnalysis);
    failureAnalysis.rootCause = analysis.rootCause;
    failureAnalysis.solution = analysis.solution;
    failureAnalysis.impact = analysis.impact;

    if (!this.failures.has(projectId)) {
      this.failures.set(projectId, []);
    }
    this.failures.get(projectId)!.push(failureAnalysis);

    await this.saveFailures(projectId);
    
    await logAction('failure_recorded', {
      projectId,
      taskId,
      error: error.substring(0, 100)
    });

    // Check for patterns and create optimization strategies
    await this.detectFailurePatterns(projectId);
  }

  private async analyzeFailure(failure: FailureAnalysis): Promise<{
    rootCause: string;
    solution: string;
    impact: 'low' | 'medium' | 'high';
  }> {
    const prompt = `
      Analyze this failure and provide:
      
      Error: ${failure.error}
      Context: ${JSON.stringify(failure.context, null, 2)}
      
      1. Root cause analysis
      2. Proposed solution
      3. Impact assessment (low/medium/high)
      
      Return as JSON:
      {
        "rootCause": "Detailed root cause",
        "solution": "Proposed solution",
        "impact": "low|medium|high"
      }
    `;

    const response = await openRouter.chat({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a failure analysis expert. Analyze failures and provide actionable solutions.'
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
        rootCause: 'Unknown root cause',
        solution: 'Manual investigation required',
        impact: 'medium'
      };
    }
  }

  private async analyzePerformanceGap(
    projectId: string,
    metric: string,
    currentValue: number,
    targetValue: number
  ): Promise<void> {
    const gap = targetValue - currentValue;
    const gapPercentage = (gap / targetValue) * 100;

    if (gapPercentage > 20) { // Significant gap
      const strategy = await this.createOptimizationStrategy(
        projectId,
        metric,
        currentValue,
        targetValue
      );

      await logAction('optimization_strategy_created', {
        projectId,
        strategyId: strategy.id,
        metric,
        gapPercentage
      });
    }
  }

  private async createOptimizationStrategy(
    projectId: string,
    metric: string,
    currentValue: number,
    targetValue: number
  ): Promise<OptimizationStrategy> {
    const prompt = `
      Create an optimization strategy for this performance gap:
      
      Project ID: ${projectId}
      Metric: ${metric}
      Current Value: ${currentValue}
      Target Value: ${targetValue}
      
      Provide:
      1. Strategy name and description
      2. Specific actions to improve performance
      3. Expected timeline and milestones
      
      Return as JSON:
      {
        "name": "Strategy name",
        "description": "Strategy description",
        "actions": ["action1", "action2", "action3"],
        "timeline": "Expected timeline"
      }
    `;

    const response = await openRouter.chat({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a performance optimization expert. Create actionable strategies to improve metrics.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    try {
      const content = response.choices[0]?.message?.content || '';
      const strategyData = JSON.parse(content);

      const strategy: OptimizationStrategy = {
        id: `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: strategyData.name,
        description: strategyData.description,
        targetMetric: metric,
        currentValue,
        targetValue,
        actions: strategyData.actions,
        status: 'proposed',
        projectId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.strategies.set(strategy.id, strategy);
      await this.saveStrategies();

      return strategy;
    } catch (error) {
      throw new Error(`Failed to create optimization strategy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async detectFailurePatterns(projectId: string): Promise<void> {
    const projectFailures = this.failures.get(projectId) || [];
    
    if (projectFailures.length < 3) return; // Need more data

    // Group failures by error type
    const errorGroups = new Map<string, FailureAnalysis[]>();
    for (const failure of projectFailures) {
      const errorType = this.categorizeError(failure.error);
      if (!errorGroups.has(errorType)) {
        errorGroups.set(errorType, []);
      }
      errorGroups.get(errorType)!.push(failure);
    }

    // Check for frequent patterns
    for (const [errorType, failures] of errorGroups) {
      if (failures.length >= 2) { // Pattern detected
        const pattern: LearningPattern = {
          id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pattern: errorType,
          context: `Project: ${projectId}`,
          successRate: 0,
          failureRate: failures.length / projectFailures.length,
          recommendations: await this.generatePatternRecommendations(errorType, failures),
          lastUsed: new Date(),
          usageCount: failures.length
        };

        this.patterns.set(pattern.id, pattern);
        await this.savePatterns();

        await logAction('failure_pattern_detected', {
          projectId,
          pattern: errorType,
          frequency: failures.length
        });
      }
    }
  }

  private categorizeError(error: string): string {
    // Simple error categorization
    if (error.includes('timeout')) return 'timeout_error';
    if (error.includes('network')) return 'network_error';
    if (error.includes('authentication')) return 'auth_error';
    if (error.includes('permission')) return 'permission_error';
    if (error.includes('not found')) return 'not_found_error';
    if (error.includes('validation')) return 'validation_error';
    return 'general_error';
  }

  private async generatePatternRecommendations(
    errorType: string,
    failures: FailureAnalysis[]
  ): Promise<string[]> {
    const prompt = `
      Generate recommendations to prevent this type of error:
      
      Error Type: ${errorType}
      Number of Occurrences: ${failures.length}
      Recent Errors: ${failures.slice(-3).map(f => f.error).join(', ')}
      
      Provide 3-5 specific recommendations to prevent this error pattern.
      
      Return as JSON array:
      ["recommendation1", "recommendation2", "recommendation3"]
    `;

    const response = await openRouter.chat({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an error prevention expert. Provide actionable recommendations.'
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
      return ['Implement better error handling', 'Add retry mechanisms', 'Improve logging'];
    }
  }

  async getPerformanceReport(projectId: string): Promise<{
    metrics: PerformanceMetric[];
    trends: Array<{ metric: string; trend: 'improving' | 'declining' | 'stable' }>;
    recommendations: string[];
  }> {
    const projectMetrics = this.metrics.get(projectId) || [];
    const projectFailures = this.failures.get(projectId) || [];

    // Analyze trends
    const trends = await this.analyzeTrends(projectMetrics);
    
    // Generate recommendations
    const recommendations = await this.generateRecommendations(projectMetrics, projectFailures);

    return {
      metrics: projectMetrics,
      trends,
      recommendations
    };
  }

  private async analyzeTrends(metrics: PerformanceMetric[]): Promise<Array<{ metric: string; trend: 'improving' | 'declining' | 'stable' }>> {
    const trends: Array<{ metric: string; trend: 'improving' | 'declining' | 'stable' }> = [];
    
    // Group metrics by type
    const metricGroups = new Map<string, PerformanceMetric[]>();
    for (const metric of metrics) {
      if (!metricGroups.has(metric.metric)) {
        metricGroups.set(metric.metric, []);
      }
      metricGroups.get(metric.metric)!.push(metric);
    }

    // Analyze each metric type
    for (const [metricName, metricData] of metricGroups) {
      if (metricData.length < 2) continue;

      // Sort by timestamp
      const sortedMetrics = metricData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Calculate trend
      const recent = sortedMetrics.slice(-3);
      const older = sortedMetrics.slice(-6, -3);
      
      if (recent.length === 0 || older.length === 0) {
        trends.push({ metric: metricName, trend: 'stable' });
        continue;
      }

      const recentAvg = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
      const olderAvg = older.reduce((sum, m) => sum + m.value, 0) / older.length;
      
      const change = ((recentAvg - olderAvg) / olderAvg) * 100;
      
      let trend: 'improving' | 'declining' | 'stable';
      if (change > 5) trend = 'improving';
      else if (change < -5) trend = 'declining';
      else trend = 'stable';
      
      trends.push({ metric: metricName, trend });
    }

    return trends;
  }

  private async generateRecommendations(
    metrics: PerformanceMetric[],
    failures: FailureAnalysis[]
  ): Promise<string[]> {
    const prompt = `
      Generate performance improvement recommendations based on:
      
      Metrics: ${JSON.stringify(metrics.slice(-10), null, 2)}
      Recent Failures: ${JSON.stringify(failures.slice(-5), null, 2)}
      
      Provide 3-5 actionable recommendations to improve overall performance.
      
      Return as JSON array:
      ["recommendation1", "recommendation2", "recommendation3"]
    `;

    const response = await openRouter.chat({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a performance optimization expert. Provide actionable recommendations.'
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
      return [
        'Implement comprehensive error handling',
        'Add performance monitoring and alerting',
        'Optimize resource allocation',
        'Implement retry mechanisms for transient failures'
      ];
    }
  }

  async implementOptimization(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error(`Strategy not found: ${strategyId}`);

    strategy.status = 'implemented';
    strategy.updatedAt = new Date();

    // Execute optimization actions
    for (const action of strategy.actions) {
      await this.executeOptimizationAction(action, strategy.projectId || 'default-project');
    }

    await this.saveStrategies();
    
    await logAction('optimization_implemented', {
      strategyId,
      actionCount: strategy.actions.length
    });
  }

  private async executeOptimizationAction(action: string, projectId: string): Promise<void> {
    // This would integrate with the actual system to implement optimizations
    // For now, just log the action
    await logAction('optimization_action_executed', {
      projectId,
      action
    });
  }

  private async saveMetrics(projectId: string): Promise<void> {
    const memory = await loadMemory();
    memory[`metrics_${projectId}`] = this.metrics.get(projectId) || [];
    await saveMemory(memory);
  }

  private async saveFailures(projectId: string): Promise<void> {
    const memory = await loadMemory();
    memory[`failures_${projectId}`] = this.failures.get(projectId) || [];
    await saveMemory(memory);
  }

  private async saveStrategies(): Promise<void> {
    const memory = await loadMemory();
    (memory as any).strategies = Array.from(this.strategies.values());
    await saveMemory(memory);
  }

  private async savePatterns(): Promise<void> {
    const memory = await loadMemory();
    (memory as any).patterns = Array.from(this.patterns.values());
    await saveMemory(memory);
  }
}

export const selfImprover = new SelfImprover(); 