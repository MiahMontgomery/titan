import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getProject, 
  getFeaturesByProject, 
  getMilestonesByFeature, 
  getGoalsByMilestone,
  completeFeature,
  completeGoal
} from "@/lib/api";
import { onFeatureUpdated } from "@/lib/websocket";
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

  const { data: features = [], isLoading: isFeaturesLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'features'],
    enabled: !!projectId,
  });

  // Get all milestones for all features
  const featureIds = features.map(f => f.id);
  const { data: milestonesMap = {}, isLoading: isMilestonesLoading } = useQuery({
    queryKey: ['/api/features', featureIds, 'milestones'],
    enabled: featureIds.length > 0,
    select: (data: Milestone[]) => {
      const map: Record<number, Milestone[]> = {};
      data.forEach(milestone => {
        if (!map[milestone.featureId]) {
          map[milestone.featureId] = [];
        }
        map[milestone.featureId].push(milestone);
      });
      return map;
    }
  });

  // Get all goals for all milestones
  const milestoneIds = Object.values(milestonesMap).flat().map(m => m.id);
  const { data: goalsMap = {}, isLoading: isGoalsLoading } = useQuery({
    queryKey: ['/api/milestones', milestoneIds, 'goals'],
    enabled: milestoneIds.length > 0,
    select: (data: Goal[]) => {
      const map: Record<number, Goal[]> = {};
      data.forEach(goal => {
        if (!map[goal.milestoneId]) {
          map[goal.milestoneId] = [];
        }
        map[goal.milestoneId].push(goal);
      });
      return map;
    }
  });

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

    const unsubscribe = onFeatureUpdated((data) => {
      // Check if the updated feature belongs to our project
      if (data?.feature?.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'features'] });
      }
    });

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
  const featuresWithChildren: FeatureWithChildren[] = features.map(feature => {
    const featureMilestones = milestonesMap[feature.id] || [];
    return {
      ...feature,
      milestones: featureMilestones.map(milestone => ({
        ...milestone,
        goals: goalsMap[milestone.id] || [],
      })),
    };
  });

  // Calculate feature completion percentage
  const completedFeatures = features.filter(f => f.completed).length;
  const featureCompletionPercentage = features.length > 0 
    ? Math.round((completedFeatures / features.length) * 100) 
    : 0;

  const isLoading = isProjectLoading || isFeaturesLoading || isMilestonesLoading || isGoalsLoading;

  return {
    project,
    features: featuresWithChildren,
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
