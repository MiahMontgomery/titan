import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOutputsByProject, approveOutput, rejectOutput, createMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Check, X, FileText, Film, Music, FileCode, Image } from "lucide-react";
import { OUTPUT_TYPES, SENDERS } from "@/lib/constants";
import { Skeleton } from "@/components/ui/skeleton";
import type { Output } from "@shared/schema";

interface OutputTabProps {
  projectId: number;
}

export function OutputTab({ projectId }: OutputTabProps) {
  const { data: outputs = [], isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'outputs'],
    enabled: !!projectId,
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Approve output mutation
  const { mutateAsync: approveOutputMutation } = useMutation({
    mutationFn: approveOutput,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'outputs'] });
      toast({
        title: "Output approved",
        description: "The deliverable has been approved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Approval failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Reject output mutation
  const { mutateAsync: rejectOutputMutation } = useMutation({
    mutationFn: rejectOutput,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'outputs'] });
      toast({
        title: "Output rejected",
        description: "The deliverable has been rejected.",
      });
    },
    onError: (error) => {
      toast({
        title: "Rejection failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Ask follow-up question mutation
  const { mutateAsync: createMessageMutation } = useMutation({
    mutationFn: (data: { content: string }) => {
      return createMessage({
        projectId,
        content: data.content,
        sender: SENDERS.JASON,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'messages'] });
      toast({
        title: "Follow-up message sent",
        description: "A follow-up question has been added to the input tab.",
      });
    },
  });

  const handleApprove = async (outputId: number) => {
    try {
      await approveOutputMutation(outputId);
    } catch (error) {
      console.error("Failed to approve output:", error);
    }
  };

  const handleReject = async (outputId: number, title: string) => {
    try {
      await rejectOutputMutation(outputId);
      
      // Send follow-up message to Input tab
      await createMessageMutation({
        content: `I see you rejected the "${title}" deliverable. Could you please provide more details on what needs to be improved?`
      });
    } catch (error) {
      console.error("Failed to reject output:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-36" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 max-h-[600px] overflow-y-auto">
      <div className="output-header flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Deliverables</h3>
        <span className="text-sm text-[#A9A9A9]">Review & approve</span>
      </div>

      <div className="outputs-container space-y-4">
        {outputs.length === 0 ? (
          <div className="text-center text-[#A9A9A9] py-8">
            No deliverables yet. Completed work will appear here for your approval.
          </div>
        ) : (
          outputs.map(output => (
            <OutputItem 
              key={output.id}
              output={output}
              onApprove={() => handleApprove(output.id)}
              onReject={() => handleReject(output.id, output.title)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface OutputItemProps {
  output: Output;
  onApprove: () => void;
  onReject: () => void;
}

function OutputItem({ output, onApprove, onReject }: OutputItemProps) {
  // Get icon based on output type
  const getOutputIcon = (type: string) => {
    switch (type) {
      case OUTPUT_TYPES.AUDIO:
        return <Music size={16} className="text-blue-400" />;
      case OUTPUT_TYPES.VIDEO:
        return <Film size={16} className="text-purple-400" />;
      case OUTPUT_TYPES.PDF:
      case OUTPUT_TYPES.DOCUMENT:
        return <FileText size={16} className="text-yellow-400" />;
      case OUTPUT_TYPES.CODE:
        return <FileCode size={16} className="text-green-400" />;
      case OUTPUT_TYPES.IMAGE:
        return <Image size={16} className="text-cyan-400" />;
      default:
        return <FileText size={16} className="text-[#A9A9A9]" />;
    }
  };

  // Render preview based on output type
  const renderPreview = () => {
    switch (output.type) {
      case OUTPUT_TYPES.AUDIO:
        return (
          <audio controls className="w-full">
            <source src={output.content} />
            Your browser does not support the audio element.
          </audio>
        );
      case OUTPUT_TYPES.VIDEO:
        return (
          <video controls className="w-full max-h-[240px]">
            <source src={output.content} />
            Your browser does not support the video element.
          </video>
        );
      case OUTPUT_TYPES.PDF:
        return (
          <div className="flex items-center justify-center p-4 bg-[#121212]">
            <FileText size={40} className="text-[#A9A9A9]" />
            <span className="ml-2 text-[#A9A9A9]">PDF Document</span>
          </div>
        );
      case OUTPUT_TYPES.IMAGE:
        return (
          <img 
            src={output.content} 
            alt={output.title} 
            className="max-h-[240px] mx-auto object-contain" 
          />
        );
      case OUTPUT_TYPES.CODE:
        return (
          <div className="bg-[#121212] p-3 text-xs overflow-x-auto text-white rounded">
            <pre>
              <code>{output.content.substring(0, 200)}...</code>
            </pre>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center p-4 bg-[#121212]">
            <FileText size={40} className="text-[#A9A9A9]" />
            <span className="ml-2 text-[#A9A9A9]">Preview not available</span>
          </div>
        );
    }
  };

  return (
    <div className="output-item p-3 rounded-md bg-[#0d0d0d] border border-[#333333]">
      <div className="output-header flex justify-between items-center mb-2">
        <div className="flex items-center">
          <span className="mr-2">{getOutputIcon(output.type)}</span>
          <h4 className="font-medium text-white">{output.title}</h4>
        </div>
        <div className="text-xs text-[#A9A9A9] uppercase">{output.type}</div>
      </div>
      
      <div className="output-preview mb-3 bg-[#121212] p-2 rounded-md">
        {renderPreview()}
      </div>
      
      {output.approved === null && (
        <div className="flex space-x-2 justify-end">
          <button
            className="reject-btn px-3 py-1 rounded-md border border-red-800 text-red-400 hover:bg-red-900 hover:bg-opacity-20 flex items-center"
            onClick={onReject}
          >
            <X size={16} className="mr-1" />
            Reject
          </button>
          <button
            className="approve-btn px-3 py-1 rounded-md border border-green-800 text-green-400 hover:bg-green-900 hover:bg-opacity-20 flex items-center"
            onClick={onApprove}
          >
            <Check size={16} className="mr-1" />
            Approve
          </button>
        </div>
      )}
      
      {output.approved === true && (
        <div className="flex justify-end">
          <span className="text-xs text-green-400 bg-green-900 bg-opacity-20 px-2 py-1 rounded flex items-center">
            <Check size={12} className="mr-1" />
            Approved
          </span>
        </div>
      )}
      
      {output.approved === false && (
        <div className="flex justify-end">
          <span className="text-xs text-red-400 bg-red-900 bg-opacity-20 px-2 py-1 rounded flex items-center">
            <X size={12} className="mr-1" />
            Rejected
          </span>
        </div>
      )}
    </div>
  );
}
