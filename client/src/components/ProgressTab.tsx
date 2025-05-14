import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Check, Circle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Feature, Milestone, Goal } from "@shared/schema";

interface FeatureWithChildren extends Feature {
  milestones: (Milestone & {
    goals: Goal[];
  })[];
}

interface ProgressTabProps {
  projectId: number;
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

export function ProgressTab({
  projectId,
  features,
  isLoading,
  featureCompletionPercentage,
  markFeatureComplete,
  markGoalComplete,
  expandedFeatures,
  expandedMilestones,
  toggleFeatureExpand,
  toggleMilestoneExpand,
}: ProgressTabProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Features</h3>
        <span className="text-sm text-[#A9A9A9]">
          {features.filter(f => f.completed).length} completed
        </span>
      </div>

      {features.length === 0 ? (
        <div className="text-center text-[#A9A9A9] py-8">
          No features yet. Features will appear here as they're identified.
        </div>
      ) : (
        <div className="features-list space-y-3">
          {features.map((feature) => (
            <FeatureItem
              key={feature.id}
              feature={feature}
              isExpanded={expandedFeatures.includes(feature.id)}
              expandedMilestones={expandedMilestones}
              onToggleExpand={() => toggleFeatureExpand(feature.id)}
              onToggleMilestone={toggleMilestoneExpand}
              onMarkComplete={markFeatureComplete}
              onMarkGoalComplete={markGoalComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FeatureItemProps {
  feature: FeatureWithChildren;
  isExpanded: boolean;
  expandedMilestones: number[];
  onToggleExpand: () => void;
  onToggleMilestone: (milestoneId: number) => void;
  onMarkComplete: (featureId: number) => Promise<void>;
  onMarkGoalComplete: (goalId: number) => Promise<void>;
}

function FeatureItem({
  feature,
  isExpanded,
  expandedMilestones,
  onToggleExpand,
  onToggleMilestone,
  onMarkComplete,
  onMarkGoalComplete,
}: FeatureItemProps) {
  return (
    <div 
      className={`
        p-3 border rounded-md bg-[#0d0d0d] transition-all duration-300
        ${feature.completed 
          ? 'border-[#39FF14] glow-border' 
          : 'border-[#4A4A4A]'}
      `}
    >
      <div 
        className="feature-header flex items-center justify-between cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center space-x-2">
          {feature.completed ? (
            <Check size={16} className="text-[#39FF14]" />
          ) : (
            <Circle size={16} className="text-[#4A4A4A]" />
          )}
          <h4 className="font-medium text-white">{feature.title}</h4>
        </div>
        <button className="text-[#A9A9A9]">
          {isExpanded ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="feature-content mt-3 pl-4 space-y-2">
              <div className="text-sm text-[#A9A9A9]">Milestones:</div>
              {feature.milestones.length === 0 ? (
                <div className="text-sm text-[#A9A9A9] italic">No milestones yet</div>
              ) : (
                <div className="milestones-list space-y-2">
                  {feature.milestones.map((milestone) => (
                    <MilestoneItem
                      key={milestone.id}
                      milestone={milestone}
                      isExpanded={expandedMilestones.includes(milestone.id)}
                      onToggleExpand={() => onToggleMilestone(milestone.id)}
                      onMarkGoalComplete={onMarkGoalComplete}
                    />
                  ))}
                </div>
              )}
              
              {!feature.completed && (
                <div className="mt-3 text-right">
                  <button
                    className="px-2 py-1 text-xs text-[#39FF14] border border-[#39FF14] rounded hover:bg-[#39FF14] hover:bg-opacity-10 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkComplete(feature.id);
                    }}
                  >
                    Mark Complete
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface MilestoneItemProps {
  milestone: Milestone & { goals: Goal[] };
  isExpanded: boolean;
  onToggleExpand: () => void;
  onMarkGoalComplete: (goalId: number) => Promise<void>;
}

function MilestoneItem({
  milestone,
  isExpanded,
  onToggleExpand,
  onMarkGoalComplete,
}: MilestoneItemProps) {
  return (
    <div 
      className={`
        p-2 border rounded-md bg-[#121212] transition-all duration-200
        ${milestone.completed 
          ? 'border-[#39FF14]' 
          : 'border-[#4A4A4A]'}
      `}
    >
      <div 
        className="milestone-header flex items-center justify-between cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center">
          <span 
            className={`
              inline-block w-2 h-2 rounded-full mr-2
              ${milestone.completed ? 'bg-[#39FF14]' : 'bg-[#4A4A4A]'}
            `}
          ></span>
          <h5 className="text-sm text-white">{milestone.title}</h5>
        </div>
        <button className="text-[#A9A9A9] text-sm">
          {isExpanded ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="milestone-content mt-2 pl-4 space-y-1">
              <div className="text-xs text-[#A9A9A9]">Goals:</div>
              {milestone.goals.length === 0 ? (
                <div className="text-xs text-[#A9A9A9] italic">No goals yet</div>
              ) : (
                <ul className="goals-list text-xs space-y-1">
                  {milestone.goals.map((goal) => (
                    <GoalItem 
                      key={goal.id}
                      goal={goal}
                      onMarkComplete={onMarkGoalComplete}
                    />
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface GoalItemProps {
  goal: Goal;
  onMarkComplete: (goalId: number) => Promise<void>;
}

function GoalItem({ goal, onMarkComplete }: GoalItemProps) {
  return (
    <li className="flex items-center group">
      <button
        className={`
          w-3 h-3 rounded-full mr-2 flex-shrink-0 transition-colors
          ${goal.completed ? 'bg-[#39FF14]' : 'bg-[#4A4A4A] group-hover:bg-[#39FF14] group-hover:bg-opacity-50'}
        `}
        onClick={(e) => {
          e.stopPropagation();
          if (!goal.completed) {
            onMarkComplete(goal.id);
          }
        }}
        disabled={goal.completed}
      ></button>
      <span className={goal.completed ? 'text-white' : 'text-[#A9A9A9]'}>
        {goal.title}
      </span>
    </li>
  );
}
