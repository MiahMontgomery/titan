import { useState } from "react";
import { NewProjectModal } from "@/components/NewProjectModal";
import { TitanLogo } from "@/components/TitanLogo";
import { useProjectContext } from "@/contexts/ProjectContext";
import { PlusIcon } from "lucide-react";
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { projects, isLoading, createNewProject } = useProjectContext();
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  const openNewProjectModal = () => setIsNewProjectModalOpen(true);
  const closeNewProjectModal = () => setIsNewProjectModalOpen(false);

  return (
    <div className="min-h-screen bg-black">
      {/* Simple header */}
      <div className="flex items-center justify-between p-4">
        <TitanLogo size={20} fill="#22c55e" />
        <Button
          onClick={openNewProjectModal}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm rounded"
        >
          <PlusIcon className="w-3 h-3 mr-1" />
          Add New Project
        </Button>
      </div>

      {/* Centered content */}
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="text-center">
          <p className="text-gray-400 text-base">
            No projects yet. Click 'Add New Project' to begin.
          </p>
        </div>
      </div>

      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={closeNewProjectModal}
        onSubmit={createNewProject}
      />
    </div>
  );
}
