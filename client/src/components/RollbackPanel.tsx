import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Clock, RotateCcw, AlertTriangle } from 'lucide-react';

interface Checkpoint {
  id: string;
  projectId: string;
  goalId: string;
  summary: string;
  codeDiff: string;
  timestamp: string;
}

interface RollbackPanelProps {
  projectId: string;
}

export function RollbackPanel({ projectId }: RollbackPanelProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCheckpoints();
  }, [projectId]);

  const fetchCheckpoints = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/checkpoints`);
      if (!response.ok) {
        throw new Error('Failed to fetch checkpoints');
      }
      const data = await response.json();
      setCheckpoints(data);
    } catch (error) {
      console.error('Error fetching checkpoints:', error);
      setError('Failed to load checkpoints');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevert = async (checkpointId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkpointId,
          projectId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to revert checkpoint');
      }

      // Refresh checkpoints after successful rollback
      await fetchCheckpoints();
      
      console.log('✅ Successfully reverted to checkpoint');
    } catch (error) {
      console.error('Error reverting checkpoint:', error);
      setError('Failed to revert checkpoint');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getGoalTitle = (goalId: string) => {
    // This would ideally come from the checkpoint data or be fetched separately
    return `Goal ${goalId.slice(-8)}`;
  };

  return (
    <div className="rollback-panel h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Rollback Checkpoints</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCheckpoints}
          disabled={isLoading}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-md m-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Checkpoints List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center text-gray-500 py-8">
            <div className="animate-spin w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Loading checkpoints...</p>
          </div>
        ) : checkpoints.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No checkpoints yet</p>
            <p className="text-sm mt-1">Checkpoints will appear after code generation</p>
          </div>
        ) : (
          checkpoints.map((checkpoint) => (
            <div
              key={checkpoint.id}
              className="bg-gray-800/50 rounded-lg border border-gray-700 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(checkpoint.timestamp)}
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-medium text-white mb-1">
                    {getGoalTitle(checkpoint.goalId)}
                  </h4>
                  
                  <p className="text-sm text-gray-300 mb-3">
                    {checkpoint.summary}
                  </p>
                  
                  <div className="text-xs text-gray-500">
                    Code length: {checkpoint.codeDiff.length} characters
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-4"
                      disabled={isLoading}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Revert
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        Confirm Rollback
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will revert the code for goal "{getGoalTitle(checkpoint.goalId)}" 
                        to the state it was in at {formatTimestamp(checkpoint.timestamp)}.
                        <br /><br />
                        <strong>Warning:</strong> This action cannot be undone and will overwrite 
                        any current code for this goal.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRevert(checkpoint.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Revert to Checkpoint
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 