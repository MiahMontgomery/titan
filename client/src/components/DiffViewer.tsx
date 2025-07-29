import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, FileText, Code } from 'lucide-react';

interface DiffViewerProps {
  checkpointId: string;
  projectId: string;
  onPreviewRequested?: () => void;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
}

export function DiffViewer({ checkpointId, projectId, onPreviewRequested }: DiffViewerProps) {
  const [diffContent, setDiffContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [diffLines, setDiffLines] = useState<DiffLine[]>([]);

  const fetchDiff = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Notify that preview was requested
      if (onPreviewRequested) {
        onPreviewRequested();
      }

      const response = await fetch(`/api/checkpoints/${checkpointId}/diff`);
      if (!response.ok) {
        throw new Error('Failed to fetch diff');
      }
      
      const data = await response.json();
      setDiffContent(data.codeDiff);
      
      // Parse the diff content into lines
      parseDiffContent(data.codeDiff);
      
    } catch (error) {
      console.error('Error fetching diff:', error);
      setError('Failed to load diff preview');
    } finally {
      setIsLoading(false);
    }
  };

  const parseDiffContent = (content: string) => {
    const lines = content.split('\n');
    const parsedLines: DiffLine[] = [];
    
    lines.forEach((line, index) => {
      if (line.startsWith('+')) {
        parsedLines.push({ type: 'added', content: line.substring(1), lineNumber: index + 1 });
      } else if (line.startsWith('-')) {
        parsedLines.push({ type: 'removed', content: line.substring(1), lineNumber: index + 1 });
      } else {
        parsedLines.push({ type: 'unchanged', content: line, lineNumber: index + 1 });
      }
    });
    
    setDiffLines(parsedLines);
  };

  const getLineClass = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-900/20 border-l-2 border-green-500';
      case 'removed':
        return 'bg-red-900/20 border-l-2 border-red-500';
      default:
        return 'border-l-2 border-transparent';
    }
  };

  const getLineIcon = (type: string) => {
    switch (type) {
      case 'added':
        return 'text-green-500';
      case 'removed':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getLinePrefix = (type: string) => {
    switch (type) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      default:
        return ' ';
    }
  };

  const shouldTruncate = diffLines.length > 500 && !isExpanded;
  const displayLines = shouldTruncate ? diffLines.slice(0, 500) : diffLines;

  return (
    <div className="diff-viewer border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-white">Code Diff Preview</span>
        </div>
        <div className="flex items-center gap-2">
          {diffLines.length > 500 && (
            <span className="text-xs text-gray-400">
              {isExpanded ? `${diffLines.length} lines` : `500/${diffLines.length} lines`}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={diffLines.length <= 500}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Expand
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {!diffContent && !isLoading && !error && (
          <div className="p-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDiff}
              className="mx-auto"
            >
              <FileText className="w-4 h-4 mr-2" />
              Load Diff Preview
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="p-4 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-400">Loading diff preview...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-md m-4">
            <p className="text-red-400 text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDiff}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {diffContent && !isLoading && !error && (
          <div className="font-mono text-sm">
            {displayLines.map((line, index) => (
              <div
                key={index}
                className={`px-4 py-1 ${getLineClass(line.type)} hover:bg-gray-800/50`}
              >
                <div className="flex items-start">
                  <span className={`w-8 text-xs ${getLineIcon(line.type)} flex-shrink-0`}>
                    {getLinePrefix(line.type)}
                  </span>
                  <span className="text-gray-300 flex-1">
                    {line.content}
                  </span>
                </div>
              </div>
            ))}
            
            {shouldTruncate && (
              <div className="px-4 py-2 text-center text-gray-400 text-xs border-t border-gray-700">
                ... {diffLines.length - 500} more lines
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 