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
      className={`
        min-w-[280px] rounded-md p-4 bg-[#0e0e0e] border 
        ${isActive ? 'border-[#01F9C6] glow-pulse' : 'border-[#4A4A4A]'}
        cursor-pointer transition-all duration-300
      `}
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
        <span className="inline-block w-2 h-2 rounded-full bg-[#01F9C6] mr-2"></span>
        <span className="text-xs text-[#A9A9A9]">Active</span>
      </div>
    </motion.div>
  );
}
