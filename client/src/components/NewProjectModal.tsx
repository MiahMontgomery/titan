import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useToast } from "@/hooks/use-toast";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, prompt: string) => Promise<any>;
}

export function NewProjectModal({ isOpen, onClose, onSubmit }: NewProjectModalProps) {
  const [projectName, setProjectName] = useState("");
  const [projectPrompt, setProjectPrompt] = useState("");
  const [errors, setErrors] = useState<{ name?: string; prompt?: string }>({});
  const { isCreatingProject } = useProjectContext();
  const { toast } = useToast();
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      nameInputRef.current.focus();
    }
    if (!isOpen) {
      setProjectName("");
      setProjectPrompt("");
      setErrors({});
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors: { name?: string; prompt?: string } = {};
    if (!projectName.trim()) newErrors.name = "Project name is required.";
    if (!projectPrompt.trim()) newErrors.prompt = "Project prompt is required.";
    else if (projectPrompt.trim().length < 20) newErrors.prompt = "Prompt should be at least 20 characters.";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    try {
      await onSubmit(projectName, projectPrompt);
      toast({ title: "Project created", description: "Your new project has been created successfully." });
      setProjectName("");
      setProjectPrompt("");
      setErrors({});
      onClose();
    } catch (error: any) {
      toast({ title: "Failed to create project", description: error?.message || "An unexpected error occurred", variant: "destructive" });
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
          aria-modal="true"
          role="dialog"
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
                className="text-gray-400 hover:text-white transition-colors"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            <form id="newProjectForm" onSubmit={handleSubmit} autoComplete="off">
              <div className="mb-4">
                <label htmlFor="projectName" className="block text-sm font-medium text-[#A9A9A9] mb-1">
                  Project Name
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  id="projectName"
                  className={`w-full px-3 py-2 bg-card text-card-foreground border border-border rounded-lg focus:outline-none focus:border-primary placeholder:text-muted-foreground ${errors.name ? 'border-red-500' : 'border-[#333333]'}`}
                  placeholder="Enter project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  aria-invalid={!!errors.name}
                  aria-describedby="projectName-error"
                  required
                />
                {errors.name && <div id="projectName-error" className="text-red-500 text-xs mt-1">{errors.name}</div>}
              </div>
              <div className="mb-6">
                <label htmlFor="projectPrompt" className="block text-sm font-medium text-[#A9A9A9] mb-1">
                  Project Prompt
                </label>
                <textarea
                  id="projectPrompt"
                  rows={6}
                  className={`w-full px-3 py-2 bg-card text-card-foreground border border-border rounded-lg focus:outline-none focus:border-primary placeholder:text-muted-foreground resize-none ${errors.prompt ? 'border-red-500' : 'border-[#333333]'}`}
                  placeholder="Describe your project in detail..."
                  value={projectPrompt}
                  onChange={(e) => setProjectPrompt(e.target.value)}
                  aria-invalid={!!errors.prompt}
                  aria-describedby="projectPrompt-error projectPrompt-helper"
                  required
                />
                <div id="projectPrompt-helper" className="text-xs text-[#A9A9A9] mt-1">
                  Example: "Build a web app to manage team tasks with real-time collaboration and notifications."
                </div>
                {errors.prompt && <div id="projectPrompt-error" className="text-red-500 text-xs mt-1">{errors.prompt}</div>}
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
                  aria-busy={isCreatingProject}
                >
                  {isCreatingProject ? <span className="animate-spin mr-2 w-4 h-4 border-2 border-[#39FF14] border-t-transparent rounded-full"></span> : null}
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
