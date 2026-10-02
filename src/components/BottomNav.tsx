import React from "react";
import { Home, Bot, Bookmark, Sparkles } from "lucide-react";
import { ActiveTab } from "../types";

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "home" as const, label: "Home", icon: Home },
    { id: "agent" as const, label: "AI Agent", icon: Bot },
    { id: "dashboard" as const, label: "Vault", icon: Bookmark },
    { id: "pricing" as const, label: "Plans", icon: Sparkles },
  ];

  return (
    <nav 
      aria-label="Bottom Navigation" 
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#070b16]/90 backdrop-blur-xl border-t border-slate-800/80 px-4 py-2 sm:hidden shadow-2xl"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`bottom-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[60px] transition-all duration-200 cursor-pointer ${
                isActive
                  ? "text-cyan-400 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110 text-cyan-300 stroke-[2.2]" : "stroke-[1.8]"}`} />
              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? "text-cyan-300 font-bold" : "text-slate-400"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
