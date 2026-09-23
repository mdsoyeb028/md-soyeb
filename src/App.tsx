import React, { useState, useEffect } from "react";
import { ActiveTab, SavedItem } from "./types";
import { INITIAL_SAVED_ITEMS } from "./data/mockData";
import { 
  loadSavedItems, 
  saveReportItem, 
  deleteReportItem,
  getOrCreateUserId 
} from "./services/storageService";
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
    const existing = loadSavedItems();
    if (existing.length > 0) return existing;
    return INITIAL_SAVED_ITEMS;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ensure client user ID is initialized
  useEffect(() => {
    getOrCreateUserId();
  }, []);

  const handleSaveItem = (itemData: Omit<SavedItem, "id" | "createdAt">) => {
    const saved = saveReportItem(itemData);
    setSavedItems((prev) => [saved, ...prev.filter((i) => i.id !== saved.id)]);
    showToast(`Saved "${saved.title.slice(0, 32)}..." to your Dashboard!`);
  };

  const handleDeleteItem = (id: string) => {
    deleteReportItem(id);
    setSavedItems((prev) => prev.filter((i) => i.id !== id));
    showToast("Report removed from your workspace.");
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

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/50 text-white text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Bottom Fixed Navigation Bar (Mobile Native Touch Experience) */}
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}
