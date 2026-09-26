import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { ActiveTab, SavedItem } from "./types";
import { 
  signInWithGoogle, 
  logOutUser, 
  subscribeToAuth, 
  subscribeToUserReports, 
  saveReport, 
  deleteReport, 
  loadGuestReports 
} from "./services/storageService";
import { testFirestoreConnection } from "./firebase";
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
import { CheckCircle2, AlertCircle } from "lucide-react";
import { LanguageProvider } from "./i18n/LanguageContext";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isReportsLoading, setIsReportsLoading] = useState<boolean>(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  
  // Real saved reports (strictly NO fake or demo data)
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info" | "warning">("success");

  // Boot connection check & Auth subscription
  useEffect(() => {
    testFirestoreConnection();

    const unsubAuth = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });

    return () => unsubAuth();
  }, []);

  // Listen to Firestore reports when authenticated, or guest storage when unauthenticated
  useEffect(() => {
    if (isAuthLoading) return;

    if (user && user.uid) {
      setIsReportsLoading(true);
      setReportsError(null);
      const unsubReports = subscribeToUserReports(
        user.uid,
        (items) => {
          setSavedItems(items);
          setIsReportsLoading(false);
        },
        (err) => {
          console.error("Firestore report sync error:", err);
          setReportsError("Could not sync cloud reports. Please check connection.");
          setIsReportsLoading(false);
        }
      );
      return () => unsubReports();
    } else {
      // Unauthenticated / guest session: load local session items (no fake/demo items)
      const guestItems = loadGuestReports();
      setSavedItems(guestItems);
      setIsReportsLoading(false);
      setReportsError(null);
    }
  }, [user, isAuthLoading]);

  const handleSignIn = async () => {
    try {
      showToast("Connecting to Google...", "info");
      const loggedUser = await signInWithGoogle();
      showToast(`Welcome back, ${loggedUser.displayName || loggedUser.email}!`, "success");
    } catch (err: unknown) {
      console.error("Login failed:", err);
      showToast("Sign in was cancelled or failed.", "warning");
    }
  };

  const handleSignOut = async () => {
    try {
      await logOutUser();
      setSavedItems([]);
      showToast("Signed out successfully.", "info");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  const handleSaveItem = async (itemData: Omit<SavedItem, "id" | "createdAt">) => {
    // 1. Prevent duplicate saves: check if identical title or content already exists in current list
    const isDuplicate = savedItems.some(
      (existing) =>
        existing.title.trim().toLowerCase() === itemData.title.trim().toLowerCase() &&
        existing.type === itemData.type
    );

    if (isDuplicate) {
      showToast("This report is already in your Trade Vault!", "info");
      return;
    }

    try {
      const { item, isCloud } = await saveReport(itemData, user);
      
      // If guest, immediately update state
      if (!isCloud) {
        setSavedItems((prev) => [item, ...prev.filter((i) => i.id !== item.id)]);
        showToast("Report saved locally. Sign in with Google to sync to Cloud Vault!", "info");
      } else {
        showToast(`Saved "${item.title.slice(0, 28)}..." to Cloud Firestore!`, "success");
      }
    } catch (err: unknown) {
      console.error("Failed to save report:", err);
      showToast("Failed to save report. Please check permissions or connection.", "warning");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteReport(id, user);
      if (!user) {
        setSavedItems((prev) => prev.filter((i) => i.id !== id));
      }
      showToast("Report deleted from your workspace.", "info");
    } catch (err) {
      console.error("Delete failed:", err);
      showToast("Could not delete report.", "warning");
    }
  };

  const showToast = (msg: string, type: "success" | "info" | "warning" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  return (
    <LanguageProvider user={user}>
      <div className="min-h-screen text-slate-100 selection:bg-cyan-500 selection:text-slate-950 font-sans relative antialiased">
        {/* Background Elements */}
        <BackgroundElements />

        {/* Main Container Layout */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Header Bar */}
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            savedCount={savedItems.length}
            user={user}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
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
                user={user}
                isLoading={isReportsLoading}
                error={reportsError}
                onDeleteItem={handleDeleteItem}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === "pricing" && (
              <PricingView />
            )}
          </main>

          {/* Global Toast Notification */}
          {toastMessage && (
            <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 border transition-all ${
              toastType === "warning" 
                ? "bg-rose-950/90 border-rose-500/60 text-rose-200"
                : toastType === "info"
                ? "bg-slate-900/90 border-blue-500/50 text-blue-200"
                : "bg-slate-900/90 border-cyan-500/50 text-white"
            }`}>
              {toastType === "warning" ? (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              )}
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Bottom Fixed Navigation Bar */}
          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>
    </LanguageProvider>
  );
}
