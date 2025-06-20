import { useState } from "react";
import { createTask } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
  defaultProjectId?: string;
}

export function AddTaskModal({ isOpen, onClose, onTaskCreated, defaultProjectId }: AddTaskModalProps) {
  const [taskType, setTaskType] = useState('screenshot');
  const [taskUrl, setTaskUrl] = useState('');
  const [taskPrompt, setTaskPrompt] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const payload: any = {
        type: taskType,
        projectId,
      };
      if (taskType === 'screenshot') {
        payload.url = taskUrl;
      } else if (taskType === 'chat' || taskType === 'plan' || taskType === 'voice') {
        payload.metadata = { prompt: taskPrompt, text: taskPrompt };
      }
      await createTask(payload);
      toast({ title: 'Task created', description: 'Your task has been added to the queue.' });
      setTaskUrl('');
      setTaskPrompt('');
      if (onTaskCreated) onTaskCreated();
      onClose();
    } catch (error) {
      toast({ title: 'Failed to create task', description: error instanceof Error ? error.message : String(error), variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-[#181818] rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-white">Add New Task</h2>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <label className="text-[#A9A9A9] text-sm">Project ID:</label>
          <input
            type="text"
            className="bg-[#0e0e0e] border border-[#333333] rounded-md px-2 py-1 text-white"
            placeholder="Enter project ID..."
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            required
          />
          <label className="text-[#A9A9A9] text-sm">Task Type:</label>
          <select
            className="bg-[#0e0e0e] border border-[#333333] rounded-md px-2 py-1 text-white"
            value={taskType}
            onChange={e => setTaskType(e.target.value)}
          >
            <option value="screenshot">Screenshot</option>
            <option value="chat">Chat</option>
            <option value="plan">Plan</option>
            <option value="voice">Voice</option>
          </select>
          {taskType === 'screenshot' && (
            <input
              type="text"
              className="bg-[#0e0e0e] border border-[#333333] rounded-md px-2 py-1 text-white"
              placeholder="Enter URL for screenshot..."
              value={taskUrl}
              onChange={e => setTaskUrl(e.target.value)}
              required
            />
          )}
          {(taskType === 'chat' || taskType === 'plan' || taskType === 'voice') && (
            <input
              type="text"
              className="bg-[#0e0e0e] border border-[#333333] rounded-md px-2 py-1 text-white"
              placeholder={taskType === 'voice' ? 'Enter text for voice...' : 'Enter prompt...'}
              value={taskPrompt}
              onChange={e => setTaskPrompt(e.target.value)}
              required
            />
          )}
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-[#A9A9A9] text-[#A9A9A9] hover:bg-[#222]"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-[#39FF14] text-black font-semibold hover:bg-[#01F9C6] transition-colors"
              disabled={isCreating || !projectId || (taskType === 'screenshot' && !taskUrl) || ((taskType === 'chat' || taskType === 'plan' || taskType === 'voice') && !taskPrompt)}
            >
              {isCreating ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 