import { GoogleGenAI } from "@google/genai";

export class AIProviderError extends Error {
  code: string;
  statusCode: number;

  constructor(
    message = "AI service temporarily unavailable. Please try again in a moment.",
    code = "AI_PROVIDER_ERROR",
    statusCode = 503
  ) {
    super(message);
    this.name = "AIProviderError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export type AIProvider = "gemini" | "groq" | "openrouter";

export interface AICompletionResult {
  text: string;
  provider: AIProvider;
  modelUsed: string;
}

export interface AIGenerateOptions {
  jsonMode?: boolean;
  systemPrompt?: string;
  timeoutMs?: number;
}

export interface SafeLogDetails {
  provider: AIProvider;
  model?: string;
  httpStatus?: number | string;
  errorCategory: string;
  sanitizedMessage: string;
}

/**
 * Sanitizes any string to ensure API keys, Bearer tokens, or confidential headers never leak to logs or UI.
 */
export function sanitizeString(val: string): string {
  if (!val) return "";
  return val
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "Bearer [REDACTED]")
    .replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_GEMINI_KEY]")
    .replace(/gsk_[A-Za-z0-9]{40,65}/g, "[REDACTED_GROQ_KEY]")
    .replace(/sk-or-[A-Za-z0-9_\-\.]{20,}/g, "[REDACTED_OPENROUTER_KEY]")
    .replace(/sk-[A-Za-z0-9_\-\.]{20,}/g, "[REDACTED_API_KEY]")
    .replace(/key=[A-Za-z0-9_\-\.]+/gi, "key=[REDACTED]");
}

/**
 * Clean environment variable values that may have been pasted with 'export KEY=' or extra quotes.
 */
export function cleanApiKey(val: string | undefined): string | null {
  if (!val) return null;
  let cleaned = val.replace(/^export\s+[A-Za-z0-9_]+\s*=\s*/i, "").trim();
  cleaned = cleaned.replace(/^["']|["']$/g, "").trim();
  return cleaned.length >= 8 ? cleaned : null;
}

/**
 * Safe server-side logger that records:
 * - provider attempted
 * - HTTP status
 * - error category
 * - sanitized error message
 * BUT NEVER logs API keys or secrets.
 */
export function logProviderAttemptError(details: SafeLogDetails): void {
  const safeMsg = sanitizeString(details.sanitizedMessage);
  console.warn(
    `[AI Provider Notice] Provider: ${details.provider} | Model: ${details.model || "default"} | HTTP Status: ${details.httpStatus ?? "N/A"} | Category: ${details.errorCategory} | Detail: ${safeMsg}`
  );
}

/**
 * Extract an HTTP status code and category from unknown provider errors
 */
function categorizeError(err: unknown): { status: number | string; category: string; message: string } {
  let status: number | string = "N/A";
  let rawMsg = "Unknown error";

  if (err instanceof Error) {
    rawMsg = err.message || "Unknown error";
    if (err.name === "AbortError" || rawMsg.includes("timed out")) {
      return { status: 408, category: "TIMEOUT", message: "Request timed out" };
    }
  } else if (typeof err === "string") {
    rawMsg = err;
  } else if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;
    rawMsg = typeof obj.message === "string" ? obj.message : JSON.stringify(err);
    if (typeof obj.status === "number") status = obj.status;
    else if (typeof obj.statusCode === "number") status = obj.statusCode;
  }

  // Check if rawMsg contains JSON with code or status
  if (status === "N/A") {
    const codeMatch = rawMsg.match(/"code"\s*:\s*(\d{3})/);
    if (codeMatch) {
      status = parseInt(codeMatch[1], 10);
    } else {
      const httpMatch = rawMsg.match(/HTTP\s+(\d{3})/i);
      if (httpMatch) {
        status = parseInt(httpMatch[1], 10);
      }
    }
  }

  let category = "UNKNOWN_ERROR";
  if (typeof status === "number") {
    if (status === 400) category = "INVALID_REQUEST";
    else if (status === 401) category = "AUTH_FAILED";
    else if (status === 403) category = "ACCESS_DENIED";
    else if (status === 404) category = "MODEL_NOT_FOUND";
    else if (status === 429) category = "RATE_LIMIT_OR_QUOTA";
    else if (status >= 500 && status <= 504) category = "PROVIDER_UNAVAILABLE";
  } else {
    if (rawMsg.includes("429") || rawMsg.includes("quota") || rawMsg.includes("exhausted")) {
      category = "RATE_LIMIT_OR_QUOTA";
      status = 429;
    } else if (rawMsg.includes("503") || rawMsg.includes("demand") || rawMsg.includes("unavailable")) {
      category = "PROVIDER_UNAVAILABLE";
      status = 503;
    } else if (rawMsg.includes("401") || rawMsg.includes("API key not valid") || rawMsg.includes("Authentication")) {
      category = "AUTH_FAILED";
      status = 401;
    } else if (rawMsg.includes("404") || rawMsg.includes("not found")) {
      category = "MODEL_NOT_FOUND";
      status = 404;
    }
  }

  return { status, category, message: sanitizeString(rawMsg) };
}

// 1. Gemini candidate models (ordered by verified reliability, speed, and tier)
const GEMINI_CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite", // Blazing fast, generous limits, verified available
  "gemini-3.8-flash",      // Standard Flash model for basic text tasks
  "gemini-flash-latest",   // Official production alias
  "gemini-3.1-pro-preview",// Pro fallback
];

