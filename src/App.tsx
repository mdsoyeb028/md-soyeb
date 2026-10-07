import React, { useState, useEffect, lazy, Suspense } from "react";
import { User } from "firebase/auth";
import { ActiveTab, SavedItem } from "./types";
import { 
  signInWithGoogle, 
  signInUserAnonymously,
  logOutUser, 
  subscribeToAuth, 
  subscribeToUserReports, 
  saveReport, 
  deleteReport, 
  loadGuestReports,
  handleAuthRedirectResult,
  isInAppBrowser,
  IN_APP_BROWSER_NOTICE
} from "./services/storageService";
import { testFirestoreConnection } from "./firebase";
import { BackgroundElements } from "./components/BackgroundElements";
import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { HomeView } from "./components/HomeView";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { LanguageProvider } from "./i18n/LanguageContext";
import { CreditsProvider, useCredits } from "./context/CreditsContext";
import { SignupGateModal } from "./components/SignupGateModal";
import { PlanLimitModal } from "./components/PlanLimitModal";
import { CreditStatusModal } from "./components/CreditStatusModal";

// Code splitting & lazy loading heavy secondary views to optimize initial bundle size
const SeoView = lazy(() => import("./components/SeoView").then(m => ({ default: m.SeoView })));
const SocialView = lazy(() => import("./components/SocialView").then(m => ({ default: m.SocialView })));
const ExportView = lazy(() => import("./components/ExportView").then(m => ({ default: m.ExportView })));
const BusinessView = lazy(() => import("./components/BusinessView").then(m => ({ default: m.BusinessView })));
const DashboardView = lazy(() => import("./components/DashboardView").then(m => ({ default: m.DashboardView })));
const PricingView = lazy(() => import("./components/PricingView").then(m => ({ default: m.PricingView })));
const TrafficPerformanceView = lazy(() => import("./components/TrafficPerformanceView").then(m => ({ default: m.TrafficPerformanceView })));
const BusinessAgentCenter = lazy(() => import("./components/BusinessAgentCenter").then(m => ({ default: m.BusinessAgentCenter })));
const CustomerAgentCenter = lazy(() => import("./components/CustomerAgentCenter").then(m => ({ default: m.CustomerAgentCenter })));
const PublicAgentView = lazy(() => import("./components/PublicAgentView").then(m => ({ default: m.PublicAgentView })));
const MultiLinkPresenceAnalyzer = lazy(() => import("./components/MultiLinkPresenceAnalyzer").then(m => ({ default: m.MultiLinkPresenceAnalyzer })));
import { DashboardSidebar } from "./components/DashboardSidebar";

