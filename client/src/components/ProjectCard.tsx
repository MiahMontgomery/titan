import { motion } from "framer-motion";
import type { Project } from "@shared/schema";

interface ProjectCardProps {
  project: Project;
  isActive: boolean;
  onClick: () => void;
}

export function ProjectCard({ project, isActive, onClick }: ProjectCardProps) {
  return (
    <motion.div
      className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:scale-105 ${
        isActive ? 'border-[#3b82f6] glow-pulse' : 'border-[#4A4A4A]'
      } ${isActive ? 'bg-[#1e293b]' : 'bg-[#0f172a] hover:bg-[#1e293b]'}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="font-semibold truncate text-white">{project.name}</h3>
      <p className="text-sm text-[#A9A9A9] truncate mt-1">
        {project.prompt.length > 40 ? `${project.prompt.substring(0, 40)}...` : project.prompt}
      </p>
      <div className="flex items-center mt-2">
        <span className="inline-block w-2 h-2 rounded-full bg-[#3b82f6] mr-2"></span>
        <span className="text-xs text-[#A9A9A9]">Active</span>
      </div>
    </motion.div>
  );
}
