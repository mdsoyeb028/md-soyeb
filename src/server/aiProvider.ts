import { GoogleGenAI } from "@google/genai";

export class AIProviderError extends Error {
  code: string;
  statusCode: number;

  constructor(message = "AI service temporarily unavailable", code = "AI_PROVIDER_UNAVAILABLE", statusCode = 503) {
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

// 1. Gemini candidate models (ordered by speed and tier)
const GEMINI_CANDIDATE_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
];

// 2. Groq candidate models
const DEFAULT_GROQ_CANDIDATE_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
];

let cachedGroqModels: string[] = [];
let lastGroqModelsFetch = 0;

// 3. Fallback baseline free models on OpenRouter (if runtime discovery is unavailable)
const DEFAULT_OPENROUTER_FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "nvidia/nemotron-3.5-lightning:free",
];

let cachedOpenRouterFreeModels: string[] = [];
let lastOpenRouterModelsFetch = 0;
const MODELS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Dynamically queries Groq for currently active models
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
        const activeIds = json.data
          .filter((m: GroqModelItem) => m.active !== false && !m.id.includes("whisper") && !m.id.includes("audio") && !m.id.includes("embed"))
          .map((m: GroqModelItem) => m.id);

        if (activeIds.length > 0) {
          const sorted = [...activeIds].sort((a: string, b: string) => {
            const score = (name: string) => {
              if (name.includes("llama-3.3-70b")) return 100;
              if (name.includes("llama-3.1-8b")) return 80;
              if (name.includes("llama3-70b")) return 60;
              if (name.includes("mixtral")) return 40;
              if (name.includes("gemma")) return 20;
              return 0;
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
    console.warn("Could not query dynamic Groq models list; using baseline candidate models:", err);
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
            return m.id.endsWith(":free") || isZeroPrice;
          })
          .map((m: ORModel) => m.id);

        if (freeList.length > 0) {
          const sorted = [...freeList].sort((a: string, b: string) => {
            const rankA = /llama|qwen|mistral|deepseek|gemini/i.test(a) ? 1 : 0;
            const rankB = /llama|qwen|mistral|deepseek|gemini/i.test(b) ? 1 : 0;
            return rankB - rankA;
          });

          cachedOpenRouterFreeModels = sorted;
          lastOpenRouterModelsFetch = now;
          return sorted;
        }
      }
    }
  } catch (err) {
    console.warn("Could not query dynamic OpenRouter models list; using baseline free candidates:", err);
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
  const apiKey = process.env.GEMINI_API_KEY;
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
        timer = setTimeout(() => reject(new Error(`Gemini model ${model} request timed out after ${timeoutMs}ms`)), timeoutMs);
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
      console.warn(`Gemini (${model}) failed: ${lastError.message}`);
      if (lastError.message.includes("429") || lastError.message.includes("503") || lastError.message.includes("demand") || lastError.message.includes("exhausted")) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  throw lastError || new Error("All Gemini candidate models failed.");
}

/**
 * 2. Attempt generation using Groq as Secondary Provider
 */
async function callGroqFallback(
  prompt: string,
  options?: AIGenerateOptions
): Promise<AICompletionResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured for fallback.");
  }

  const candidateModels = await getRuntimeGroqModels(apiKey);
  const timeoutMs = options?.timeoutMs || 25000;
  let lastError: Error | null = null;

  // Try top 3 candidates
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
          content: "You are an expert commercial business AI. You MUST respond with strictly valid JSON only. Do not wrap with conversational filler or markdown notes outside the JSON.",
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
      console.warn(`Groq candidate (${model}) failed: ${lastError.message}`);
      if (lastError.message.includes("429") || lastError.message.includes("503")) {
        await new Promise((resolve) => setTimeout(resolve, 500));
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
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured for fallback.");
  }

  const freeModels = await getRuntimeFreeOpenRouterModels();
  const timeoutMs = options?.timeoutMs || 25000;
  let lastError: Error | null = null;

  // Try top 4 free models from discovered runtime free list
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
          content: "You are a professional AI assistant. You MUST respond with strictly valid JSON only. Do not wrap with conversational filler or markdown notes outside the JSON.",
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
      console.warn(`OpenRouter free model (${model}) failed: ${lastError.message}`);
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
 * 1. Primary: Gemini (gemini-3.6-flash, gemini-3.1-flash-lite)
 * 2. Secondary: Groq (llama-3.3-70b-versatile, llama-3.1-8b-instant, etc.)
 * 3. Tertiary: OpenRouter Free Models (dynamic discovery + baseline)
 * 
 * If all providers fail: throws AIProviderError with AI_PROVIDER_UNAVAILABLE code
 */
export async function generateAICompletion(
  prompt: string,
  options?: AIGenerateOptions
): Promise<AICompletionResult> {
  // Step 1: Try Primary Provider (Gemini)
  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await callGemini(prompt, options);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[AI Failover] Primary provider Gemini unavailable (${msg}). Trying Groq...`);
    }
  } else {
    console.warn(`[AI Failover] GEMINI_API_KEY not configured. Trying Groq...`);
  }

  // Step 2: Try Secondary Provider (Groq)
  if (process.env.GROQ_API_KEY) {
    try {
      const result = await callGroqFallback(prompt, options);
      console.log(`[AI Failover] Successfully generated response using Groq: ${result.modelUsed}`);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[AI Failover] Secondary provider Groq failed (${msg}). Trying OpenRouter...`);
    }
  } else {
    console.warn(`[AI Failover] GROQ_API_KEY not configured. Trying OpenRouter...`);
  }

  // Step 3: Try Tertiary Provider (OpenRouter Free)
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const result = await callOpenRouterFallback(prompt, options);
      console.log(`[AI Failover] Successfully generated response using OpenRouter free model: ${result.modelUsed}`);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[AI Failover] Tertiary provider OpenRouter also failed: ${msg}`);
    }
  } else {
    console.warn(`[AI Failover] OPENROUTER_API_KEY not configured.`);
  }

  // Step 4: All providers failed or not configured
  throw new AIProviderError(
    "AI service temporarily unavailable",
    "AI_PROVIDER_UNAVAILABLE",
    503
  );
}

/**
 * Diagnostic helpers
 */
export async function getActiveOpenRouterFreeConfig(): Promise<string[]> {
  return getRuntimeFreeOpenRouterModels();
}

export async function getActiveGroqConfig(apiKey?: string): Promise<string[]> {
  const key = apiKey || process.env.GROQ_API_KEY;
  if (!key) return DEFAULT_GROQ_CANDIDATE_MODELS;
  return getRuntimeGroqModels(key);
}
