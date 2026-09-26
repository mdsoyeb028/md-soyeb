import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs,
  getDocFromServer
} from "firebase/firestore";
import { 
  User, 
  signInWithPopup, 
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
import { SavedItem } from "../types";

const LOCAL_STORAGE_KEY = "bge_guest_saved_items";

// Auth Functions
export async function signInWithGoogle(): Promise<User> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const user = cred.user;
    
    // Sync user profile to /users/{uid}
    if (user) {
      const userRef = doc(db, "users", user.uid);
      try {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
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
