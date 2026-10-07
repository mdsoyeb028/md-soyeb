import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs,
  getDoc,
  getDocFromServer
} from "firebase/firestore";
import { 
  User, 
  GoogleAuthProvider,
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  signInAnonymously,
  linkWithPopup,
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  auth, 
  db, 
  googleProvider, 
  handleFirestoreError, 
  OperationType 
} from "../firebase";
import { SavedItem, SubscriptionPlanId, UserCreditsProfile, BusinessAgentConfig, AgentActionTask, BusinessTask, AgentConversation } from "../types";
import { getDailyLimitForPlan } from "../data/plans";

const LOCAL_STORAGE_KEY = "bge_guest_saved_items";
const CREDITS_CACHE_KEY = "bge_user_credits_cache";

/**
 * Detects if the current browser environment is an in-app webview (WhatsApp, Instagram, Facebook, etc.)
 */
export function isInAppBrowser(): boolean {
  if (typeof window === "undefined" || !navigator?.userAgent) return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
  return /FBAN|FBAV|Instagram|WhatsApp|Line\/|MicroMessenger|musical_ly|Twitter|LinkedInApp|Snapchat/i.test(ua);
}

/**
 * Detects if the current device is a mobile browser.
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined" || !navigator?.userAgent) return false;
  const ua = navigator.userAgent;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || 
    (typeof window.innerWidth === "number" && window.innerWidth <= 768 && "ontouchstart" in window);
}

/**
 * Checks if error was caused by popup blocker or user dismissal.
 */
export function isPopupFailureError(err: any): boolean {
  if (!err) return false;
  const code = err.code || "";
  return (
    code === "auth/popup-blocked" ||
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request" ||
    code === "auth/operation-not-supported-in-this-environment"
  );
}

export const IN_APP_BROWSER_NOTICE =
  "Please open this site in Chrome and try again.";

/**
 * Helper to sync user profile document to /users/{uid}.
 * Never writes the "plan" field to Firestore from the client (Requirement 6).
 */
export async function syncUserProfile(user: User): Promise<void> {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  try {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      isAnonymous: false,
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }
}

// Auth Functions

/**
 * Sign in anonymously for onboarding experience.
 * Automatically gives anonymous user 1 free consultation.
 * Never writes the "plan" field from the client.
 */
