import { useState } from "react";
import { motion } from "framer-motion";
import { Code as CodeIcon, Copy, RotateCcw } from "lucide-react";
import { RollbackButton } from "./RollbackButton";
import { useToast } from "@/hooks/use-toast";

interface CodeBlockProps {
  code: string;
  language: string;
  filename: string;
  messageId: number;
  onRollback?: (messageId: number) => void;
}

export function CodeBlock({ 
  code, 
  language, 
  filename, 
  messageId, 
  onRollback 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    
    toast({
      title: "Copied to clipboard",
      description: "Code has been copied to your clipboard",
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRollback = () => {
    if (onRollback) {
      onRollback(messageId);
    }
  };

  return (
    <motion.div
      className="code-block my-2 rounded-md overflow-hidden"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="code-header flex justify-between items-center bg-[#0d0d0d] p-2 text-xs border-b border-[#333333]">
        <div className="flex items-center gap-2">
          <CodeIcon size={12} className="text-[#A9A9A9]" />
          <span className="text-[#A9A9A9]">{filename}</span>
        </div>
        <div className="flex space-x-2">
          <button
            className="copy-code-btn px-2 py-1 text-[#A9A9A9] hover:text-white rounded flex items-center gap-1"
            onClick={handleCopy}
          >
            <Copy size={12} />
            {copied ? "Copied" : "Copy"}
          </button>
          
          {onRollback && (
            <RollbackButton onClick={handleRollback} />
          )}
        </div>
      </div>
      
      <pre className="code-content bg-[#0d0d0d] p-3 text-xs overflow-x-auto text-white">
        <code>{code}</code>
      </pre>
    </motion.div>
  );
}
