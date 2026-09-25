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
 * Clean environment variable values that may have been pasted with 'export KEY=' or extra quotes,
 * and filter out invalid dummy placeholders.
 */
export function cleanApiKey(val: string | undefined): string | null {
  if (!val) return null;
  let cleaned = val.trim();
  cleaned = cleaned.replace(/^export\s+/i, "").trim();
  cleaned = cleaned.replace(/^[A-Za-z0-9_]+\s*=\s*/, "").trim();
  cleaned = cleaned.replace(/^["']|["']$/g, "").trim();

  // Validate that key is not an empty placeholder or dummy template
  if (
    cleaned.length < 15 ||
    cleaned.includes("...") ||
    cleaned.toLowerCase().includes("placeholder") ||
    cleaned.toLowerCase().includes("your_")
  ) {
    return null;
  }
  return cleaned;
}

/**
 * Resolves provider API keys from environment with support for common aliases
 */
export function getGeminiKey(): string | null {
  return cleanApiKey(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY);
}

export function getGroqKey(): string | null {
  return cleanApiKey(process.env.GROQ_API_KEY || process.env.GROQ_KEY);
}

export function getOpenRouterKey(): string | null {
  return cleanApiKey(process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || process.env.OPEN_ROUTER_API_KEY);
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
export function categorizeError(err: unknown): { status: number | string; category: string; message: string } {
  let status: number | string = "N/A";
  let rawMsg = "Unknown error";

  if (err instanceof Error) {
    rawMsg = err.message || "Unknown error";
    if (err.name === "AbortError" || rawMsg.includes("timed out") || rawMsg.includes("timeout")) {
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
    else if (status === 500) category = "INTERNAL_SERVER_ERROR";
    else if (status === 502) category = "BAD_GATEWAY";
    else if (status === 503) category = "PROVIDER_UNAVAILABLE";
    else if (status === 504) category = "GATEWAY_TIMEOUT";
    else if (status >= 500 && status <= 504) category = "PROVIDER_UNAVAILABLE";
  } else {
    if (rawMsg.includes("429") || rawMsg.includes("quota") || rawMsg.includes("exhausted") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
      category = "RATE_LIMIT_OR_QUOTA";
      status = 429;
    } else if (rawMsg.includes("503") || rawMsg.includes("demand") || rawMsg.includes("unavailable") || rawMsg.includes("overloaded")) {
      category = "PROVIDER_UNAVAILABLE";
      status = 503;
    } else if (rawMsg.includes("502") || rawMsg.includes("bad gateway")) {
      category = "BAD_GATEWAY";
      status = 502;
    } else if (rawMsg.includes("504") || rawMsg.includes("gateway timeout")) {
      category = "GATEWAY_TIMEOUT";
      status = 504;
    } else if (rawMsg.includes("500") || rawMsg.includes("internal server")) {
      category = "INTERNAL_SERVER_ERROR";
      status = 500;
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

// 1. Primary Gemini models in priority order:
// gemini-3.8-flash: Standard Flash model for general text tasks
// gemini-flash-latest: Official production alias
const GEMINI_CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

// 2. Groq candidate models (verified active chat/completion models; excludes deprecated 404 models like llama-3.3-70b-versatile)
const DEFAULT_GROQ_CANDIDATE_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "allam-2-7b",
];

let cachedGroqModels: string[] = [];
let lastGroqModelsFetch = 0;

// 3. Fallback baseline free models on OpenRouter (if runtime discovery is unavailable)
const DEFAULT_OPENROUTER_FREE_MODELS = [
  "qwen/qwen3.8-27b:free",
  "liquid/lfm-2.5-2.6b:free",
  "openrouter/auto",
];

let cachedOpenRouterFreeModels: string[] = [];
let lastOpenRouterModelsFetch = 0;
const MODELS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Dynamically queries Groq for currently active text completion/chat models
 */
export async function getRuntimeGroqModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedGroqModels.length > 0 && now - lastGroqModelsFetch < MODELS_CACHE_TTL_MS) {
    return cachedGroqModels;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

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
        // Filter out non-chat / guard / audio / moderation models
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
              id.includes("vision") ||
              id.includes("versatile") // Exclude models that return 404
            ) {
              return false;
            }
            return true;
          })
          .map((m: GroqModelItem) => m.id);

        if (activeIds.length > 0) {
          const sorted = [...activeIds].sort((a: string, b: string) => {
            const score = (name: string) => {
              const lower = name.toLowerCase();
              if (lower.includes("gpt-oss-120b")) return 100;
              if (lower.includes("gpt-oss-20b")) return 95;
              if (lower.includes("qwen3.8") || lower.includes("qwen-3")) return 90;
              if (lower.includes("llama-3.3-70b")) return 85;
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
export async function getRuntimeFreeOpenRouterModels(): Promise<string[]> {
  const now = Date.now();
  if (cachedOpenRouterFreeModels.length > 0 && now - lastOpenRouterModelsFetch < MODELS_CACHE_TTL_MS) {
    return cachedOpenRouterFreeModels;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

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
            const rankA = /qwen|liquid|llama|mistral|deepseek/i.test(a) ? 1 : 0;
            const rankB = /qwen|liquid|llama|mistral|deepseek/i.test(b) ? 1 : 0;
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
 * - Strict timeout per attempt (6500ms)
 * - Immediate failover: If Gemini returns 503 (high demand), 429 (quota), 500, 502, 504,
 *   or times out, immediately throws so caller instantly fails over to Groq.
 */
export async function callGemini(
  prompt: string,
  options?: AIGenerateOptions
): Promise<AICompletionResult> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { "User-Agent": "aistudio-build" },
    },
  });

  const perAttemptTimeoutMs = options?.timeoutMs ? Math.min(options.timeoutMs, 7000) : 6500;
  let lastError: Error | null = null;

  for (let i = 0; i < GEMINI_CANDIDATE_MODELS.length; i++) {
    const model = GEMINI_CANDIDATE_MODELS[i];
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
          () => reject(new Error(`Gemini model ${model} timed out after ${perAttemptTimeoutMs}ms`)),
          perAttemptTimeoutMs
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

      // Immediate failover triggers:
      // If Gemini returns 503 (high demand), 429 (quota), 500, 502, 504, or times out,
      // throw immediately so generateAICompletion directly hands off to Groq!
      if (
        status === 503 ||
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 504 ||
        category === "PROVIDER_UNAVAILABLE" ||
        category === "RATE_LIMIT_OR_QUOTA" ||
        category === "TIMEOUT" ||
        message.includes("high demand") ||
        message.includes("quota")
      ) {
        throw new Error(`Gemini ${category} (HTTP ${status}): ${message}`);
      }

      if (i === GEMINI_CANDIDATE_MODELS.length - 1) {
        break;
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  throw lastError || new Error("All Gemini candidate models failed.");
}

/**
 * 2. Attempt generation using Groq as Secondary Fallback Provider
 * - Fast inference (typically 500-1500ms)
 * - Dynamic model discovery + verified text models
 * - Strict 7500ms timeout
 * - Continues across candidate models on per-model rate limits
 */
export async function callGroqFallback(
  prompt: string,
  options?: AIGenerateOptions
): Promise<AICompletionResult> {
  const apiKey = getGroqKey();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const candidateModels = await getRuntimeGroqModels(apiKey);
  const timeoutMs = options?.timeoutMs ? Math.min(options.timeoutMs, 8000) : 7500;
  let lastError: Error | null = null;

  // Try top 3 candidate models
  const modelsToTry = candidateModels.slice(0, 3);

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

      // Groq TPM/RPM limits are model-specific. If one model is rate-limited, continue to next candidate model!
      continue;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  throw lastError || new Error("All Groq candidate models failed.");
}

/**
 * 3. Attempt generation using OpenRouter as Tertiary Fallback Provider (Free models only)
 */
export async function callOpenRouterFallback(
  prompt: string,
  options?: AIGenerateOptions
): Promise<AICompletionResult> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured or invalid for fallback.");
  }

  const freeModels = await getRuntimeFreeOpenRouterModels();
  const timeoutMs = options?.timeoutMs ? Math.min(options.timeoutMs, 8500) : 8000;
  let lastError: Error | null = null;

  // Try top 2 free models
  const candidateModelsToTry = freeModels.slice(0, 2);

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
 * 1. Primary: Gemini (gemini-3.8-flash -> gemini-flash-latest)
 * 2. Secondary: Groq (openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b)
 * 3. Tertiary: OpenRouter Free Models (qwen/qwen3.8-27b:free, openrouter/auto)
 *
 * A Gemini 503, 429, 500, 502, 504, or timeout NEVER stops the request.
 * It immediately triggers failover to Groq, and if Groq fails, to OpenRouter.
 */
export async function generateAICompletion(
  prompt: string,
  options?: AIGenerateOptions
): Promise<AICompletionResult> {
  // Step 1: Try Primary Provider (Gemini)
  const geminiKey = getGeminiKey();
  if (geminiKey) {
    try {
      const result = await callGemini(prompt, options);
      return result;
    } catch (err: unknown) {
      const { status, category, message } = categorizeError(err);
      logProviderAttemptError({
        provider: "gemini",
        httpStatus: status,
        errorCategory: category,
        sanitizedMessage: `Primary provider Gemini failed (HTTP ${status} / ${category}): ${message}. Immediately failing over to Groq...`,
      });
    }
  } else {
    console.info(`[AI Failover] GEMINI_API_KEY not configured. Checking secondary providers...`);
  }

  // Step 2: Try Secondary Provider (Groq)
  const groqKey = getGroqKey();
  if (groqKey) {
    try {
      const result = await callGroqFallback(prompt, options);
      console.info(`[AI Failover] Successfully generated response using secondary provider Groq (${result.modelUsed}).`);
      return result;
    } catch (err: unknown) {
      const { status, category, message } = categorizeError(err);
      logProviderAttemptError({
        provider: "groq",
        httpStatus: status,
        errorCategory: category,
        sanitizedMessage: `Secondary provider Groq failed (HTTP ${status} / ${category}): ${message}. Immediately failing over to OpenRouter...`,
      });
    }
  } else {
    console.info(`[AI Failover] GROQ_API_KEY not configured or unavailable. Proceeding to OpenRouter...`);
  }

  // Step 3: Try Tertiary Provider (OpenRouter Free)
  const openRouterKey = getOpenRouterKey();
  if (openRouterKey) {
    try {
      const result = await callOpenRouterFallback(prompt, options);
      console.info(
        `[AI Failover] Successfully generated response using tertiary provider OpenRouter (${result.modelUsed}).`
      );
      return result;
    } catch (err: unknown) {
      const { status, category, message } = categorizeError(err);
      logProviderAttemptError({
        provider: "openrouter",
        httpStatus: status,
        errorCategory: category,
        sanitizedMessage: `Tertiary provider OpenRouter failed: ${message}`,
      });
    }
  } else {
    console.info(`[AI Failover] OPENROUTER_API_KEY not configured or invalid.`);
  }

  // Step 4: All providers failed or not configured
  throw new AIProviderError(
    "All configured AI providers (Gemini, Groq, OpenRouter) are temporarily unavailable. Please try again in a moment.",
    "ALL_PROVIDERS_UNAVAILABLE",
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
 * Robust JSON parser that strips markdown code blocks or extracts JSON payloads
 */
export function safeParseJson<T = Record<string, unknown>>(raw: string): T {
  let clean = raw.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  try {
    return JSON.parse(clean) as T;
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error("Unable to parse JSON from AI response");
  }
}

/**
 * Maps provider type to a clean display source name
 */
export function getProviderSourceName(provider: AIProvider): string {
  if (provider === "gemini") return "gemini-ai";
  if (provider === "groq") return "groq-ai";
  return "openrouter-free";
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