export async function signInUserAnonymously(): Promise<User> {
  try {
    const cred = await signInAnonymously(auth);
    const user = cred.user;

    const userRef = doc(db, "users", user.uid);
    const today = new Date().toISOString().split("T")[0];

    try {
      const snap = await getDocFromServer(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          isAnonymous: true,
          consultationsUsed: 0,
          queriesUsedToday: 0,
          lastQueryDate: today,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    } catch {
      // Offline fallback: save initial profile without plan field
      await setDoc(userRef, {
        uid: user.uid,
        isAnonymous: true,
        consultationsUsed: 0,
        queriesUsedToday: 0,
        lastQueryDate: today,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(() => {});
    }

    return user;
  } catch (err: unknown) {
    console.error("Anonymous sign-in error:", err);
    throw err;
  }
}

/**
 * Standard Sign in with Google:
 * 1. Called synchronously as first action with NO await before it.
 * 2. Mobile devices and in-app browsers use signInWithRedirect directly instead of popup (Requirement 3).
 * 3. Desktop attempts signInWithPopup; if popup fails (popup-blocked, popup-closed-by-user, cancelled-popup-request),
 *    automatically falls back to signInWithRedirect (Requirement 2).
 */
export function signInWithGoogle(): Promise<User> {
  if (isInAppBrowser()) {
    return signInWithRedirect(auth, googleProvider).then(() => {
      return new Promise<User>(() => {});
    }).catch((err) => {
      console.warn("In-app browser redirect warning:", err);
      const friendlyErr = new Error("Please open this site in Chrome and try again.");
      (friendlyErr as any).code = "auth/in-app-browser";
      throw friendlyErr;
    });
  }

  // Mobile devices: use signInWithRedirect directly instead of popup (Requirement 3)
  if (isMobileDevice()) {
    return signInWithRedirect(auth, googleProvider).then(() => {
      return new Promise<User>(() => {});
    });
  }

  // Desktop: Call signInWithPopup as the first action directly with NO await before it (Requirement 1)
  return signInWithPopup(auth, googleProvider)
    .then(async (cred) => {
      await syncUserProfile(cred.user);
      return cred.user;
    })
    .catch(async (err: any) => {
      console.warn("signInWithPopup failed, testing fallback:", err.code);

      // If popup fails, automatically fall back to signInWithRedirect (Requirement 2)
      if (isPopupFailureError(err)) {
        await signInWithRedirect(auth, googleProvider);
        return new Promise<User>(() => {});
      }

      throw err;
    });
}

/**
 * Link/Upgrade Anonymous Account to Google:
 * 1. Synchronously calls linkWithPopup as first action directly inside click handler with NO await before it (Requirement 1).
 * 2. Mobile devices and in-app browsers use signInWithRedirect directly instead of popup (Requirement 3).
 * 3. If linking fails with auth/credential-already-in-use, uses GoogleAuthProvider.credentialFromError(error)
 *    and signInWithCredential to sign in with the existing account instead of showing an error (Requirement 4).
 * 4. If popup fails (popup-blocked, popup-closed-by-user, cancelled-popup-request), automatically falls back to signInWithRedirect (Requirement 2).
 * 5. Never writes the "plan" field to Firestore users/{uid} from the client (Requirement 6).
 */
export function linkAnonymousWithGoogle(): Promise<{ user: User; linked: boolean }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return signInWithGoogle().then((user) => ({ user, linked: false }));
  }

  // If already a permanent account, just return it
  if (!currentUser.isAnonymous) {
    return Promise.resolve({ user: currentUser, linked: true });
  }

  const anonUid = currentUser.uid;

  if (isInAppBrowser()) {
    sessionStorage.setItem("pending_migrate_anon_uid", anonUid);
    return signInWithRedirect(auth, googleProvider).then(() => {
      return new Promise<{ user: User; linked: boolean }>(() => {});
    }).catch((err) => {
      console.warn("In-app browser redirect warning:", err);
      const friendlyErr = new Error("Please open this site in Chrome and try again.");
      (friendlyErr as any).code = "auth/in-app-browser";
      throw friendlyErr;
    });
  }

  // Mobile devices: use signInWithRedirect directly instead of popup (Requirement 3)
  if (isMobileDevice()) {
    sessionStorage.setItem("pending_migrate_anon_uid", anonUid);
    return signInWithRedirect(auth, googleProvider).then(() => {
      return new Promise<{ user: User; linked: boolean }>(() => {});
    });
  }

  // Desktop: Call linkWithPopup as FIRST ACTION directly with NO await before it (Requirement 1)
  return linkWithPopup(currentUser, googleProvider)
    .then(async (cred) => {
      await syncUserProfile(cred.user);
      return { user: cred.user, linked: true };
    })
    .catch(async (error: any) => {
      console.warn("linkWithPopup encountered error:", error.code);

      // Requirement 4: If linking an anonymous user fails with auth/credential-already-in-use,
      // use GoogleAuthProvider.credentialFromError(error) and signInWithCredential to sign in with the existing account instead of showing an error.
      if (
        error.code === "auth/credential-already-in-use" ||
        error.code === "auth/account-exists-with-different-credential" ||
        error.code === "auth/email-already-in-use"
      ) {
        const credential = GoogleAuthProvider.credentialFromError(error);
        if (credential) {
          try {
            const cred = await signInWithCredential(auth, credential);
            await syncUserProfile(cred.user);
            await migrateUserData(anonUid, cred.user.uid);
            return { user: cred.user, linked: false };
          } catch (credErr) {
            console.error("signInWithCredential fallback failed:", credErr);
          }
        }
      }

      // Requirement 2: If the popup fails (popup-blocked, popup-closed-by-user, or cancelled-popup-request),
      // automatically fall back to signInWithRedirect and handle the result with getRedirectResult on app load.
      if (isPopupFailureError(error)) {
        sessionStorage.setItem("pending_migrate_anon_uid", anonUid);
        await signInWithRedirect(auth, googleProvider);
        return new Promise<{ user: User; linked: boolean }>(() => {});
      }

      throw error;
    });
}

/**
 * Handle redirect result on app load (Requirement 2).
 * Recovers signed-in user and migrates anonymous data if redirect flow was used.
 */
export async function handleAuthRedirectResult(): Promise<User | null> {
  try {
    const cred = await getRedirectResult(auth);
    if (cred && cred.user) {
      const user = cred.user;
      await syncUserProfile(user);

      const pendingAnonUid = sessionStorage.getItem("pending_migrate_anon_uid");
      if (pendingAnonUid && pendingAnonUid !== user.uid) {
        await migrateUserData(pendingAnonUid, user.uid);
        sessionStorage.removeItem("pending_migrate_anon_uid");
      }
      return user;
    }
  } catch (error: any) {
    console.warn("getRedirectResult error:", error?.code, error?.message);

    // If redirect linking failed with credential-already-in-use (Requirement 4):
    if (
      error.code === "auth/credential-already-in-use" ||
      error.code === "auth/account-exists-with-different-credential" ||
      error.code === "auth/email-already-in-use"
    ) {
      const credential = GoogleAuthProvider.credentialFromError(error);
      if (credential) {
        try {
          const cred = await signInWithCredential(auth, credential);
          await syncUserProfile(cred.user);
          const pendingAnonUid = sessionStorage.getItem("pending_migrate_anon_uid");
          if (pendingAnonUid && pendingAnonUid !== cred.user.uid) {
            await migrateUserData(pendingAnonUid, cred.user.uid);
            sessionStorage.removeItem("pending_migrate_anon_uid");
          }
          return cred.user;
        } catch (credErr) {
          console.error("Redirect credential sign in failed:", credErr);
        }
      }
    }
  }
  return null;
}

/**
 * Migrate reports and settings from source anonymous UID to permanent UID
 */
export async function migrateUserData(sourceUid: string, targetUid: string): Promise<void> {
  if (!sourceUid || !targetUid || sourceUid === targetUid) return;

  try {
    // 1. Fetch reports from source anonymous user
    const sourceCol = collection(db, "users", sourceUid, "reports");
    const snap = await getDocs(sourceCol);

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const targetDocRef = doc(db, "users", targetUid, "reports", docSnap.id);
      await setDoc(targetDocRef, {
        ...data,
        userId: targetUid,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    // 2. Fetch language & profile preferences from anonymous user
    const sourceProfileRef = doc(db, "users", sourceUid);
    const sourceSnap = await getDocFromServer(sourceProfileRef);
    if (sourceSnap.exists()) {
      const sData = sourceSnap.data();
      const targetProfileRef = doc(db, "users", targetUid);
      await setDoc(targetProfileRef, {
        preferredLanguage: sData.preferredLanguage || undefined,
        consultationsUsed: sData.consultationsUsed || 1,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err) {
    console.warn("Migration warning (handled non-fatally):", err);
  }
}

/**
 * Fetch User Profile with Credits & Plan details
 */
export async function getUserProfile(userId: string): Promise<UserCreditsProfile | null> {
  if (!userId) return null;
  const today = new Date().toISOString().split("T")[0];

  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDocFromServer(userRef);

    if (snap.exists()) {
      const data = snap.data();
      const lastQueryDate = data.lastQueryDate || today;
      // Daily reset: if last query date is not today, queries used today is 0
      const queriesUsedToday = (lastQueryDate === today) ? Number(data.queriesUsedToday || 0) : 0;
      const plan = (data.plan as SubscriptionPlanId) || "free";

      const profile: UserCreditsProfile = {
        uid: userId,
        email: data.email || null,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        plan,
        planExpiresAt: data.planExpiresAt || null,
        planPeriod: data.planPeriod || null,
        lastPaymentId: data.lastPaymentId || null,
        isAnonymous: Boolean(data.isAnonymous),
        consultationsUsed: Number(data.consultationsUsed || 0),
        queriesUsedToday,
        lastQueryDate,
        preferredLanguage: data.preferredLanguage || undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };

      try {
        localStorage.setItem(CREDITS_CACHE_KEY, JSON.stringify(profile));
      } catch {}

      return profile;
    }
  } catch (err) {
    console.warn("Could not fetch remote user profile, checking local cache:", err);
  }

  // Fallback to local cache
  try {
    const raw = localStorage.getItem(CREDITS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.uid === userId) return parsed;
    }
  } catch {}

  return null;
}

/**
 * Real-time listener for User Profile updates
 */
export function subscribeToUserProfile(
  userId: string,
  onUpdate: (profile: UserCreditsProfile) => void
): () => void {
  if (!userId) return () => {};

  const userRef = doc(db, "users", userId);
  const today = new Date().toISOString().split("T")[0];

  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const lastQueryDate = data.lastQueryDate || today;
      const queriesUsedToday = (lastQueryDate === today) ? Number(data.queriesUsedToday || 0) : 0;
      const plan = (data.plan as SubscriptionPlanId) || "free";

      const profile: UserCreditsProfile = {
        uid: userId,
        email: data.email || null,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        plan,
        planExpiresAt: data.planExpiresAt || null,
        planPeriod: data.planPeriod || null,
        lastPaymentId: data.lastPaymentId || null,
        isAnonymous: Boolean(data.isAnonymous),
        consultationsUsed: Number(data.consultationsUsed || 0),
        queriesUsedToday,
        lastQueryDate,
        preferredLanguage: data.preferredLanguage || undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      onUpdate(profile);
    }
  });
}

/**
 * Record 1 Consultation Used (for anonymous user)
 */
export async function recordConsultationUsed(userId: string): Promise<number> {
  if (!userId) return 1;
  const userRef = doc(db, "users", userId);
  const now = new Date().toISOString();

  let count = 1;
  try {
    const snap = await getDocFromServer(userRef);
    if (snap.exists()) {
      count = Number(snap.data().consultationsUsed || 0) + 1;
    }
  } catch {}

  try {
    await setDoc(userRef, {
      consultationsUsed: count,
      updatedAt: now,
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }

  return count;
}

/**
 * Record 1 Daily Query Used (for authenticated user across any AI tool)
 * Enforces calendar date reset and computes remaining credits.
 */
export async function recordDailyQueryUsed(
  userId: string, 
  plan: SubscriptionPlanId
): Promise<{ queriesUsedToday: number; creditsRemaining: number }> {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();
  const limit = getDailyLimitForPlan(plan);

  let queriesUsedToday = 1;

  if (userId) {
    const userRef = doc(db, "users", userId);
    try {
      const snap = await getDocFromServer(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.lastQueryDate === today) {
          queriesUsedToday = Number(data.queriesUsedToday || 0) + 1;
        } else {
          queriesUsedToday = 1;
        }
      }

      await setDoc(userRef, {
        queriesUsedToday,
        lastQueryDate: today,
        updatedAt: now,
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  }

  const creditsRemaining = limit === Infinity ? Infinity : Math.max(0, limit - queriesUsedToday);
  return { queriesUsedToday, creditsRemaining };
}

/**
 * Update User Subscription Plan (e.g. Starter, Business, Pro, Free)
 * NOTE: Requirement 6 - Never write the "plan" field to Firestore users/{uid} from the client.
 * Server-side Admin SDK and secure billing webhooks strictly manage subscription tiers.
 */
export async function updateUserPlan(userId: string, plan: SubscriptionPlanId): Promise<void> {
  if (!userId) return;
  // Intentionally does not write the "plan" field to Firestore users/{uid} from the client.
}

export async function updateUserLanguagePreference(userId: string, languageCode: string): Promise<void> {
  if (!userId || !languageCode) return;
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      preferredLanguage: languageCode,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error("Failed to update user language in Firestore:", err);
  }
}

export async function getUserLanguagePreference(userId: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDocFromServer(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return (data?.preferredLanguage as string) || null;
    }
  } catch (err) {
    // Non-blocking error if offline or permissions issue
    console.warn("Could not fetch remote user language preference:", err);
  }
  return null;
}

export async function logOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Sign out error:", err);
    throw err;
  }
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}

// Subscribe to real-time reports from Firestore for authenticated user
export function subscribeToUserReports(
  userId: string,
  onData: (items: SavedItem[]) => void,
  onError: (err: Error) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const reportsColRef = collection(db, "users", userId, "reports");
  const reportsQuery = query(reportsColRef, orderBy("createdAt", "desc"));

  const unsubscribe = onSnapshot(
    reportsQuery,
    (snapshot) => {
      const items: SavedItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          userId: data.userId || userId,
          type: data.type || "business",
          title: data.title || "Untitled Report",
          summary: data.summary || "",
          input: data.input || undefined,
          context: data.context || undefined,
          result: data.result || undefined,
          content: data.content || "",
          category: data.category || undefined,
          tags: Array.isArray(data.tags) ? data.tags : [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || undefined,
        });
      });
      onData(items);
    },
    (error) => {
      const errInfo = handleFirestoreError(error, OperationType.LIST, `users/${userId}/reports`);
      onError(new Error(errInfo.error));
    }
  );

  return unsubscribe;
}

