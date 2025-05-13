import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProjectCard } from "@/components/ProjectCard";
import { ExpandedProject } from "@/components/ExpandedProject";
import { NewProjectModal } from "@/components/NewProjectModal";
import { TitanLogo } from "@/components/TitanLogo";
import { useProjectContext } from "@/contexts/ProjectContext";
import { PlusIcon } from "lucide-react";

export default function Dashboard() {
  const { projects, isLoading, activeProjectId, setActiveProjectId, createNewProject } = useProjectContext();
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  const openNewProjectModal = () => setIsNewProjectModalOpen(true);
  const closeNewProjectModal = () => setIsNewProjectModalOpen(false);

  // Find active project
  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="bg-titan-bg-dark text-titan-text flex flex-col min-h-screen">
      {/* Header */}
      <header className="p-6 border-b border-[#333333]">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <TitanLogo size={32} className="mr-3" />
            <h1 className="text-2xl font-bold text-[#01F9C6]">TITAN Projects</h1>
          </div>
          <button 
            className="bg-[#0e0e0e] hover:bg-opacity-80 text-[#01F9C6] border border-[#01F9C6] px-4 py-2 rounded-md transition duration-300 flex items-center"
            onClick={openNewProjectModal}
          >
            <PlusIcon size={16} className="mr-1" /> Add New Project
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow p-6">
        <div className="container mx-auto">
          {/* Projects list (horizontal scroll) */}
          <div className="flex overflow-x-auto pb-4 mb-8 hide-scrollbar gap-4 min-h-[80px]">
            {isLoading ? (
              <div className="flex items-center justify-center w-full h-20">
                <div className="text-[#A9A9A9]">Loading projects...</div>
              </div>
            ) : (
              projects.length > 0 ? (
                projects.map(project => (
                  <ProjectCard 
                    key={project.id} 
                    project={project} 
                    isActive={project.id === activeProjectId}
                    onClick={() => setActiveProjectId(project.id)}
                  />
                ))
              ) : null
            )}
          </div>

          {/* Selected project expanded view */}
          <AnimatePresence>
            {activeProject && (
              <motion.div
                key="expanded-project"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ExpandedProject 
                  project={activeProject} 
                  onClose={() => setActiveProjectId(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state message */}
          {!isLoading && projects.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-[#A9A9A9] text-xl mb-4">
                No projects yet. Click "Add New Project" to begin.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* New Project Modal */}
      <NewProjectModal 
        isOpen={isNewProjectModalOpen} 
        onClose={closeNewProjectModal}
        onSubmit={createNewProject}
      />
    </div>
  );
}