// 2. Groq candidate models (verified active chat/completion models)
const DEFAULT_GROQ_CANDIDATE_MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "allam-2-7b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

let cachedGroqModels: string[] = [];
let lastGroqModelsFetch = 0;

// 3. Fallback baseline free models on OpenRouter (if runtime discovery is unavailable)
const DEFAULT_OPENROUTER_FREE_MODELS = [
  "qwen/qwen3.8-27b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "openrouter/auto",
];

let cachedOpenRouterFreeModels: string[] = [];
let lastOpenRouterModelsFetch = 0;
const MODELS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Dynamically queries Groq for currently active text completion/chat models
 */
async function getRuntimeGroqModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedGroqModels.length > 0 && now - lastGroqModelsFetch < MODELS_CACHE_TTL_MS) {
    return cachedGroqModels;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch("https://api.groq.com/openai/v1/models", {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "Business-Growth-Export-Hub/1.0",
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.data)) {
        interface GroqModelItem {
          id: string;
          active?: boolean;
        }
        // Strictly filter out non-chat / guard / audio / moderation models
        const activeIds = json.data
          .filter((m: GroqModelItem) => {
            if (m.active === false) return false;
            const id = m.id.toLowerCase();
            if (
              id.includes("whisper") ||
              id.includes("audio") ||
              id.includes("embed") ||
              id.includes("guard") ||
              id.includes("safeguard") ||
              id.includes("orpheus") ||
              id.includes("vision")
            ) {
              return false;
            }
            return true;
          })
          .map((m: GroqModelItem) => m.id);

        if (activeIds.length > 0) {
          // Sort chat models: prioritize versatile qwen, gpt-oss, llama, and allam
          const sorted = [...activeIds].sort((a: string, b: string) => {
            const score = (name: string) => {
              const lower = name.toLowerCase();
              if (lower.includes("qwen3.8") || lower.includes("qwen-3")) return 100;
              if (lower.includes("gpt-oss-120b")) return 90;
              if (lower.includes("llama-3.3-70b")) return 85;
              if (lower.includes("gpt-oss-20b")) return 80;
              if (lower.includes("llama-3.1-8b")) return 75;
              if (lower.includes("allam")) return 70;
              return 10;
            };
            return score(b) - score(a);
          });

          cachedGroqModels = sorted;
          lastGroqModelsFetch = now;
          return sorted;
        }
      }
    }
  } catch (err) {
    const { category, message } = categorizeError(err);
    logProviderAttemptError({
      provider: "groq",
      errorCategory: category,
      sanitizedMessage: `Model discovery failed: ${message}`,
    });
  }

  return DEFAULT_GROQ_CANDIDATE_MODELS;
}

/**
 * Dynamically queries OpenRouter for currently available free models
 */
