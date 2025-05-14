import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, ArrowRight } from "lucide-react";
import { ChatBubble } from "./ChatBubble";
import { useInputSync } from "@/hooks/useInputSync";
import { createLog } from "@/lib/api";
import { LOG_TYPES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@shared/schema";

interface InputTabProps {
  projectId: number;
}

export function InputTab({ projectId }: InputTabProps) {
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { 
    messages, 
    isLoading, 
    addUserMessage, 
    addExecutionLog,
    activeTask 
  } = useInputSync(projectId);

  // Create rollback mutation
  const { mutateAsync: createRollbackLog } = useMutation({
    mutationFn: (data: { messageId: number; details: string }) => {
      return createLog({
        projectId,
        type: LOG_TYPES.ROLLBACK,
        title: "Rolled back changes",
        details: `Rolled back changes from message ID: ${data.messageId}. ${data.details}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'logs'] });
      toast({
        title: "Rollback initiated",
        description: "Changes have been rolled back successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Rollback failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    
    try {
      await addUserMessage(messageInput);
      setMessageInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRollback = async (messageId: number) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;
      
      await createRollbackLog({ 
        messageId, 
        details: `Content: ${message.content.substring(0, 50)}...` 
      });
      
      // Add an execution log
      await addExecutionLog(
        "Code rollback executed", 
        `Rolled back changes from message ID: ${messageId}`
      );
    } catch (error) {
      console.error("Rollback failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-[600px] justify-center items-center">
        <div className="text-[#A9A9A9]">Loading conversation...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Active tasks bar */}
      <div className="p-2 border-b border-[#333333] bg-opacity-50 bg-[#0e0e0e]">
        <div className="active-tasks flex flex-wrap gap-2">
          {activeTask ? (
            <span className="px-2 py-1 rounded-full bg-[#39FF14] bg-opacity-20 text-[#39FF14] text-xs flex items-center">
              <ArrowRight size={12} className="mr-1" />
              {activeTask}
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full bg-[#39FF14] bg-opacity-20 text-[#39FF14] text-xs">
              Waiting for input...
            </span>
          )}
        </div>
      </div>
      
      {/* Messages area */}
      <div className="flex-grow overflow-y-auto p-4 messages-container">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-[#A9A9A9]">
              No messages yet. Start the conversation with Jason.
            </div>
          </div>
        ) : (
          messages.map(message => (
            <ChatBubble
              key={message.id}
              message={message}
              onRollback={handleRollback}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="p-4 border-t border-[#333333]">
        <div className="flex gap-2">
          <input
            type="text"
            className="message-input flex-grow px-3 py-2 bg-[#0e0e0e] border border-[#333333] rounded-md focus:outline-none focus:border-[#39FF14] text-white"
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button
            className="send-message-btn px-4 py-2 bg-[#39FF14] bg-opacity-20 text-[#39FF14] border border-[#39FF14] rounded-md hover:bg-opacity-30 transition-colors flex items-center gap-2"
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
          >
            <span>Send</span>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