const AppModals: React.FC<{ setActiveTab: (tab: ActiveTab) => void }> = ({ setActiveTab }) => {
  const { 
    isSignupModalOpen, 
    closeSignupModal, 
    isLimitModalOpen, 
    closeLimitModal, 
    isStatusModalOpen, 
    closeStatusModal,
    openSignupModal
  } = useCredits();

  return (
    <>
      <SignupGateModal 
        isOpen={isSignupModalOpen} 
        onClose={closeSignupModal} 
      />
      <PlanLimitModal 
        isOpen={isLimitModalOpen} 
        onClose={closeLimitModal} 
        onNavigateToPricing={() => setActiveTab("pricing")} 
      />
      <CreditStatusModal 
        isOpen={isStatusModalOpen} 
        onClose={closeStatusModal} 
        onNavigateToPricing={() => setActiveTab("pricing")} 
        onOpenSignup={openSignupModal} 
      />
    </>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [openAgentCreateModal, setOpenAgentCreateModal] = useState<boolean>(false);
  const [agentSection, setAgentSection] = useState<"home" | "chat" | "voice" | "analyze" | "tasks" | "reports" | "context" | "documents" | "agents" | "settings">("home");
  const [customerAgentSection, setCustomerAgentSection] = useState<any>("overview");
  const [user, setUser] = useState<User | null>(null);

  const handleTriggerCreateAgent = () => {
    setOpenAgentCreateModal(true);
    setActiveTab("agent");
  };

  const handleTriggerCreateCustomerAgent = () => {
    setCustomerAgentSection("overview");
    setActiveTab("customer-agent");
  };
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isReportsLoading, setIsReportsLoading] = useState<boolean>(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  
  // Real saved reports (strictly NO fake or demo data)
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "info" | "warning">("success");

  // Public Agent page / widget query detection
  const [publicAgentId, setPublicAgentId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const q = urlParams.get("publicAgent");
      if (q) return q;
      const match = window.location.pathname.match(/^\/agent\/([^/?#]+)/);
      if (match) return match[1];
    }
    return null;
  });

  const isEmbedMode = Boolean(
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "true"
  );

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const handleSidebarNavigate = (tab: ActiveTab, section?: any) => {
    setActiveTab(tab);
    if (section) {
      if (tab === "customer-agent") {
        setCustomerAgentSection(section);
      } else {
        setAgentSection(section);
      }
    }
  };

  const handleExitPublicAgent = () => {
    setPublicAgentId(null);
    if (typeof window !== "undefined" && window.history?.pushState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("publicAgent");
      url.searchParams.delete("embed");
      window.history.pushState({}, "", url.pathname + (url.search ? url.search : ""));
    }
    setActiveTab("agent");
  };

  // Boot connection check, redirect resolution & Auth subscription
  useEffect(() => {
    testFirestoreConnection();

    // 1. Resolve any in-flight redirect authentication on app load (Requirement 2)
    handleAuthRedirectResult()
      .then((redirectUser) => {
        if (redirectUser) {
          setUser(redirectUser);
          showToast(`Welcome back, ${redirectUser.displayName || redirectUser.email}!`, "success");
        }
      })
      .catch((err) => {
        console.warn("Redirect processing error:", err);
      });

    const unsubAuth = subscribeToAuth(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAuthLoading(false);
      } else {
        // Automatically start or recover anonymous session for onboarding
        try {
          const anonUser = await signInUserAnonymously();
          setUser(anonUser);
        } catch {
          setUser(null);
        } finally {
          setIsAuthLoading(false);
        }
      }
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

  const handleSignIn = () => {
    // 1. Call signInWithGoogle directly with NO await before it (Requirement 1)
    signInWithGoogle()
      .then((loggedUser) => {
        showToast(`Welcome back, ${loggedUser.displayName || loggedUser.email}!`, "success");
      })
      .catch((err: any) => {
        console.error("Login failed:", err);
        if (err?.code === "auth/in-app-browser") {
          showToast("Please open this site in Chrome and try again.", "warning");
        } else if (err?.code !== "auth/popup-closed-by-user") {
          showToast(
            isInAppBrowser()
              ? "Please open this site in Chrome and try again."
              : "Sign in was cancelled or failed.",
            "warning"
          );
        }
      });
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

  if (publicAgentId && isEmbedMode) {
    return (
      <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-center items-center p-2">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="text-xs">Loading assistant...</span>
          </div>
        }>
          <PublicAgentView agentId={publicAgentId} isEmbed={true} />
        </Suspense>
      </div>
    );
  }

  return (
    <LanguageProvider user={user}>
      <CreditsProvider
        user={user}
        onUserChanged={(newUser) => setUser(newUser)}
        onShowToast={showToast}
        onNavigateToPricing={() => setActiveTab("pricing")}
      >
        <div className="min-h-screen text-slate-100 selection:bg-cyan-500 selection:text-slate-950 font-sans relative antialiased">
          {/* Background Elements */}
          <BackgroundElements />

          {/* Main Container Layout */}
          <div className="relative z-10 flex flex-col min-h-screen">
            {/* Header Bar */}
            {!publicAgentId && (
              <Header
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                savedCount={savedItems.length}
                user={user}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
                onCreateAgent={handleTriggerCreateAgent}
                onOpenTools={() => setIsMobileSidebarOpen(true)}
              />
            )}

            {/* Mobile Drawer when on Homepage */}
            {activeTab === "home" && isMobileSidebarOpen && (
              <DashboardSidebar
                activeTab={activeTab}
                currentSection={agentSection}
                onNavigate={handleSidebarNavigate}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
                isMobileOpen={isMobileSidebarOpen}
                onCloseMobile={() => setIsMobileSidebarOpen(false)}
              />
            )}

            {/* Dynamic View Body / Dashboard Layout */}
            {activeTab === "home" ? (
              <main className="flex-1 w-full max-w-md sm:max-w-2xl lg:max-w-6xl mx-auto px-3.5 sm:px-6 pt-3 pb-24">
                <HomeView
                  setActiveTab={setActiveTab}
                  onSaveItem={handleSaveItem}
                  savedItemIds={savedItems.map((i) => i.id)}
                  onCreateAgent={handleTriggerCreateAgent}
                  onCreateCustomerAgent={handleTriggerCreateCustomerAgent}
                />
              </main>
            ) : (
              <div className="flex-1 flex w-full max-w-7xl mx-auto relative">
                {/* Desktop Collapsible Sidebar & Mobile Slide-Over Drawer */}
                {!publicAgentId && (
                  <DashboardSidebar
                    activeTab={activeTab}
                    currentSection={activeTab === "customer-agent" ? customerAgentSection : agentSection}
                    onNavigate={handleSidebarNavigate}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
                    isMobileOpen={isMobileSidebarOpen}
                    onCloseMobile={() => setIsMobileSidebarOpen(false)}
                  />
                )}

                <main className="flex-1 min-w-0 px-3.5 sm:px-6 pt-3 pb-24">
                  {publicAgentId ? (
                    <Suspense fallback={
                      <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-400 gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                        <span className="text-xs">Loading public agent...</span>
                      </div>
                    }>
                      <PublicAgentView
                        agentId={publicAgentId}
                        onBackToApp={handleExitPublicAgent}
                      />
                    </Suspense>
                  ) : (
                    <Suspense fallback={
                      <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-400 gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                        <span className="text-xs">Loading workspace module...</span>
                      </div>
                    }>
                      {activeTab === "agent" && (
                        <BusinessAgentCenter
                          setActiveTab={setActiveTab}
                          onSaveReport={handleSaveItem}
                          initialOpenCreate={openAgentCreateModal}
                          initialSection={agentSection}
                          onSectionChanged={(sec) => setAgentSection(sec)}
                        />
                      )}

                      {activeTab === "customer-agent" && (
                        <CustomerAgentCenter
                          initialSection={customerAgentSection}
                          onSectionChanged={(sec) => setCustomerAgentSection(sec)}
                          setActiveTab={setActiveTab}
                        />
                      )}

                      {activeTab === "traffic" && (
                        <TrafficPerformanceView onSaveItem={handleSaveItem} />
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
                        <BusinessView onSaveItem={handleSaveItem} setActiveTab={setActiveTab} />
                      )}

                      {activeTab === "analysis" && (
                        <MultiLinkPresenceAnalyzer 
                          onSaveReport={handleSaveItem} 
                          savedItemIds={savedItems.map((i) => i.id)} 
                        />
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
                        <PricingView setActiveTab={setActiveTab} />
                      )}
                    </Suspense>
                  )}
                </main>
              </div>
            )}

            {/* Global Modals for Signup Gate & Credits Quota */}
            <AppModals setActiveTab={setActiveTab} />

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
            {!publicAgentId && (
              <BottomNav 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                onNavigateSection={(sec) => {
                  setAgentSection(sec);
                  setActiveTab("agent");
                }}
                currentSection={agentSection}
                onOpenAllTools={() => setIsMobileSidebarOpen(true)}
              />
            )}
          </div>
        </div>
      </CreditsProvider>
    </LanguageProvider>
  );
}
