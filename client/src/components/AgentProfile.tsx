import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from 'lucide-react';

interface SkillStats {
  skillTag: string;
  totalAttempts: number;
  successfulAttempts: number;
  accuracy: number;
  lastUsed: string;
  lastFailReason?: string;
  recentFails: string[];
}

interface AgentProfileProps {
  agentId: string;
}

export function AgentProfile({ agentId }: AgentProfileProps) {
  const [skillStats, setSkillStats] = useState<SkillStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  useEffect(() => {
    fetchPerformanceStats();
  }, [agentId]);

  const fetchPerformanceStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/agents/${agentId}/performance`);
      if (!response.ok) {
        throw new Error('Failed to fetch performance stats');
      }
      
      const data = await response.json();
      setSkillStats(data);
      setLastRefresh(new Date().toLocaleString());
    } catch (error) {
      console.error('Error fetching performance stats:', error);
      setError('Failed to load performance stats');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetrainSkill = async (skillTag: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/retrain/${skillTag}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to trigger retraining');
      }

      console.log(`✅ Triggered retraining for skill: ${skillTag}`);
      // Refresh stats after retraining is triggered
      setTimeout(fetchPerformanceStats, 1000);
    } catch (error) {
      console.error('Error triggering retraining:', error);
      setError('Failed to trigger retraining');
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'text-green-500';
    if (accuracy >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getAccuracyBarColor = (accuracy: number) => {
    if (accuracy >= 90) return 'bg-green-500';
    if (accuracy >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getAccuracyIcon = (accuracy: number) => {
    if (accuracy >= 90) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (accuracy >= 70) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const formatSkillTag = (skillTag: string) => {
    return skillTag.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getOverallAccuracy = () => {
    if (skillStats.length === 0) return 0;
    const totalAccuracy = skillStats.reduce((sum, skill) => sum + skill.accuracy, 0);
    return Math.round(totalAccuracy / skillStats.length);
  };

  return (
    <div className="agent-profile h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Agent Performance</h3>
            <p className="text-sm text-gray-400">Agent ID: {agentId}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPerformanceStats}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="p-4 border-b border-gray-700">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{skillStats.length}</div>
            <div className="text-sm text-gray-400">Skills Tracked</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getAccuracyColor(getOverallAccuracy())}`}>
              {getOverallAccuracy()}%
            </div>
            <div className="text-sm text-gray-400">Overall Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {skillStats.reduce((sum, skill) => sum + skill.totalAttempts, 0)}
            </div>
            <div className="text-sm text-gray-400">Total Attempts</div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-md m-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Skill Stats */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="text-center text-gray-500 py-8">
            <div className="animate-spin w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Loading performance stats...</p>
          </div>
        ) : skillStats.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Brain className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No performance data yet</p>
            <p className="text-sm mt-1">Performance stats will appear after tasks are completed</p>
          </div>
        ) : (
          skillStats.map((skill) => (
            <div
              key={skill.skillTag}
              className="bg-gray-800/50 rounded-lg border border-gray-700 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getAccuracyIcon(skill.accuracy)}
                    <h4 className="text-sm font-medium text-white">
                      {formatSkillTag(skill.skillTag)}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                    <span>{skill.totalAttempts} attempts</span>
                    <span>{skill.successfulAttempts} successful</span>
                    <span className={getAccuracyColor(skill.accuracy)}>
                      {skill.accuracy.toFixed(1)}% accuracy
                    </span>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRetrainSkill(skill.skillTag)}
                  disabled={skill.accuracy >= 90}
                >
                  Force Retrain
                </Button>
              </div>
              
              {/* Accuracy Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Accuracy</span>
                  <span>{skill.accuracy.toFixed(1)}%</span>
                </div>
                <Progress 
                  value={skill.accuracy} 
                  className="h-2"
                />
              </div>
              
              {/* Additional Info */}
              <div className="text-xs text-gray-400 space-y-1">
                <div>
                  <span>Last used: </span>
                  <span className="text-white">{formatTimestamp(skill.lastUsed)}</span>
                </div>
                {skill.lastFailReason && (
                  <div>
                    <span>Last fail: </span>
                    <span className="text-red-400">{skill.lastFailReason}</span>
                  </div>
                )}
                {skill.recentFails.length > 0 && (
                  <div>
                    <span>Recent fails: </span>
                    <span className="text-red-400">{skill.recentFails.length}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {lastRefresh && (
        <div className="p-4 border-t border-gray-700 text-xs text-gray-400">
          Last updated: {lastRefresh}
        </div>
      )}
    </div>
  );
} 