// Save Report directly to Firestore if authenticated, or guest storage if offline
export async function saveReport(
  itemData: Omit<SavedItem, "id" | "createdAt">,
  user: User | null,
  customId?: string
): Promise<{ item: SavedItem; isCloud: boolean }> {
  const now = new Date().toISOString();
  const reportId = customId || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Defensive formatting to prevent exceeding blueprint constraints
  const title = (itemData.title || "Untitled Intelligence Brief").slice(0, 500);
  const summary = (itemData.summary || "").slice(0, 1000);
  const category = (itemData.category || "General").slice(0, 100);
  const type = itemData.type || "business";

  const newReport: SavedItem = {
    ...itemData,
    id: reportId,
    userId: user ? user.uid : "guest",
    type,
    title,
    summary,
    category,
    createdAt: now,
    updatedAt: now,
  };

  if (user && user.uid) {
    const docRef = doc(db, "users", user.uid, "reports", reportId);
    try {
      await setDoc(docRef, {
        id: reportId,
        userId: user.uid,
        type,
        title,
        summary,
        input: itemData.input || {},
        context: (itemData.context || "").slice(0, 2000),
        result: itemData.result || {},
        content: typeof itemData.content === "string" ? itemData.content.slice(0, 50000) : itemData.content,
        category,
        tags: Array.isArray(itemData.tags) ? itemData.tags.slice(0, 10) : [],
        createdAt: now,
        updatedAt: now,
      });
      return { item: newReport, isCloud: true };
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/reports/${reportId}`);
      throw err;
    }
  } else {
    // Guest fallback in localStorage so actions are never lost for an unauthenticated user
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const existing: SavedItem[] = raw ? JSON.parse(raw) : [];
      const updated = [newReport, ...existing.filter((i) => i.id !== reportId)];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn("Guest storage write failed:", err);
    }
    return { item: newReport, isCloud: false };
  }
}

// Delete Report from Firestore or guest storage
export async function deleteReport(reportId: string, user: User | null): Promise<boolean> {
  if (user && user.uid) {
    const docRef = doc(db, "users", user.uid, "reports", reportId);
    try {
      await deleteDoc(docRef);
      return true;
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/reports/${reportId}`);
      throw err;
    }
  } else {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const existing: SavedItem[] = JSON.parse(raw);
        const filtered = existing.filter((i) => i.id !== reportId);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      }
      return true;
    } catch (err) {
      console.warn("Guest storage delete failed:", err);
      return false;
    }
  }
}