async function getRuntimeFreeOpenRouterModels(): Promise<string[]> {
  const now = Date.now();
  if (cachedOpenRouterFreeModels.length > 0 && now - lastOpenRouterModelsFetch < MODELS_CACHE_TTL_MS) {
    return cachedOpenRouterFreeModels;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch("https://openrouter.ai/api/v1/models", {
      signal: controller.signal,
      headers: {
        "User-Agent": "Business-Growth-Export-Hub/1.0",
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.data)) {
        interface ORModel {
          id: string;
          pricing?: { prompt?: string | number; completion?: string | number };
        }
        const freeList = json.data
          .filter((m: ORModel) => {
            const isZeroPrice = m.pricing && String(m.pricing.prompt) === "0" && String(m.pricing.completion) === "0";
            if (!m.id.endsWith(":free") && !isZeroPrice) return false;
            const lower = m.id.toLowerCase();
            if (
              lower.includes("guard") ||
              lower.includes("audio") ||
              lower.includes("embed") ||
              lower.includes("image") ||
              lower.includes("vision") ||
              lower.includes("whisper")
            ) {
              return false;
            }
            return true;
          })
          .map((m: ORModel) => m.id);

        if (freeList.length > 0) {
          const sorted = [...freeList].sort((a: string, b: string) => {
            const rankA = /qwen|llama|mistral|deepseek/i.test(a) ? 1 : 0;
            const rankB = /qwen|llama|mistral|deepseek/i.test(b) ? 1 : 0;
            return rankB - rankA;
          });

          cachedOpenRouterFreeModels = sorted;
          lastOpenRouterModelsFetch = now;
          return sorted;
        }
      }
    }
  } catch (err) {
    const { category, message } = categorizeError(err);
    logProviderAttemptError({
      provider: "openrouter",
      errorCategory: category,
      sanitizedMessage: `Free model discovery failed: ${message}`,
    });
  }

  return DEFAULT_OPENROUTER_FREE_MODELS;
}

/**
 * 1. Attempt generation using Gemini as Primary Provider
 */
async function callGemini(
  prompt: string,
  options?: AIGenerateOptions
): Promise<AICompletionResult> {
  const apiKey = cleanApiKey(process.env.GEMINI_API_KEY);
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { "User-Agent": "aistudio-build" },
    },
  });

  const timeoutMs = options?.timeoutMs || 25000;
  let lastError: Error | null = null;

  for (const model of GEMINI_CANDIDATE_MODELS) {
    let timer: NodeJS.Timeout | null = null;
    try {
      const config: Record<string, unknown> = {};
      if (options?.systemPrompt) {
        config.systemInstruction = options.systemPrompt;
      }
      if (options?.jsonMode) {
        config.responseMimeType = "application/json";
      }

      const generatePromise = ai.models.generateContent({
        model,
        contents: prompt,
        ...(Object.keys(config).length > 0 ? { config } : {}),
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Gemini model ${model} request timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);

      if (response && response.text) {
        return {
          text: response.text,
          provider: "gemini",
          modelUsed: model,
        };
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const { status, category, message } = categorizeError(err);
      logProviderAttemptError({
        provider: "gemini",
        model,
        httpStatus: status,
        errorCategory: category,
        sanitizedMessage: message,
      });

      // Brief backoff if 429 quota or 503 spike encountered before checking next candidate
      if (status === 429 || status === 503 || message.includes("429") || message.includes("503")) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  throw lastError || new Error("All Gemini candidate models failed.");
}

/**
 * 2. Attempt generation using Groq as Secondary Fallback Provider
 */
async function callGroqFallback(
  prompt: string,
  options?: AIGenerateOptions
): Promise<AICompletionResult> {
  const apiKey = cleanApiKey(process.env.GROQ_API_KEY);
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const candidateModels = await getRuntimeGroqModels(apiKey);
  const timeoutMs = options?.timeoutMs || 25000;
  let lastError: Error | null = null;

  // Try top candidate models
  const modelsToTry = candidateModels.slice(0, 4);

  for (const model of modelsToTry) {
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const messages: Array<{ role: string; content: string }> = [];
      if (options?.systemPrompt) {
        messages.push({ role: "system", content: options.systemPrompt });
      }
      if (options?.jsonMode) {
        messages.push({
          role: "system",
          content:
            "You are an expert commercial business AI. You MUST respond with strictly valid JSON only. Do not wrap with conversational filler or markdown notes outside the JSON.",
        });
      }
      messages.push({ role: "user", content: prompt });

      const payload: Record<string, unknown> = {
        model,
        messages,
        temperature: 0.3,
      };

      if (options?.jsonMode) {
        payload.response_format = { type: "json_object" };
      }

      let res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "Business-Growth-Export-Hub/1.0",
        },
        body: JSON.stringify(payload),
      });

      // If response_format causes 400 on some models, retry without response_format
      if (!res.ok && options?.jsonMode && res.status === 400) {
        delete payload.response_format;
        res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "User-Agent": "Business-Growth-Export-Hub/1.0",
          },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Groq HTTP ${res.status}: ${errText.slice(0, 150)}`);
      }

      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;

      if (!content || typeof content !== "string" || !content.trim()) {
        throw new Error(`Groq (${model}) returned an empty response.`);
      }

      if (options?.jsonMode) {
        let cleanJson = content.trim();
        if (cleanJson.startsWith("```json")) {
          cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
        } else if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
        }

        try {
          JSON.parse(cleanJson);
        } catch {
          const match = cleanJson.match(/\{[\s\S]*\}/);
          if (match) {
            JSON.parse(match[0]);
            cleanJson = match[0];
          } else {
            throw new Error(`Groq (${model}) output was not parseable JSON`);
          }
        }

        return {
          text: cleanJson,
          provider: "groq",
          modelUsed: model,
        };
      }

      return {
        text: content,
        provider: "groq",
        modelUsed: model,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const { status, category, message } = categorizeError(err);
      logProviderAttemptError({
        provider: "groq",
        model,
        httpStatus: status,
        errorCategory: category,
        sanitizedMessage: message,
      });

      if (status === 429 || status === 503) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  throw lastError || new Error("All Groq candidate models failed.");
}

