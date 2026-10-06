import { auth } from "../firebase.ts";

/**
 * Returns authorization headers with Firebase ID token if user is signed in.
 */
export async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    }
  } catch (err) {
    console.warn("Could not retrieve Firebase ID token:", err);
  }
  return {};
}

/**
 * Fetch wrapper that guarantees the Firebase ID token is sent in the Authorization header.
 */
export async function authFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const authHeaders = await getAuthHeader();
  const mergedHeaders = new Headers(options?.headers || {});

  if (authHeaders.Authorization && !mergedHeaders.has("Authorization")) {
    mergedHeaders.set("Authorization", authHeaders.Authorization);
  }

  return fetch(url, {
    ...options,
    headers: mergedHeaders,
  });
}

/**
 * Safe JSON response helper for Agent API endpoints.
 * Protects against unexpected HTML responses (Vercel 404/500/502/SPA fallback),
 * sanitizes response previews, attaches Firebase ID token, and provides clear, actionable error messages.
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await authFetch(url, options);
  } catch (netErr: any) {
    throw new Error(netErr?.message || "Network request failed. Please check your internet connection.");
  }

  const contentType = (res.headers.get("content-type") || "").toLowerCase();

  // 1. If JSON, parse safely
  if (contentType.includes("application/json") || contentType.includes("+json")) {
    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Agent API returned invalid JSON (HTTP ${res.status}).`);
    }

    if (!res.ok) {
      const errorMsg = data?.message || data?.error || `API request failed with HTTP ${res.status}.`;
      const err = new Error(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
      (err as any).data = data;
      (err as any).status = res.status;
      throw err;
    }

    return data as T;
  }

  // 2. If non-JSON, read response text and create a sanitized preview
  let rawText = "";
  try {
    rawText = await res.text();
  } catch {
    rawText = "";
  }

  const sanitizedPreview = rawText
    .replace(/<[^>]*>/g, " ") // Strip HTML tags
    .replace(/\s+/g, " ")     // Collapse whitespace
    .trim()
    .slice(0, 120);

  const previewSnippet = sanitizedPreview ? ` Preview: "${sanitizedPreview}"` : "";
  const errorMessage = `Agent API returned a non-JSON response. HTTP ${res.status}.${previewSnippet}`;
  const errorObj = new Error(errorMessage);
  (errorObj as any).status = res.status;
  (errorObj as any).rawText = rawText;
  throw errorObj;
}

// Global fetch interceptor ensuring every /api/ai/* fetch across the frontend sends Firebase ID token
if (typeof window !== "undefined" && !(window as any).__fetchAuthInterceptorInstalled) {
  (window as any).__fetchAuthInterceptorInstalled = true;
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const urlString =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    if (urlString && urlString.includes("/api/ai")) {
      const hasAuth =
        init?.headers &&
        ((init.headers instanceof Headers && init.headers.has("Authorization")) ||
          (Array.isArray(init.headers) &&
            init.headers.some(([k]) => k.toLowerCase() === "authorization")) ||
          (typeof init.headers === "object" &&
            Object.keys(init.headers).some((k) => k.toLowerCase() === "authorization")));

      if (!hasAuth) {
        try {
          const user = auth.currentUser;
          if (user) {
            const token = await user.getIdToken();
            if (token) {
              const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : {}));
              headers.set("Authorization", `Bearer ${token}`);
              return originalFetch.call(this, input, { ...init, headers });
            }
          }
        } catch {
          // Continue with original request if token generation fails
        }
      }
    }
    return originalFetch.call(this, input, init);
  };
}