// Load guest items when unauthenticated
export function loadGuestReports(): SavedItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const LOCAL_STORAGE_AGENTS_KEY = "bge_guest_business_agents";
const LOCAL_STORAGE_TASKS_KEY = "bge_guest_agent_tasks";

// Save Business Agent to Firestore or guest storage
export async function saveBusinessAgent(
  agent: BusinessAgentConfig,
  user: User | null
): Promise<{ agent: BusinessAgentConfig; isCloud: boolean }> {
  const now = new Date().toISOString();
  const agentId = agent.id || agent.agentId || `agent_${Date.now()}`;
  const businessName = agent.businessName || agent.name || "My Business Agent";
  const country = agent.country || "";
  const city = agent.city || "";
  const location = agent.location || (city && country ? `${city}, ${country}` : city || country || "Global");

  const agentToSave: BusinessAgentConfig = {
    ...agent,
    id: agentId,
    agentId: agentId,
    userId: user ? user.uid : "guest",
    name: businessName,
    businessName: businessName,
    industry: agent.industry || "General Business",
    country,
    city,
    location,
    website: agent.website || "",
    productsServices: agent.productsServices || "",
    targetCustomers: agent.targetCustomers || "",
    description: agent.description || agent.businessDescription || "",
    businessDescription: agent.businessDescription || agent.description || "",
    businessGoals: agent.businessGoals || "",
    preferredLanguage: agent.preferredLanguage || "Auto / Same as user",
    brandTone: agent.brandTone || "Professional, direct and helpful",
    socialUrls: agent.socialUrls || agent.socialLinks || [],
    socialLinks: agent.socialLinks || agent.socialUrls || [],
    youtubeLink: agent.youtubeLink || (agent.youtubeLinks && agent.youtubeLinks[0]) || "",
    youtubeLinks: agent.youtubeLinks || (agent.youtubeLink ? [agent.youtubeLink] : []),
    appLink: agent.appLink || (agent.appLinks && agent.appLinks[0]) || "",
    appLinks: agent.appLinks || (agent.appLink ? [agent.appLink] : []),
    customInstructions: agent.customInstructions || agent.additionalInstructions || "",
    additionalInstructions: agent.additionalInstructions || agent.customInstructions || "",
    status: agent.status || "active",
    isPublic: Boolean(agent.isPublic ?? false),
    publicDescription: agent.publicDescription || "",
    lastActivityAt: agent.lastActivityAt || now,
    updatedAt: now,
    createdAt: agent.createdAt || now,
  };

  if (user && user.uid) {
    const docRef = doc(db, "users", user.uid, "agents", agentId);
    try {
      await setDoc(docRef, agentToSave, { merge: true });

      // Synchronize controlled public collection if enabled
      const publicDocRef = doc(db, "public_agents", agentId);
      if (agentToSave.isPublic) {
        // Only explicitly approved public fields are written
        const publicSafeData = {
          id: agentId,
          agentId: agentId,
          userId: user.uid,
          name: agentToSave.name,
          businessName: agentToSave.businessName,
          industry: agentToSave.industry,
          country: agentToSave.country || "",
          city: agentToSave.city || "",
          location: agentToSave.location || "Global",
          website: agentToSave.website || "",
          productsServices: agentToSave.productsServices || "",
          description: agentToSave.publicDescription || agentToSave.description || "",
          publicDescription: agentToSave.publicDescription || agentToSave.description || "",
          preferredLanguage: agentToSave.preferredLanguage || "English",
          brandTone: agentToSave.brandTone || "Professional, direct and helpful",
          isPublic: true,
          updatedAt: now,
          createdAt: agentToSave.createdAt || now,
        };
        await setDoc(publicDocRef, publicSafeData, { merge: true });
      } else {
        // If made private, remove from public_agents immediately
        try {
          await deleteDoc(publicDocRef);
        } catch {
          // ignore if document was not previously public
        }
      }

      return { agent: agentToSave, isCloud: true };
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/agents/${agentId}`);
      throw err;
    }
  } else {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_AGENTS_KEY);
      const existing: BusinessAgentConfig[] = raw ? JSON.parse(raw) : [];
      const updated = [agentToSave, ...existing.filter((a) => a.id !== agentId)];
      localStorage.setItem(LOCAL_STORAGE_AGENTS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn("Guest agent storage write failed:", err);
    }
    return { agent: agentToSave, isCloud: false };
  }
}

// Delete Business Agent from Firestore or guest storage
export async function deleteBusinessAgent(agentId: string, user: User | null): Promise<boolean> {
  if (user && user.uid) {
    const docRef = doc(db, "users", user.uid, "agents", agentId);
    try {
      await deleteDoc(docRef);
      try {
        const publicDocRef = doc(db, "public_agents", agentId);
        await deleteDoc(publicDocRef);
      } catch {
        // ignore
      }
      return true;
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/agents/${agentId}`);
      throw err;
    }
  } else {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_AGENTS_KEY);
      if (raw) {
        const existing: BusinessAgentConfig[] = JSON.parse(raw);
        localStorage.setItem(LOCAL_STORAGE_AGENTS_KEY, JSON.stringify(existing.filter((a) => a.id !== agentId)));
      }
      return true;
    } catch {
      return false;
    }
  }
}

