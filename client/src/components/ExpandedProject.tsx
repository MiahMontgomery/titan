import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { TabNavigation } from "./TabNavigation";
import { ProgressTab } from "./ProgressTab";
import { InputTab } from "./InputTab";
import { LogsTab } from "./LogsTab";
import { OutputTab } from "./OutputTab";
import { SalesTab } from "./SalesTab";
import { useProjectData } from "@/hooks/useProjectData";
import type { Project } from "@shared/schema";

interface ExpandedProjectProps {
  project: Project;
  onClose: () => void;
}

export function ExpandedProject({ project, onClose }: ExpandedProjectProps) {
  const [activeTab, setActiveTab] = useState<string>("progress");
  const {
    features,
    isLoading,
    featureCompletionPercentage,
    markFeatureComplete,
    markGoalComplete,
    expandedFeatures,
    expandedMilestones,
    toggleFeatureExpand,
    toggleMilestoneExpand,
  } = useProjectData(project.id);

  const renderTabContent = () => {
    switch (activeTab) {
      case "progress":
        return (
          <ProgressTab
            projectId={project.id}
            features={features}
            isLoading={isLoading}
            featureCompletionPercentage={featureCompletionPercentage}
            markFeatureComplete={markFeatureComplete}
            markGoalComplete={markGoalComplete}
            expandedFeatures={expandedFeatures}
            expandedMilestones={expandedMilestones}
            toggleFeatureExpand={toggleFeatureExpand}
            toggleMilestoneExpand={toggleMilestoneExpand}
          />
        );
      case "input":
        return <InputTab projectId={project.id} />;
      case "logs":
        return <LogsTab projectId={project.id} />;
      case "output":
        return <OutputTab projectId={project.id} />;
      case "sales":
        return <SalesTab projectId={project.id} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="expanded-project border border-[#01F9C6] rounded-md bg-[#0e0e0e] shadow-glow overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="project-header flex justify-between items-center p-4 border-b border-[#333333]">
        <div>
          <h2 className="text-xl font-bold text-white">{project.name}</h2>
          <p className="text-sm text-[#A9A9A9]">
            {project.prompt.length > 60 ? `${project.prompt.substring(0, 60)}...` : project.prompt}
          </p>
        </div>
        <button
          className="p-2 text-[#A9A9A9] hover:text-white rounded-md transition-colors"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
