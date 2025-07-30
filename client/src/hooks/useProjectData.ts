import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getProject, 
  getFeaturesByProject, 
  getMilestonesByFeature, 
  getGoalsByMilestone,
  getTasksByProject,
  completeFeature,
  completeGoal
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Feature, Milestone, Goal } from "@shared/schema";

interface FeatureWithChildren extends Feature {
  milestones: (Milestone & {
    goals: Goal[];
  })[];
}

interface ProjectDataResult {
  project: any;
  features: FeatureWithChildren[];
  tasks: any[];
  isLoading: boolean;
  featureCompletionPercentage: number;
  markFeatureComplete: (featureId: number) => Promise<void>;
  markGoalComplete: (goalId: number) => Promise<void>;
  expandedFeatures: number[];
  expandedMilestones: number[];
  toggleFeatureExpand: (featureId: number) => void;
  toggleMilestoneExpand: (milestoneId: number) => void;
}

export function useProjectData(projectId: number | null): ProjectDataResult {
  const [expandedFeatures, setExpandedFeatures] = useState<number[]>([]);
  const [expandedMilestones, setExpandedMilestones] = useState<number[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: project = null, isLoading: isProjectLoading } = useQuery({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId,
  });

  const { data: features = [], isLoading: isFeaturesLoading } = useQuery<Feature[]>({
    queryKey: ['/api/projects', projectId, 'features'],
    enabled: !!projectId,
  });

  // Get all milestones for all features
  const featureIds = features.map(f => f.id);
  const { data: milestones = [], isLoading: isMilestonesLoading } = useQuery<Milestone[]>({
    queryKey: ['/api/features', featureIds, 'milestones'],
    enabled: featureIds.length > 0,
  });

  const milestonesMap: Record<number, Milestone[]> = {};
  if (milestones) {
    milestones.forEach(milestone => {
      if (milestone.featureId != null) {
        if (!milestonesMap[milestone.featureId]) {
          milestonesMap[milestone.featureId] = [];
        }
        milestonesMap[milestone.featureId].push(milestone);
    }
  });
  }

  const milestoneIds = milestones ? milestones.map(m => m.id) : [];
  const { data: goals = [], isLoading: isGoalsLoading } = useQuery<Goal[]>({
    queryKey: ['/api/milestones', milestoneIds, 'goals'],
    enabled: milestoneIds.length > 0,
  });

  // Get tasks for the project
  const { data: tasks = [], isLoading: isTasksLoading } = useQuery<any[]>({
    queryKey: ['/api/projects', projectId, 'tasks'],
    enabled: !!projectId,
  });

  const goalsMap: Record<number, Goal[]> = {};
  if (goals) {
    goals.forEach(goal => {
      if (goal.milestoneId != null) {
        if (!goalsMap[goal.milestoneId]) {
          goalsMap[goal.milestoneId] = [];
        }
        goalsMap[goal.milestoneId].push(goal);
    }
  });
  }

  // Mutations
  const { mutateAsync: markFeatureCompleteMutation } = useMutation({
    mutationFn: completeFeature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'features'] });
      toast({
        title: "Feature completed",
        description: "The feature has been marked as complete.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to complete feature",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const { mutateAsync: markGoalCompleteMutation } = useMutation({
    mutationFn: completeGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', milestoneIds, 'goals'] });
      toast({
        title: "Goal completed",
        description: "The goal has been marked as complete.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to complete goal",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // WebSocket updates
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = () => {};

    return () => unsubscribe();
  }, [projectId, queryClient]);

  // Feature tree handler functions
  const toggleFeatureExpand = useCallback((featureId: number) => {
    setExpandedFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  }, []);

  const toggleMilestoneExpand = useCallback((milestoneId: number) => {
    setExpandedMilestones(prev =>
      prev.includes(milestoneId)
        ? prev.filter(id => id !== milestoneId)
        : [...prev, milestoneId]
    );
  }, []);

  // Mutation handler functions
  const markFeatureComplete = useCallback(async (featureId: number) => {
    await markFeatureCompleteMutation(featureId);
  }, [markFeatureCompleteMutation]);

  const markGoalComplete = useCallback(async (goalId: number) => {
    await markGoalCompleteMutation(goalId);
  }, [markGoalCompleteMutation]);

  // Build the feature tree with milestones and goals
  const featuresWithChildren: FeatureWithChildren[] = features.map((feature: Feature) => {
    const featureMilestones = milestonesMap[feature.id] || [];
    return {
      ...feature,
      milestones: featureMilestones.map((milestone: Milestone) => ({
        ...milestone,
        goals: goalsMap[milestone.id] || [],
      })),
    };
  });

  // Calculate feature completion percentage
  const completedFeatures = features.filter((f: Feature) => f.completed).length;
  const featureCompletionPercentage = features.length > 0 
    ? Math.round((completedFeatures / features.length) * 100) 
    : 0;

  const isLoading = isProjectLoading || isFeaturesLoading || isMilestonesLoading || isGoalsLoading || isTasksLoading;

  return {
    project,
    features: featuresWithChildren,
    tasks,
    isLoading,
    featureCompletionPercentage,
    markFeatureComplete,
    markGoalComplete,
    expandedFeatures,
    expandedMilestones,
    toggleFeatureExpand,
    toggleMilestoneExpand,
  };
}