// Controlled Public Agent Retrieval (returns public agent config or null)
export async function getPublicBusinessAgent(agentId: string): Promise<BusinessAgentConfig | null> {
  if (!agentId) return null;

  // 1. Check guest local storage (for owner testing link locally)
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AGENTS_KEY);
    if (raw) {
      const all: BusinessAgentConfig[] = JSON.parse(raw);
      const found = all.find((a) => (a.id === agentId || a.agentId === agentId) && a.isPublic);
      if (found) return found;
    }
  } catch {
    // ignore
  }

  // 2. Fetch from Firestore public_agents collection
  try {
    const docRef = doc(db, "public_agents", agentId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.isPublic) {
        return data as BusinessAgentConfig;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch public agent from Firestore:", err);
  }

  return null;
}

// Delete Agent Task from Firestore or guest storage
export async function deleteAgentTask(taskId: string, user: User | null): Promise<boolean> {
  if (user && user.uid) {
    const docRef = doc(db, "users", user.uid, "tasks", taskId);
    try {
      await deleteDoc(docRef);
      return true;
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/tasks/${taskId}`);
      throw err;
    }
  } else {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
      if (raw) {
        const existing: AgentActionTask[] = JSON.parse(raw);
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(existing.filter((t) => t.id !== taskId)));
      }
      return true;
    } catch {
      return false;
    }
  }
}

// Subscribe to User's Business Agents in Firestore
export function subscribeToBusinessAgents(
  userId: string,
  onUpdate: (agents: BusinessAgentConfig[]) => void
): () => void {
  const colRef = collection(db, "users", userId, "agents");
  return onSnapshot(
    colRef,
    (snapshot) => {
      const agents: BusinessAgentConfig[] = snapshot.docs.map((docSnap) => docSnap.data() as BusinessAgentConfig);
      onUpdate(agents);
    },
    (err) => {
      console.warn("Failed to subscribe to agents:", err);
    }
  );
}

// Load Guest Business Agents from localStorage
export function loadGuestBusinessAgents(): BusinessAgentConfig[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AGENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
export const loadBusinessAgents = loadGuestBusinessAgents;

// Save or Update Agent Task with lifecycle status
export async function saveAgentTask(
  task: AgentActionTask,
  user: User | null
): Promise<{ task: AgentActionTask; isCloud: boolean }> {
  const now = new Date().toISOString();
  const taskToSave: AgentActionTask = {
    ...task,
    userId: user ? user.uid : "guest",
    updatedAt: now,
    createdAt: task.createdAt || now,
  };

  if (user && user.uid) {
    const docRef = doc(db, "users", user.uid, "tasks", task.id);
    try {
      await setDoc(docRef, taskToSave, { merge: true });
      return { task: taskToSave, isCloud: true };
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/tasks/${task.id}`);
      throw err;
    }
  } else {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
      const existing: AgentActionTask[] = raw ? JSON.parse(raw) : [];
      const updated = [taskToSave, ...existing.filter((t) => t.id !== task.id)];
      localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn("Guest task storage write failed:", err);
    }
    return { task: taskToSave, isCloud: false };
  }
}

