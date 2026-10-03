import React from "react";
import { Home, Bot, Search, CheckCircle2, FileText } from "lucide-react";
import { ActiveTab } from "../types";

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onNavigateSection?: (section: "home" | "chat" | "analyze" | "tasks" | "reports") => void;
  currentSection?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  activeTab, 
  setActiveTab, 
  onNavigateSection,
  currentSection = "home"
}) => {
  const tabs = [
    { id: "nav-home", label: "Home", icon: Home, isHome: true },
    { id: "nav-agent", label: "Agent", icon: Bot, section: "home" as const },
    { id: "nav-analyze", label: "Analyze", icon: Search, section: "analyze" as const },
    { id: "nav-tasks", label: "Tasks", icon: CheckCircle2, section: "tasks" as const },
    { id: "nav-reports", label: "Reports", icon: FileText, section: "reports" as const },
  ];

  return (
    <nav 
      aria-label="Bottom Navigation" 
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#070b16]/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-2 sm:hidden shadow-2xl"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.isHome 
            ? activeTab === "home" 
            : activeTab === "agent" && (currentSection === tab.section || (tab.section === "home" && (currentSection === "home" || currentSection === "chat")));

          return (
            <button
              key={tab.id}
              id={`bottom-tab-${tab.id}`}
              onClick={() => {
                if (tab.isHome) {
                  setActiveTab("home");
                } else if (onNavigateSection && tab.section) {
                  onNavigateSection(tab.section);
                  setActiveTab("agent");
                } else {
                  setActiveTab("agent");
                }
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[56px] transition-all duration-200 cursor-pointer ${
                isActive
                  ? "text-cyan-400 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? "scale-110 text-cyan-300 stroke-[2.2]" : "stroke-[1.8]"}`} />
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
