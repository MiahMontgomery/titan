import { useEffect, useState } from "react";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Activity, Code, RefreshCw, GitPullRequest } from "lucide-react";
import { getLogsByProject } from "@/lib/api";
import { LOG_TYPES, DATE_FORMATS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import type { Log } from "@shared/schema";

interface LogsTabProps {
  projectId: number;
}

export function LogsTab({ projectId }: LogsTabProps) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'logs'],
    enabled: !!projectId,
  });

  // Group logs by date
  const groupedLogs = logs.reduce((acc: Record<string, Log[]>, log) => {
    const date = format(parseISO(log.timestamp.toString()), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 max-h-[600px] overflow-y-auto">
      <div className="logs-header flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Event Log</h3>
        <span className="text-sm text-[#A9A9A9]">All events</span>
      </div>

      <div className="logs-container space-y-6">
        {Object.keys(groupedLogs).length === 0 ? (
          <div className="text-center text-[#A9A9A9] py-8">
            No logs yet. Actions and events will be recorded here.
          </div>
        ) : (
          Object.entries(groupedLogs)
            .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)) // Newest first
            .map(([date, logsForDate]) => (
              <div key={date} className="log-group">
                <div className="date-header text-sm text-[#A9A9A9] mb-2">
                  {formatDateHeader(date)}
                </div>
                <div className="space-y-3">
                  {logsForDate
                    .sort((a, b) => {
                      // Sort by timestamp in descending order (newest first)
                      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                    })
                    .map((log) => (
                      <LogItem key={log.id} log={log} />
                    ))}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

interface LogItemProps {
  log: Log;
}

function LogItem({ log }: LogItemProps) {
  // Get icon based on log type
  const getLogIcon = (type: string) => {
    switch (type) {
      case LOG_TYPES.EXECUTION:
        return <Code size={16} className="text-blue-400" />;
      case LOG_TYPES.FEATURE_UPDATE:
        return <Activity size={16} className="text-green-400" />;
      case LOG_TYPES.ROLLBACK:
        return <RefreshCw size={16} className="text-yellow-400" />;
      case LOG_TYPES.PROJECT_PUSH:
        return <GitPullRequest size={16} className="text-purple-400" />;
      default:
        return <Activity size={16} className="text-[#A9A9A9]" />;
    }
  };

  return (
    <div className="log-item">
      <div className="log-time text-xs text-[#A9A9A9] mb-1">
        {format(parseISO(log.timestamp.toString()), DATE_FORMATS.LOG_TIME)}
      </div>
      <div className="log-content p-3 rounded-md bg-[#0d0d0d] border border-[#333333]">
        <div className="flex items-center gap-2">
          <div className="log-icon w-5 h-5 flex items-center justify-center">
            {getLogIcon(log.type)}
          </div>
          <div className="log-title text-sm text-white">{log.title}</div>
        </div>
        {log.details && (
          <div className="log-details text-xs text-[#A9A9A9] mt-1 pl-7">
            {log.details}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to format date headers
function formatDateHeader(dateStr: string) {
  const date = parseISO(dateStr);
  
  if (isToday(date)) {
    return "Today";
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return format(date, DATE_FORMATS.LOG_DATE);
  }
}
