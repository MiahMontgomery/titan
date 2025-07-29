import { useState, useEffect, useRef } from 'react';

interface ProgressEvent {
  id: string;
  type: string;
  projectId: string;
  goalId?: string;
  goalTitle?: string;
  message: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ProgressFeedProps {
  projectId: string;
}

export function ProgressFeed({ projectId }: ProgressFeedProps) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clean up previous connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Connect to WebSocket
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('🔌 WebSocket connected for project:', projectId);
          setIsConnected(true);
          setError(null);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Filter messages for this project
            if (data.projectId === projectId) {
              const newEvent: ProgressEvent = {
                id: `${Date.now()}-${Math.random()}`,
                type: data.type,
                projectId: data.projectId,
                goalId: data.goalId,
                goalTitle: data.goalTitle,
                message: getMessageForType(data),
                status: data.status || 'in_progress',
                timestamp: new Date().toISOString(),
                metadata: data.metadata
              };

              setEvents(prev => [...prev, newEvent]);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          setIsConnected(false);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('Connection failed');
          setIsConnected(false);
        };

      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setError('Failed to connect');
        setIsConnected(false);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [projectId]);

  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  const getMessageForType = (data: any): string => {
    switch (data.type) {
      case 'goal_enqueued':
        return `📋 Enqueued goal: "${data.goalTitle}"`;
      case 'task_started':
        return `🎯 Started task: "${data.goalTitle}"`;
      case 'task_completed':
        return `✅ Completed task: "${data.goalTitle}"`;
      case 'task_failed':
        return `❌ Failed task: "${data.goalTitle}" - ${data.error}`;
      case 'code_generated':
        return `💻 Generated code for: "${data.goalTitle}" (${data.language})`;
      case 'goal_updated':
        return `🔄 Updated goal: "${data.goalTitle}"`;
      case 'rollback_completed':
        return `🔄 Rolled back to checkpoint: "${data.summary}"`;
      case 'checkpoint_preview_requested':
        return `👁️ Preview requested for checkpoint #${data.checkpointId}`;
      default:
        return data.message || `Event: ${data.type}`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'in_progress':
        return '🔄';
      default:
        return '📋';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'in_progress':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="progress-feed h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Autonomous Execution</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-md m-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Events Feed */}
      <div 
        ref={feedRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {events.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>Waiting for autonomous execution events...</p>
            <p className="text-sm mt-2">Create a project to see real-time progress</p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700"
            >
              <div className="flex-shrink-0 mt-1">
                <span className="text-lg">{getStatusIcon(event.status)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${getStatusColor(event.status)}`}>
                  {event.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </p>
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    {Object.entries(event.metadata).map(([key, value]) => (
                      <span key={key} className="mr-3">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 