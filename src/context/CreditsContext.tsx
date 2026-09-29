import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { User } from "firebase/auth";
import { SubscriptionPlanId, UserCreditsProfile } from "../types";
import { 
  signInUserAnonymously, 
  linkAnonymousWithGoogle, 
  getUserProfile, 
  subscribeToUserProfile, 
  recordConsultationUsed, 
  recordDailyQueryUsed, 
  updateUserPlan 
} from "../services/storageService";
import { CENTRAL_PLANS, getDailyLimitForPlan } from "../data/plans";

export interface CanPerformResult {
  allowed: boolean;
  reason?: "need_signup" | "daily_limit_reached";
}

interface CreditsContextType {
  user: User | null;
  isAnonymous: boolean;
  plan: SubscriptionPlanId;
  consultationsUsed: number;
  queriesUsedToday: number;
  dailyLimit: number;
  creditsRemaining: number;
  creditsDisplay: string;
  badgeLabel: string;
  isInitialLoading: boolean;
  canPerformAIAction: () => CanPerformResult;
  consumeCredit: () => Promise<boolean>;
  ensureAnonymousUser: () => Promise<User>;
  upgradePlan: (newPlan: SubscriptionPlanId) => Promise<void>;
  handleGoogleSignup: () => Promise<void>;
  // Modals
  isSignupModalOpen: boolean;
  openSignupModal: () => void;
  closeSignupModal: () => void;
  isLimitModalOpen: boolean;
  openLimitModal: () => void;
  closeLimitModal: () => void;
  isStatusModalOpen: boolean;
  openStatusModal: () => void;
  closeStatusModal: () => void;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

interface CreditsProviderProps {
  children: ReactNode;
  user: User | null;
  onUserChanged?: (user: User | null) => void;
  onShowToast?: (msg: string, type?: "success" | "info" | "warning") => void;
  onNavigateToPricing?: () => void;
}

export const CreditsProvider: React.FC<CreditsProviderProps> = ({
  children,
  user,
  onUserChanged,
  onShowToast,
  onNavigateToPricing,
}) => {
  const [plan, setPlan] = useState<SubscriptionPlanId>("free");
  const [consultationsUsed, setConsultationsUsed] = useState<number>(0);
  const [queriesUsedToday, setQueriesUsedToday] = useState<number>(0);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Modal states
  const [isSignupModalOpen, setIsSignupModalOpen] = useState<boolean>(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState<boolean>(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);

  const isAnonymous = Boolean(!user || user.isAnonymous);
  const dailyLimit = getDailyLimitForPlan(plan);

  // Sync profile when user changes
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadProfile = async () => {
      if (!user) {
        // No user yet: default state for new visitor (0 consultations used)
        setPlan("free");
        setConsultationsUsed(0);
        setQueriesUsedToday(0);
        setIsInitialLoading(false);
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setPlan(profile.plan || "free");
          setConsultationsUsed(profile.consultationsUsed || 0);
          setQueriesUsedToday(profile.queriesUsedToday || 0);
        } else {
          // New account or first-time
          setPlan("free");
          setConsultationsUsed(0);
          setQueriesUsedToday(0);
        }

        // Real-time listener for profile changes in Firestore
        unsubscribe = subscribeToUserProfile(user.uid, (updatedProfile) => {
          setPlan(updatedProfile.plan || "free");
          setConsultationsUsed(updatedProfile.consultationsUsed || 0);
          setQueriesUsedToday(updatedProfile.queriesUsedToday || 0);
        });
      } catch (err) {
        console.warn("Failed to load user profile in CreditsProvider:", err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadProfile();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Ensure an anonymous Firebase user exists
  const ensureAnonymousUser = useCallback(async (): Promise<User> => {
    if (user) return user;
    try {
      const anonUser = await signInUserAnonymously();
      if (onUserChanged) onUserChanged(anonUser);
      return anonUser;
    } catch (err) {
      console.error("Could not create anonymous user:", err);
      throw err;
    }
  }, [user, onUserChanged]);

  // Compute remaining credits and UI display string
  const creditsRemaining = dailyLimit === Infinity ? Infinity : Math.max(0, dailyLimit - queriesUsedToday);

  let creditsDisplay = "";
  let badgeLabel = "";

  if (isAnonymous) {
    if (consultationsUsed === 0) {
      creditsDisplay = "1 Free Consultation";
      badgeLabel = "1 Free Consultation";
    } else {
      creditsDisplay = "Free Consultation Used";
      badgeLabel = "Consultation Used";
    }
  } else {
    if (dailyLimit === Infinity) {
      creditsDisplay = "Unlimited AI queries today";
      badgeLabel = "PRO • Unlimited";
    } else {
      creditsDisplay = `AI Credits: ${creditsRemaining}/${dailyLimit} today`;
      badgeLabel = `${plan.toUpperCase()} • ${creditsRemaining}/${dailyLimit} today`;
    }
  }

  // Pre-flight check: Can this action run?
  const canPerformAIAction = useCallback((): CanPerformResult => {
    // 1. Unregistered or Anonymous User
    if (!user || user.isAnonymous) {
      // First consultation is free!
      if (consultationsUsed >= 1) {
        // Second consultation: Signup required!
        return { allowed: false, reason: "need_signup" };
      }
      return { allowed: true };
    }

    // 2. Permanent Account: Check daily query limit
    if (dailyLimit !== Infinity && queriesUsedToday >= dailyLimit) {
      return { allowed: false, reason: "daily_limit_reached" };
    }

    return { allowed: true };
  }, [user, consultationsUsed, dailyLimit, queriesUsedToday]);

  // Consume credit after AI success
  const consumeCredit = useCallback(async (): Promise<boolean> => {
    try {
      if (!user || user.isAnonymous) {
        // Anonymous 1st consultation used
        let currentUid = user?.uid;
        if (!currentUid) {
          const freshUser = await ensureAnonymousUser();
          currentUid = freshUser.uid;
        }
        const newCount = await recordConsultationUsed(currentUid);
        setConsultationsUsed(newCount);
        return true;
      }

      // Permanent user daily query
      const { queriesUsedToday: newCount } = await recordDailyQueryUsed(user.uid, plan);
      setQueriesUsedToday(newCount);
      return true;
    } catch (err) {
      console.warn("Failed to record credit consumption:", err);
      // Non-blocking for user experience
      return true;
    }
  }, [user, plan, ensureAnonymousUser]);

  // Upgrade Plan
  const upgradePlan = useCallback(async (newPlan: SubscriptionPlanId) => {
    if (!user || user.isAnonymous) {
      setIsSignupModalOpen(true);
      return;
    }

    try {
      await updateUserPlan(user.uid, newPlan);
      setPlan(newPlan);
      if (onShowToast) {
        onShowToast(`Successfully activated ${CENTRAL_PLANS[newPlan].name} Plan!`, "success");
      }
    } catch (err) {
      console.error("Plan upgrade failed:", err);
      if (onShowToast) {
        onShowToast("Could not update plan. Please try again.", "warning");
      }
      throw err;
    }
  }, [user, onShowToast]);

  // Google Signup / Account Upgrade
  const handleGoogleSignup = useCallback(async () => {
    try {
      const { user: upgradedUser, linked } = await linkAnonymousWithGoogle();
      if (onUserChanged) onUserChanged(upgradedUser);
      setIsSignupModalOpen(false);

      if (linked) {
        if (onShowToast) {
          onShowToast(`Account created! Welcome, ${upgradedUser.displayName || upgradedUser.email}! You now have 10 AI queries/day on Free Plan.`, "success");
        }
      } else {
        if (onShowToast) {
          onShowToast(`Welcome back, ${upgradedUser.displayName || upgradedUser.email}! Your data has been synced to your account.`, "success");
        }
      }
    } catch (err: any) {
      console.error("Signup failed:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        if (onShowToast) {
          onShowToast("Sign up was cancelled or encountered an issue.", "warning");
        }
      }
    }
  }, [onUserChanged, onShowToast]);

  const openSignupModal = () => setIsSignupModalOpen(true);
  const closeSignupModal = () => setIsSignupModalOpen(false);

  const openLimitModal = () => setIsLimitModalOpen(true);
  const closeLimitModal = () => setIsLimitModalOpen(false);

  const openStatusModal = () => setIsStatusModalOpen(true);
  const closeStatusModal = () => setIsStatusModalOpen(false);

  return (
    <CreditsContext.Provider
      value={{
        user,
        isAnonymous,
        plan,
        consultationsUsed,
        queriesUsedToday,
        dailyLimit,
        creditsRemaining,
        creditsDisplay,
        badgeLabel,
        isInitialLoading,
        canPerformAIAction,
        consumeCredit,
        ensureAnonymousUser,
        upgradePlan,
        handleGoogleSignup,
        isSignupModalOpen,
        openSignupModal,
        closeSignupModal,
        isLimitModalOpen,
        openLimitModal,
        closeLimitModal,
        isStatusModalOpen,
        openStatusModal,
        closeStatusModal,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
};

export function useCredits(): CreditsContextType {
  const context = useContext(CreditsContext);
  if (!context) {
    throw new Error("useCredits must be used within a CreditsProvider");
  }
  return context;
}
