/**
 * Robust error normalization utility to guarantee clean, human-readable error messages.
 * Prevents raw JavaScript object strings like "[object Object]" from ever reaching the UI.
 */
export function normalizeErrorMessage(
  error: unknown,
  fallbackMessage = "An unexpected error occurred. Please try again."
): string {
  if (error === null || error === undefined) {
    return fallbackMessage;
  }

  // 1. Direct string handling
  if (typeof error === "string") {
    let trimmed = error.trim();
    if (!trimmed || trimmed === "[object Object]") {
      return fallbackMessage;
    }
    if (trimmed.includes("[object Object]")) {
      trimmed = trimmed.replace(/\[object Object\]/g, "").trim();
      if (!trimmed) return fallbackMessage;
    }
    // Check if the string is stringified JSON
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeErrorMessage(parsed, fallbackMessage);
      } catch {
        // If not valid JSON, use the trimmed string
      }
    }
    return trimmed;
  }

  // 2. Error instance handling
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "The request timed out. Please try again in a few moments.";
    }
    if (error.message && typeof error.message === "string") {
      const msg = error.message.trim();
      if (msg && msg !== "[object Object]") {
        // Check if message itself is serialized JSON
        if (msg.startsWith("{") && msg.endsWith("}")) {
          try {
            const parsed = JSON.parse(msg);
            return normalizeErrorMessage(parsed, fallbackMessage);
          } catch {
            // continue
          }
        }
        return msg;
      }
    }
  }

  // 3. Plain object or nested error object handling
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;

    // Common error payload keys: error, message, detail, description, statusText, title
    if (record.error !== undefined && record.error !== null) {
      if (typeof record.error === "string") {
        const errStr = record.error.trim();
        if (errStr && errStr !== "[object Object]") {
          return errStr;
        }
      } else if (typeof record.error === "object") {
        const extracted = normalizeErrorMessage(record.error, "");
        if (extracted && extracted !== "[object Object]") {
          return extracted;
        }
      }
    }

    if (typeof record.message === "string") {
      const msg = record.message.trim();
      if (msg && msg !== "[object Object]") {
        return msg;
      }
    }

    if (typeof record.detail === "string" && record.detail.trim() && record.detail.trim() !== "[object Object]") {
      return record.detail.trim();
    }

    if (typeof record.description === "string" && record.description.trim() && record.description.trim() !== "[object Object]") {
      return record.description.trim();
    }

    if (typeof record.statusText === "string" && record.statusText.trim()) {
      return record.statusText.trim();
    }

    // Try extracting from a details array
    if (Array.isArray(record.details) && record.details.length > 0) {
      const firstDetail = record.details[0];
      const extractedDetail = normalizeErrorMessage(firstDetail, "");
      if (extractedDetail && extractedDetail !== "[object Object]") {
        return extractedDetail;
      }
    }

    // If nothing else, try JSON.stringify if it contains meaningful data
    try {
      const jsonStr = JSON.stringify(record);
      if (jsonStr && jsonStr !== "{}" && !jsonStr.includes("[object Object]")) {
        // If it's a small object, return it, otherwise fallback
        if (jsonStr.length < 200) {
          return jsonStr;
        }
      }
    } catch {
      // Ignore serialization issues
    }
  }

  return fallbackMessage;
}