/**
 * 3. Attempt generation using OpenRouter as Tertiary Fallback Provider (Free models only)
 */
async function callOpenRouterFallback(
  prompt: string,
  options?: AIGenerateOptions
): Promise<AICompletionResult> {
  const apiKey = cleanApiKey(process.env.OPENROUTER_API_KEY);
  if (!apiKey || apiKey.length < 15) {
    throw new Error("OPENROUTER_API_KEY is not configured or invalid for fallback.");
  }

  const freeModels = await getRuntimeFreeOpenRouterModels();
  const timeoutMs = options?.timeoutMs || 25000;
  let lastError: Error | null = null;

  // Try top free models from discovered runtime free list
  const candidateModelsToTry = freeModels.slice(0, 4);

  for (const model of candidateModelsToTry) {
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const messages: Array<{ role: string; content: string }> = [];
      if (options?.systemPrompt) {
        messages.push({ role: "system", content: options.systemPrompt });
      }
      if (options?.jsonMode) {
        messages.push({
          role: "system",
          content:
            "You are a professional AI assistant. You MUST respond with strictly valid JSON only. Do not wrap with conversational filler or markdown notes outside the JSON.",
        });
      }
      messages.push({ role: "user", content: prompt });

      const payload: Record<string, unknown> = {
        model,
        messages,
        temperature: 0.3,
      };

      if (options?.jsonMode) {
        payload.response_format = { type: "json_object" };
      }

      let res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.APP_URL || "https://md-soyeb.vercel.app/",
          "X-Title": "Business Growth & Export Hub",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok && options?.jsonMode && res.status === 400) {
        delete payload.response_format;
        res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.APP_URL || "https://md-soyeb.vercel.app/",
            "X-Title": "Business Growth & Export Hub",
          },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`OpenRouter HTTP ${res.status}: ${errText.slice(0, 150)}`);
      }

      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;

      if (!content || typeof content !== "string" || !content.trim()) {
        throw new Error(`OpenRouter (${model}) returned an empty response.`);
      }

      if (options?.jsonMode) {
        let cleanJson = content.trim();
        if (cleanJson.startsWith("```json")) {
          cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
        } else if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
        }

        try {
          JSON.parse(cleanJson);
        } catch {
          const match = cleanJson.match(/\{[\s\S]*\}/);
          if (match) {
            JSON.parse(match[0]);
            cleanJson = match[0];
          } else {
            throw new Error(`OpenRouter (${model}) output was not parseable JSON`);
          }
        }

        return {
          text: cleanJson,
          provider: "openrouter",
          modelUsed: model,
        };
      }

      return {
        text: content,
        provider: "openrouter",
        modelUsed: model,
      };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const { status, category, message } = categorizeError(err);
      logProviderAttemptError({
        provider: "openrouter",
        model,
        httpStatus: status,
        errorCategory: category,
        sanitizedMessage: message,
      });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  throw lastError || new Error("All OpenRouter free fallback models failed.");
}

