import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useProjectContext } from "@/contexts/ProjectContext";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, prompt: string) => Promise<any>;
}

export function NewProjectModal({ isOpen, onClose, onSubmit }: NewProjectModalProps) {
  const [projectName, setProjectName] = useState("");
  const [projectPrompt, setProjectPrompt] = useState("");
  const { isCreatingProject } = useProjectContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectName.trim() || !projectPrompt.trim()) {
      return;
    }
    
    try {
      await onSubmit(projectName, projectPrompt);
      
      // Reset form and close modal on success
      setProjectName("");
      setProjectPrompt("");
      onClose();
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="bg-[#121212] border border-[#333333] rounded-lg p-6 w-full max-w-md"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Create New Project</h2>
              <button
                className="text-[#A9A9A9] hover:text-white"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>
            
            <form id="newProjectForm" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="projectName" className="block text-sm font-medium text-[#A9A9A9] mb-1">
                  Project Name
                </label>
                <input 
                  type="text" 
                  id="projectName" 
                  className="w-full px-3 py-2 bg-[#0e0e0e] border border-[#333333] rounded-md focus:outline-none focus:border-[#01F9C6] text-white"
                  placeholder="Enter project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="projectPrompt" className="block text-sm font-medium text-[#A9A9A9] mb-1">
                  Project Prompt
                </label>
                <textarea 
                  id="projectPrompt" 
                  rows={6} 
                  className="w-full px-3 py-2 bg-[#0e0e0e] border border-[#333333] rounded-md focus:outline-none focus:border-[#01F9C6] text-white resize-none"
                  placeholder="Describe your project in detail..."
                  value={projectPrompt}
                  onChange={(e) => setProjectPrompt(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button 
                  type="button" 
                  className="px-4 py-2 border border-[#333333] rounded-md hover:bg-[#0e0e0e] transition-colors text-white"
                  onClick={onClose}
                  disabled={isCreatingProject}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#39FF14] bg-opacity-20 text-[#39FF14] border border-[#39FF14] rounded-md hover:bg-opacity-30 transition-colors flex items-center"
                  disabled={isCreatingProject}
                >
                  {isCreatingProject ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