// Subscribe to User's Tasks in Firestore
export function subscribeToAgentTasks(
  userId: string,
  onUpdate: (tasks: AgentActionTask[]) => void
): () => void {
  const colRef = collection(db, "users", userId, "tasks");
  return onSnapshot(
    colRef,
    (snapshot) => {
      const tasks: AgentActionTask[] = snapshot.docs.map((docSnap) => docSnap.data() as AgentActionTask);
      onUpdate(tasks);
    },
    (err) => {
      console.warn("Failed to subscribe to tasks:", err);
    }
  );
}

// Load Guest Agent Tasks from localStorage
export function loadGuestAgentTasks(): AgentActionTask[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const LOCAL_STORAGE_CONVERSATIONS_KEY_PREFIX = "bge_guest_convos_";

// Save or Update Agent Conversation
export async function saveAgentConversation(
  conversation: AgentConversation,
  user: User | null
): Promise<boolean> {
  const now = new Date().toISOString();
  const convoToSave: AgentConversation = {
    ...conversation,
    updatedAt: now,
    createdAt: conversation.createdAt || now,
  };

  if (user && user.uid) {
    const docRef = doc(db, "users", user.uid, "agents", conversation.agentId, "conversations", conversation.id);
    try {
      await setDoc(docRef, convoToSave, { merge: true });
      return true;
    } catch (err) {
      console.warn("Firestore conversation write failed:", err);
      return false;
    }
  } else {
    try {
      const key = `${LOCAL_STORAGE_CONVERSATIONS_KEY_PREFIX}${conversation.agentId}`;
      const raw = localStorage.getItem(key);
      const existing: AgentConversation[] = raw ? JSON.parse(raw) : [];
      const updated = [convoToSave, ...existing.filter((c) => c.id !== conversation.id)];
      localStorage.setItem(key, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  }
}

// Delete Agent Conversation
export async function deleteAgentConversation(
  agentId: string,
  conversationId: string,
  user: User | null
): Promise<boolean> {
  if (user && user.uid) {
    const docRef = doc(db, "users", user.uid, "agents", agentId, "conversations", conversationId);
    try {
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.warn("Firestore conversation delete failed:", err);
      return false;
    }
  } else {
    try {
      const key = `${LOCAL_STORAGE_CONVERSATIONS_KEY_PREFIX}${agentId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const existing: AgentConversation[] = JSON.parse(raw);
        localStorage.setItem(key, JSON.stringify(existing.filter((c) => c.id !== conversationId)));
      }
      return true;
    } catch {
      return false;
    }
  }
}

// Subscribe to Conversations for a specific Agent
export function subscribeToAgentConversations(
  userId: string,
  agentId: string,
  onUpdate: (convos: AgentConversation[]) => void
): () => void {
  const colRef = collection(db, "users", userId, "agents", agentId, "conversations");
  return onSnapshot(
    colRef,
    (snapshot) => {
      const convos: AgentConversation[] = snapshot.docs.map((docSnap) => docSnap.data() as AgentConversation);
      // Sort newest first
      convos.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      onUpdate(convos);
    },
    (err) => {
      console.warn("Failed to subscribe to conversations:", err);
    }
  );
}

// Load Guest Conversations for a specific Agent
export function loadGuestAgentConversations(agentId: string): AgentConversation[] {
  try {
    const key = `${LOCAL_STORAGE_CONVERSATIONS_KEY_PREFIX}${agentId}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

