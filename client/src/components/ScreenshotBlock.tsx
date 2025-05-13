import { useState } from "react";
import { motion } from "framer-motion";
import { Maximize2, X } from "lucide-react";

interface ScreenshotBlockProps {
  url: string;
  caption: string;
}

export function ScreenshotBlock({ url, caption }: ScreenshotBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <>
      <motion.div
        className="screenshot-block my-2"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className="screenshot-preview cursor-pointer rounded-md overflow-hidden border border-[#333333]"
          onClick={toggleExpand}
        >
          {/* Image with placeholder */}
          <div className="relative bg-[#0d0d0d]">
            <img
              className="w-full h-auto max-h-[300px] object-contain"
              src={url}
              alt={caption || "Screenshot"}
              onError={(e) => {
                e.currentTarget.src = "https://via.placeholder.com/400x300?text=Error+Loading+Image";
              }}
            />
            <div className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 rounded">
              <Maximize2 size={16} className="text-white" />
            </div>
          </div>
        </div>
        {caption && (
          <div className="text-xs text-[#A9A9A9] mt-1">{caption}</div>
        )}
      </motion.div>

      {/* Expanded modal view */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
          onClick={toggleExpand}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 rounded-full text-white"
              onClick={toggleExpand}
            >
              <X size={20} />
            </button>
            <img
              className="max-w-full max-h-[90vh] object-contain"
              src={url}
              alt={caption || "Screenshot"}
            />
            {caption && (
              <div className="text-sm text-white mt-2 text-center">{caption}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
