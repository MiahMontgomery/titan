import { useState, useEffect } from 'react';
import { Brain, Activity, Clock } from 'lucide-react';

interface SessionStatus {
  agentId: string;
  projectId: string;
  goalId?: string;
  featureId?: string;
  milestoneId?: string;
  taskSummary?: string;
  mode: 'build' | 'debug' | 'optimize';
  timestamp: string;
}

interface StatusHeaderProps {
  projectId: string;
}

export function StatusHeader({ projectId }: StatusHeaderProps) {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState<string>('');

  useEffect(() => {
    // Connect to WebSocket for real-time session updates
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('🔌 StatusHeader WebSocket connected');
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle session-related events
            if (data.projectId === projectId) {
              if (data.type === 'agent_session_resumed') {
                setSessionStatus(data.session);
                setLastActivity('Session resumed');
              } else if (data.type === 'agent_session_saved') {
                setSessionStatus(data.session);
                setLastActivity('Session updated');
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('🔌 StatusHeader WebSocket disconnected');
          setIsConnected(false);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };

      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    // Fetch current session status
    fetchSessionStatus();
  }, [projectId]);

  const fetchSessionStatus = async () => {
    try {
      const response = await fetch(`/api/agents/autonomous-project-agent/session`);
      if (response.ok) {
        const session = await response.json();
        if (session && session.projectId === parseInt(projectId)) {
          setSessionStatus(session);
        }
      }
    } catch (error) {
      console.error('Error fetching session status:', error);
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'build':
        return 'text-blue-500';
      case 'debug':
        return 'text-yellow-500';
      case 'optimize':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'build':
        return '🔨';
      case 'debug':
        return '🐛';
      case 'optimize':
        return '⚡';
      default:
        return '⚙️';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="status-header bg-gray-800 border-b border-gray-700 p-4">
      <div className="flex items-center justify-between">
        {/* Left side - Session Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {sessionStatus && (
            <div className="flex items-center gap-3">
              <Brain className="w-4 h-4 text-blue-400" />
              <div className="text-sm">
                <span className="text-gray-400">Last known state: </span>
                <span className="text-white font-medium">
                  {sessionStatus.taskSummary || 'Unknown task'}
                </span>
                <span className={`ml-2 ${getModeColor(sessionStatus.mode)}`}>
                  {getModeIcon(sessionStatus.mode)} {sessionStatus.mode}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right side - Activity and Timestamp */}
        <div className="flex items-center gap-4">
          {sessionStatus && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{formatTimestamp(sessionStatus.timestamp)}</span>
            </div>
          )}

          {lastActivity && (
            <div className="flex items-center gap-2 text-xs text-blue-400">
              <Activity className="w-3 h-3" />
              <span>{lastActivity}</span>
            </div>
          )}
        </div>
      </div>

      {/* Session Details (expanded on hover) */}
      {sessionStatus && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-400">Project ID: </span>
              <span className="text-white">{sessionStatus.projectId}</span>
            </div>
            {sessionStatus.goalId && (
              <div>
                <span className="text-gray-400">Goal ID: </span>
                <span className="text-white">{sessionStatus.goalId}</span>
              </div>
            )}
            {sessionStatus.featureId && (
              <div>
                <span className="text-gray-400">Feature ID: </span>
                <span className="text-white">{sessionStatus.featureId}</span>
              </div>
            )}
            {sessionStatus.milestoneId && (
              <div>
                <span className="text-gray-400">Milestone ID: </span>
                <span className="text-white">{sessionStatus.milestoneId}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 