import React, { useState, useEffect } from "react";
import { ActiveTab, SavedItem } from "./types";
import { INITIAL_SAVED_ITEMS } from "./data/mockData";
import { BackgroundElements } from "./components/BackgroundElements";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { HomeView } from "./components/HomeView";
import { SeoView } from "./components/SeoView";
import { SocialView } from "./components/SocialView";
import { ExportView } from "./components/ExportView";
import { BusinessView } from "./components/BusinessView";
import { DashboardView } from "./components/DashboardView";
import { PricingView } from "./components/PricingView";
import { CheckCircle2 } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    try {
      const stored = localStorage.getItem("bge_saved_items");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load saved items from local storage", e);
    }
    return INITIAL_SAVED_ITEMS;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem("bge_saved_items", JSON.stringify(savedItems));
    } catch (e) {
      console.error("Failed to persist saved items", e);
    }
  }, [savedItems]);

  const handleSaveItem = (itemData: Omit<SavedItem, "id" | "createdAt">) => {
    const newItem: SavedItem = {
      ...itemData,
      id: `saved-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setSavedItems((prev) => [newItem, ...prev]);
    showToast(`Saved "${newItem.title.slice(0, 32)}..." to your Dashboard!`);
  };

  const handleDeleteItem = (id: string) => {
    setSavedItems((prev) => prev.filter((i) => i.id !== id));
    showToast("Report deleted from workspace.");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen text-slate-100 selection:bg-cyan-500 selection:text-slate-950 font-sans relative antialiased">
      {/* Premium Dark Blue + Purple + Cyan Gradient Background */}
      <BackgroundElements />

      {/* Main Container Layout */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Mobile Header Bar */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          savedCount={savedItems.length}
        />

        {/* Dynamic Mobile View Body */}
        <main className="flex-1 w-full max-w-md sm:max-w-2xl lg:max-w-4xl mx-auto px-3.5 sm:px-6 pt-3 pb-24">
          {activeTab === "home" && (
            <HomeView
              setActiveTab={setActiveTab}
              onSaveItem={handleSaveItem}
              savedItemIds={savedItems.map((i) => i.id)}
            />
          )}

          {activeTab === "seo" && (
            <SeoView onSaveItem={handleSaveItem} />
          )}

          {activeTab === "social" && (
            <SocialView onSaveItem={handleSaveItem} />
          )}

          {activeTab === "export" && (
            <ExportView onSaveItem={handleSaveItem} />
          )}

          {activeTab === "business" && (
            <BusinessView onSaveItem={handleSaveItem} />
          )}

          {activeTab === "dashboard" && (
            <DashboardView
              savedItems={savedItems}
              onDeleteItem={handleDeleteItem}
            />
          )}

          {activeTab === "pricing" && (
            <PricingView />
          )}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-cyan-500/60 text-cyan-300 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
