import { motion } from "framer-motion";
import { TABS } from "@/lib/constants";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="tab-navigation flex border-b border-[#333333]">
      {TABS.map((tab) => (
        <TabButton
          key={tab.id}
          id={tab.id}
          label={tab.label}
          isActive={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
        />
      ))}
    </div>
  );
}

interface TabButtonProps {
  id: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ id, label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      className={`
        relative px-4 py-3 focus:outline-none transition-colors duration-200
        ${isActive ? 'text-[#39FF14]' : 'text-[#A9A9A9] hover:text-white'}
      `}
      onClick={onClick}
    >
      {label}
      {isActive && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#39FF14]"
          layoutId="activeTabIndicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
}
