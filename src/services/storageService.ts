import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  getDocs,
  getDocFromServer
} from "firebase/firestore";
import { 
  User, 
  signInWithPopup, 
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
import { SavedItem, SubscriptionPlanId, UserCreditsProfile, BusinessAgentConfig, AgentActionTask, BusinessTask } from "../types";
import { getDailyLimitForPlan } from "../data/plans";

const LOCAL_STORAGE_KEY = "bge_guest_saved_items";
const CREDITS_CACHE_KEY = "bge_user_credits_cache";

// Auth Functions

/**
 * Sign in anonymously for onboarding experience.
 * Automatically gives anonymous user 1 free consultation.
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
          plan: "free",
          consultationsUsed: 0,
          queriesUsedToday: 0,
          lastQueryDate: today,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    } catch {
      // Offline fallback: save initial profile
      await setDoc(userRef, {
        uid: user.uid,
        isAnonymous: true,
        plan: "free",
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
 * Standard Sign in with Google (direct sign-in from header/dashboard)
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const user = cred.user;
    
    // Sync user profile to /users/{uid}
    if (user) {
      const userRef = doc(db, "users", user.uid);
      const today = new Date().toISOString().split("T")[0];
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
    return user;
  } catch (err: unknown) {
    console.error("Sign in error:", err);
    throw err;
  }
}

/**
 * Link/Upgrade Anonymous Account to Google.
 * Officially preserves existing UID, first consultation, saved reports, language and profile.
 * If account conflict occurs (Google account already exists), handles safely by signing in and migrating data.
 */
export async function linkAnonymousWithGoogle(): Promise<{ user: User; linked: boolean }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    const user = await signInWithGoogle();
    return { user, linked: false };
  }

  // If already a permanent account, just return it
  if (!currentUser.isAnonymous) {
    return { user: currentUser, linked: true };
  }

  const anonUid = currentUser.uid;

  try {
    // Attempt official account upgrade / linking with popup
    const cred = await linkWithPopup(currentUser, googleProvider);
    const upgradedUser = cred.user;

    const userRef = doc(db, "users", upgradedUser.uid);
    await setDoc(userRef, {
      uid: upgradedUser.uid,
      email: upgradedUser.email || "",
      displayName: upgradedUser.displayName || "",
      photoURL: upgradedUser.photoURL || "",
      isAnonymous: false,
      plan: "free", // after signup, user becomes plan = "free"
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return { user: upgradedUser, linked: true };
  } catch (linkError: any) {
    console.warn("Account link error, checking for existing account conflict:", linkError.code);
    
    // If account already exists with different credential, sign in safely and migrate anonymous consultation data
    if (
      linkError.code === "auth/credential-already-in-use" || 
      linkError.code === "auth/account-exists-with-different-credential" ||
      linkError.code === "auth/email-already-in-use"
    ) {
      const permanentCred = await signInWithPopup(auth, googleProvider);
      const permanentUser = permanentCred.user;

      // Migrate reports and profile from anonymous UID to permanent UID
      await migrateUserData(anonUid, permanentUser.uid);

      return { user: permanentUser, linked: false };
    }
    
    throw linkError;
  }
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
 */
export async function updateUserPlan(userId: string, plan: SubscriptionPlanId): Promise<void> {
  if (!userId) return;
  const userRef = doc(db, "users", userId);
  try {
    await setDoc(userRef, {
      plan,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    throw err;
  }
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
  const agentToSave: BusinessAgentConfig = {
    ...agent,
    userId: user ? user.uid : "guest",
    updatedAt: now,
    createdAt: agent.createdAt || now,
  };

  if (user && user.uid) {
    const docRef = doc(db, "users", user.uid, "agents", agent.id);
    try {
      await setDoc(docRef, agentToSave, { merge: true });
      return { agent: agentToSave, isCloud: true };
    } catch (err: unknown) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/agents/${agent.id}`);
      throw err;
    }
  } else {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_AGENTS_KEY);
      const existing: BusinessAgentConfig[] = raw ? JSON.parse(raw) : [];
      const updated = [agentToSave, ...existing.filter((a) => a.id !== agent.id)];
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
