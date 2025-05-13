import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMessagesByProject, createMessage } from "@/lib/api";
import { onMessageCreated } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import { SENDERS } from "@/lib/constants";
import type { Message } from "@shared/schema";

interface CodeBlockMetadata {
  language: string;
  filename: string;
  code: string;
}

interface ScreenshotMetadata {
  url: string;
  caption: string;
}

export type MessageMetadata = {
  type: "code" | "screenshot" | "execution";
  data: CodeBlockMetadata | ScreenshotMetadata;
};

interface InputContextProps {
  messages: Message[];
  isLoading: boolean;
  activeTaskMessage: string | null;
  sendMessage: (content: string, projectId: number, sender?: string) => Promise<Message>;
  sendCodeBlock: (
    projectId: number, 
    language: string, 
    code: string, 
    filename: string
  ) => Promise<Message>;
  sendScreenshot: (
    projectId: number, 
    url: string, 
    caption: string
  ) => Promise<Message>;
  isSendingMessage: boolean;
}

const InputContext = createContext<InputContextProps | undefined>(undefined);

export function InputProvider({ children, projectId }: { children: ReactNode, projectId?: number | null }) {
  const [activeTaskMessage, setActiveTaskMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get messages for the active project
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'messages'],
    enabled: !!projectId,
  });

  // Send message mutation
  const { mutateAsync: sendMessageMutation, isPending: isSendingMessage } = useMutation({
    mutationFn: (data: { 
      projectId: number; 
      content: string; 
      sender: string; 
      metadata?: Record<string, any>; 
    }) => createMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'messages'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Listen for new messages via WebSocket
  useEffect(() => {
    if (!projectId) return;

    const unsubscribe = onMessageCreated((data) => {
      if (data?.message?.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'messages'] });
        
        // If it's a task status update from Jason, update active task
        if (data.message.sender === SENDERS.JASON && data.message.metadata?.type === "task_status") {
          setActiveTaskMessage(data.message.content);
        }
      }
    });

    return () => unsubscribe();
  }, [projectId, queryClient]);

  // Send a text message
  const sendMessage = async (content: string, projectId: number, sender = SENDERS.USER) => {
    return await sendMessageMutation({ 
      projectId, 
      content, 
      sender 
    });
  };

  // Send a code block message
  const sendCodeBlock = async (
    projectId: number, 
    language: string, 
    code: string, 
    filename: string
  ) => {
    return await sendMessageMutation({
      projectId,
      content: `Code block: ${filename}`,
      sender: SENDERS.JASON,
      metadata: {
        type: "code",
        data: {
          language,
          filename,
          code
        }
      }
    });
  };

  // Send a screenshot message
  const sendScreenshot = async (
    projectId: number, 
    url: string, 
    caption: string
  ) => {
    return await sendMessageMutation({
      projectId,
      content: `Screenshot: ${caption}`,
      sender: SENDERS.JASON,
      metadata: {
        type: "screenshot",
        data: {
          url,
          caption
        }
      }
    });
  };

  return (
    <InputContext.Provider
      value={{
        messages,
        isLoading,
        activeTaskMessage,
        sendMessage,
        sendCodeBlock,
        sendScreenshot,
        isSendingMessage,
      }}
    >
      {children}
    </InputContext.Provider>
  );
}

export function useInputContext() {
  const context = useContext(InputContext);
  if (context === undefined) {
    throw new Error("useInputContext must be used within an InputProvider");
  }
  return context;
}