/**
 * Universal AI Completion function with 3-Tier Multi-Provider Fallback
 *
 * Priority Flow:
 * 1. Primary: Gemini (gemini-3.1-flash-lite, gemini-3.8-flash, gemini-flash-latest, etc.)
 * 2. Secondary: Groq (qwen/qwen3.8-27b, openai/gpt-oss-120b, llama-3.3-70b-versatile, etc.)
 * 3. Tertiary: OpenRouter Free Models (dynamic discovery + baseline)
 *
 * If all providers fail: throws AIProviderError with AI_PROVIDER_ERROR code
 */
export async function generateAICompletion(
  prompt: string,
  options?: AIGenerateOptions
): Promise<AICompletionResult> {
  // Step 1: Try Primary Provider (Gemini)
  const geminiKey = cleanApiKey(process.env.GEMINI_API_KEY);
  if (geminiKey) {
    try {
      const result = await callGemini(prompt, options);
      return result;
    } catch (err: unknown) {
      const { category, message } = categorizeError(err);
      logProviderAttemptError({
        provider: "gemini",
        errorCategory: category,
        sanitizedMessage: `Primary provider Gemini exhausted options: ${message}. Initiating Groq failover...`,
      });
    }
  } else {
    console.info(`[AI Failover] GEMINI_API_KEY not configured. Checking secondary providers...`);
  }

  // Step 2: Try Secondary Provider (Groq)
  const groqKey = cleanApiKey(process.env.GROQ_API_KEY);
  if (groqKey) {
    try {
      const result = await callGroqFallback(prompt, options);
      console.info(`[AI Failover] Successfully generated response using secondary provider Groq (${result.modelUsed}).`);
      return result;
    } catch (err: unknown) {
      const { category, message } = categorizeError(err);
      logProviderAttemptError({
        provider: "groq",
        errorCategory: category,
        sanitizedMessage: `Secondary provider Groq exhausted options: ${message}. Initiating OpenRouter failover...`,
      });
    }
  } else {
    console.info(`[AI Failover] GROQ_API_KEY not configured (optional). Proceeding to OpenRouter...`);
  }

  // Step 3: Try Tertiary Provider (OpenRouter Free)
  const openRouterKey = cleanApiKey(process.env.OPENROUTER_API_KEY);
  if (openRouterKey && openRouterKey.length >= 15) {
    try {
      const result = await callOpenRouterFallback(prompt, options);
      console.info(
        `[AI Failover] Successfully generated response using tertiary provider OpenRouter (${result.modelUsed}).`
      );
      return result;
    } catch (err: unknown) {
      const { category, message } = categorizeError(err);
      logProviderAttemptError({
        provider: "openrouter",
        errorCategory: category,
        sanitizedMessage: `Tertiary provider OpenRouter failed: ${message}`,
      });
    }
  } else {
    console.info(`[AI Failover] OPENROUTER_API_KEY not configured (optional).`);
  }

  // Step 4: All providers failed or not configured
  throw new AIProviderError(
    "AI service temporarily unavailable. Please try again in a moment.",
    "AI_PROVIDER_ERROR",
    503
  );
}

/**
 * Normalizes any server-side error into a clean, human-readable string.
 * Prevents secrets or raw [object Object] leaks.
 */
export function normalizeServerErrorMessage(
  err: unknown,
  fallback = "AI service temporarily unavailable"
): string {
  if (!err) return fallback;
  if (typeof err === "string") {
    const trimmed = err.trim();
    if (!trimmed || trimmed === "[object Object]") return fallback;
    return sanitizeString(trimmed);
  }
  if (err instanceof Error) {
    const msg = (err.message || "").trim();
    if (!msg || msg === "[object Object]") return fallback;
    return sanitizeString(msg);
  }
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string" && obj.message.trim() && obj.message.trim() !== "[object Object]") {
      return sanitizeString(obj.message.trim());
    }
    if (typeof obj.error === "string" && obj.error.trim() && obj.error.trim() !== "[object Object]") {
      return sanitizeString(obj.error.trim());
    }
  }
  return fallback;
}

/**
 * Diagnostic helpers
 */
export async function getActiveOpenRouterFreeConfig(): Promise<string[]> {
  return getRuntimeFreeOpenRouterModels();
}

export async function getActiveGroqConfig(apiKey?: string): Promise<string[]> {
  const key = cleanApiKey(apiKey || process.env.GROQ_API_KEY);
  if (!key) return DEFAULT_GROQ_CANDIDATE_MODELS;
  return getRuntimeGroqModels(key);
}
