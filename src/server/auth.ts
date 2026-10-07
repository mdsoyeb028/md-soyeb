import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import firebaseConfig from "../../firebase-applet-config.json" with { type: "json" };
import { SubscriptionPlanId } from "../types.ts";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

/**
 * Initializes and returns the Firebase Admin App instance.
 * Uses FIREBASE_SERVICE_ACCOUNT env variable (a JSON string).
 */
export function getFirebaseAdminApp(): App | null {
  if (adminApp) return adminApp;

  const apps = getApps();
  if (apps.length > 0) {
    adminApp = apps[0];
    return adminApp;
  }

  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountStr) {
    try {
      const serviceAccount = JSON.parse(serviceAccountStr);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || firebaseConfig.projectId,
      });
      return adminApp;
    } catch (err) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", err);
    }
  }

  // Fallback to project ID for development or GCP environment
  try {
    adminApp = initializeApp({
      projectId: firebaseConfig.projectId,
    });
    return adminApp;
  } catch (err) {
    console.warn("Firebase Admin initialized with project config warning:", err);
  }

  return null;
}

export { getFirebaseAdminApp as getFirebaseAdmin };

/**
 * Returns the admin Firestore instance for reading verified user plans.
 */
export function getAdminFirestore(): Firestore | null {
  if (adminDb) return adminDb;
  try {
    const app = getFirebaseAdminApp();
    if (app) {
      const dbId =
        process.env.FIREBASE_DATABASE_ID ||
        firebaseConfig.firestoreDatabaseId ||
        "(default)";
      adminDb =
        dbId && dbId !== "(default)"
          ? getFirestore(app, dbId)
          : getFirestore(app);
      return adminDb;
    }
  } catch (err) {
    console.error("Error initializing Admin Firestore:", err);
  }
  return null;
}

export interface AuthenticatedUser {
  uid: string | null;
  plan: SubscriptionPlanId;
  isGuest: boolean;
  email?: string | null;
}

/**
 * Verifies the Firebase ID token from the "Authorization: Bearer <token>" header.
 * Strictly reads the user's plan from Firestore users/{uid}.plan on the server.
 * Never trusts userId, userPlan or isAnonymous from req.body.
 */
export async function verifyAuthToken(req: any): Promise<AuthenticatedUser> {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;

  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return {
      uid: null,
      plan: "free",
      isGuest: true,
    };
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return {
      uid: null,
      plan: "free",
      isGuest: true,
    };
  }

  try {
    const app = getFirebaseAdminApp();
    if (!app) {
      console.warn("Firebase Admin is not configured. Treating request as unverified guest.");
      return {
        uid: null,
        plan: "free",
        isGuest: true,
      };
    }

    const auth = getAuth(app);
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;
    const isAnonymous = decoded.firebase?.sign_in_provider === "anonymous";

    // Fetch the verified plan directly from Firestore users/{uid}.plan on the server
    let plan: SubscriptionPlanId = "free";
    try {
      const db = getAdminFirestore();
      if (db) {
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const rawPlan = (userData?.plan || "free").toString().toLowerCase();
          const planExpiresAt = userData?.planExpiresAt;

          // Expiry check: if plan is paid but planExpiresAt is in the past, treat plan as "free"
          let isExpired = false;
          if (rawPlan !== "free" && planExpiresAt) {
            const expiryTime = new Date(planExpiresAt).getTime();
            if (!isNaN(expiryTime) && Date.now() > expiryTime) {
              isExpired = true;
            }
          }

          if (!isExpired && ["free", "starter", "business", "pro"].includes(rawPlan)) {
            plan = rawPlan as SubscriptionPlanId;
          } else {
            plan = "free";
          }
        }
      }
    } catch (fsErr) {
      console.warn(`Could not read plan from Firestore for user ${uid}:`, fsErr);
    }

    return {
      uid,
      plan,
      isGuest: isAnonymous,
      email: decoded.email || null,
    };
  } catch (err: unknown) {
    console.warn("Firebase ID token verification failed:", (err as Error)?.message || err);
    return {
      uid: null,
      plan: "free",
      isGuest: true,
    };
  }
}
