import { useState } from "react";
import { RotateCcw } from "lucide-react";

interface RollbackButtonProps {
  onClick: () => void;
}

export function RollbackButton({ onClick }: RollbackButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleClick = () => {
    if (isConfirming) {
      onClick();
      setIsConfirming(false);
    } else {
      setIsConfirming(true);
      
      // Automatically reset after 3 seconds
      setTimeout(() => {
        setIsConfirming(false);
      }, 3000);
    }
  };

  return (
    <button
      className={`
        rollback-btn px-2 py-1 rounded flex items-center gap-1 transition-colors
        ${isConfirming 
          ? 'text-red-400 hover:text-red-300' 
          : 'text-[#39FF14] hover:text-green-300'}
      `}
      onClick={handleClick}
    >
      <RotateCcw size={12} />
      {isConfirming ? "Confirm" : "Rollback"}
    </button>
  );
}
