/**
 * Safe JSON response helper for Agent API endpoints.
 * Protects against unexpected HTML responses (Vercel 404/500/502/SPA fallback),
 * sanitizes response previews, and provides clear, actionable error messages.
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
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
