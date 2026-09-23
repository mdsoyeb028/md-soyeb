import { GoogleGenAI } from "@google/genai";

export class AIProviderError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code = "AI_PROVIDER_UNAVAILABLE", statusCode = 503) {
    super(message);
    this.name = "AIProviderError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export type AIProvider = "gemini" | "openrouter";

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

// Gemini candidate models (ordered by speed and tier)
const GEMINI_CANDIDATE_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
];

// Fallback baseline free models on OpenRouter (if runtime discovery is unavailable)
const DEFAULT_OPENROUTER_FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "nvidia/nemotron-3.5-lightning:free",
];

// In-memory cache for dynamic runtime free models from OpenRouter
let cachedOpenRouterFreeModels: string[] = [];
let lastOpenRouterModelsFetch = 0;
const MODELS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

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
          // Prioritize well-known high quality instruction/chat models
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
 * Attempt generation using Gemini as Primary Provider
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

  const timeoutMs = options?.timeoutMs || 16000;
  let lastError: Error | null = null;

  for (const model of GEMINI_CANDIDATE_MODELS) {
    let timer: NodeJS.Timeout | null = null;
    try {
      // Timeout promise wrapper
      const generatePromise = ai.models.generateContent({
        model,
        contents: prompt,
        ...(options?.jsonMode ? { config: { responseMimeType: "application/json" } } : {}),
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
      // Continue to next candidate model
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  throw lastError || new Error("All Gemini candidate models failed.");
}

/**
 * Attempt generation using OpenRouter as Fallback Provider (Free models only)
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
  const timeoutMs = options?.timeoutMs || 16000;
  let lastError: Error | null = null;

  // Try top 4 free models from the discovered runtime free list
  const candidateModelsToTry = freeModels.slice(0, 4);

  for (const model of candidateModelsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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

      // Some free models fail with 400 if response_format is present; retry without it
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

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`OpenRouter HTTP ${res.status}: ${errText.slice(0, 150)}`);
      }

      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;

      if (!content || typeof content !== "string" || !content.trim()) {
        throw new Error(`OpenRouter (${model}) returned an empty response.`);
      }

      // If jsonMode, clean and validate JSON parsing
      if (options?.jsonMode) {
        let cleanJson = content.trim();
        if (cleanJson.startsWith("```json")) {
          cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
        } else if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
        }

        // Validate JSON with regex extraction fallback
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
      // Try next free model
    }
  }

  throw lastError || new Error("All OpenRouter free fallback models failed.");
}

/**
 * Universal AI Completion function with automatic Provider Fallback
 * 
 * Flow:
 * 1. Attempt Primary: Gemini API
 * 2. If Gemini fails (quota/429/timeout/provider error), safely attempt Fallback: OpenRouter Free model
 * 3. If both fail, throw AIProviderError with AI_PROVIDER_UNAVAILABLE code
 */
export async function generateAICompletion(
  prompt: string,
  options?: AIGenerateOptions
): Promise<AICompletionResult> {
  // Step 1: Try Primary Provider (Gemini)
  let geminiError: Error | null = null;

  try {
    const result = await callGemini(prompt, options);
    return result;
  } catch (err: unknown) {
    geminiError = err instanceof Error ? err : new Error(String(err));
    console.warn(`[AI Failover] Primary provider Gemini unavailable (${geminiError.message}). Initiating OpenRouter free fallback...`);
  }

  // Step 2: Try Fallback Provider (OpenRouter Free)
  try {
    const fallbackResult = await callOpenRouterFallback(prompt, options);
    console.log(`[AI Failover] Successfully generated response using OpenRouter free model: ${fallbackResult.modelUsed}`);
    return fallbackResult;
  } catch (orErr: unknown) {
    const orMessage = orErr instanceof Error ? orErr.message : String(orErr);
    console.error(`[AI Failover] Fallback provider OpenRouter also failed: ${orMessage}`);
  }

  // Step 3: Both providers failed
  throw new AIProviderError(
    "AI service is temporarily unavailable. Please try again later.",
    "AI_PROVIDER_UNAVAILABLE",
    503
  );
}

/**
 * Currently configured/discovered OpenRouter free model info for diagnostic reporting
 */
export async function getActiveOpenRouterFreeConfig(): Promise<string[]> {
  return getRuntimeFreeOpenRouterModels();
}
