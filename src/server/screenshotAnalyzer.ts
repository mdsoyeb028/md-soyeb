import { GoogleGenAI } from "@google/genai";
import { getGeminiKey, getGroqKey, getOpenRouterKey, sanitizeString } from "./aiProvider";

export interface VisualAnnotation {
  id: string;
  label: string;
  // Normalized coordinates in 0-1000 scale: [ymin, xmin, ymax, xmax]
  box_2d: [number, number, number, number];
  severity: "critical" | "warning" | "opportunity";
  description: string;
}

export interface ScreenshotAnalysisResult {
  imageType: string;
  whatISee: string;
  theProblem: string;
  whyItMatters: string;
  howToFixIt: string;
  nextStep: string;
  visibleNumbersAndMetrics: string[];
  annotations: VisualAnnotation[];
  websiteUxAnalysis?: {
    header: string;
    navigation: string;
    heroSection: string;
    cta: string;
    services: string;
    trustElements: string;
    contactOptions: string;
    visualHierarchy: string;
    conversionFriction: string[];
  };
  adAnalysis?: {
    hook: string;
    offer: string;
    cta: string;
    visualHierarchy: string;
    targetAudienceClarity: string;
    messageClarity: string;
    conversionWeaknesses: string[];
    betterVersion: {
      newHeadline: string;
      primaryText: string;
      cta: string;
      creativeDirection: string;
      landingPageRecommendation: string;
    };
  };
  suggestedActionPlan: Array<{
    stepNumber: number;
    action: string;
    toolsNeeded: string;
    metricToMonitor: string;
  }>;
  disclaimer: string;
  rawResponse?: string;
}

/**
 * Multimodal Screenshot & Business Image Diagnostic Engine
 */
export async function analyzeBusinessScreenshot(options: {
  imageBase64: string;
  imageMimeType?: string;
  imageType?: string;
  language?: string;
  userNotes?: string;
}): Promise<ScreenshotAnalysisResult> {
  const {
    imageBase64,
    imageMimeType = "image/png",
    imageType = "general",
    language = "English",
    userNotes = "",
  } = options;

  // Clean data URL prefix if present
  let cleanBase64 = imageBase64;
  let detectedMime = imageMimeType;
  if (imageBase64.includes("base64,")) {
    const parts = imageBase64.split("base64,");
    const mimeMatch = parts[0].match(/data:([^;]+);/);
    if (mimeMatch) detectedMime = mimeMatch[1];
    cleanBase64 = parts[1].trim();
  }

  const prompt = `You are a world-class Senior Business Diagnostic Auditor and Visual UX/Analytics Specialist.
Examine this uploaded business screenshot or image with extreme precision and truthfulness.

CRITICAL INTEGRITY RULES:
1. Understand exactly what is visible in the image.
2. Read visible numbers, dates, titles, metrics, charts, and trends directly from the image.
3. Identify abnormal or weak areas, steep drops, zero conversions, UX friction, missing CTAs, or poor ad hooks.
4. NEVER invent or hallucinate information that cannot be seen or read from the image. If a metric is cropped or unreadable, explicitly state "Not visible in image".
5. Use "may" or "likely" when explaining inferences or possible causes.
6. The entire output must be tailored to the user's selected language: ${language}. (Keep URLs and official technical labels recognizable).

IMAGE TYPE DECLARED BY USER: ${imageType}
USER NOTES / INQUIRY: ${userNotes || "Please diagnose this screenshot and tell me what is wrong and how to fix it."}

You MUST return a STRICTLY VALID JSON object with this exact structure:
{
  "imageType": "${imageType}",
  "whatISee": "Concise summary of what is visibly displayed (charts, periods, interface, ad elements, metrics).",
  "theProblem": "Clear explanation of the main bottleneck or weakness visible in the image.",
  "whyItMatters": "Why this problem damages business revenue, leads, or growth.",
  "howToFixIt": "Clear, practical, actionable instructions to resolve the problem.",
  "nextStep": "Immediate single action the user should take right now.",
  "visibleNumbersAndMetrics": [
    "List exact numbers, percentages, or metrics read directly from the image (e.g. 'Sessions: 1,420', 'CTR: 1.2%')"
  ],
  "annotations": [
    {
      "id": "box-1",
      "label": "Short label of problem area",
      "box_2d": [ymin, xmin, ymax, xmax], // Normalized integers from 0 to 1000 representing box on the image
      "severity": "critical", // "critical" | "warning" | "opportunity"
      "description": "Why this specific region has an issue"
    }
  ],
  "websiteUxAnalysis": { // Include if this is a website, landing page, or store screenshot
    "header": "Observations on header and brand identity",
    "navigation": "Clarity of menu and navigation",
    "heroSection": "Clarity of value proposition in hero",
    "cta": "Visibility and actionability of call-to-action",
    "services": "Clarity of offered services/products",
    "trustElements": "Visible reviews, badges, guarantees, or lack thereof",
    "contactOptions": "Visible WhatsApp, phone, or forms",
    "visualHierarchy": "Eye flow and text readability",
    "conversionFriction": ["Point 1", "Point 2"]
  },
  "adAnalysis": { // Include if this is a Facebook/Instagram/Google/Display Ad screenshot
    "hook": "Evaluation of the hook or headline",
    "offer": "Evaluation of the business offer",
    "cta": "Evaluation of the button or action call",
    "visualHierarchy": "Visual balance and text density",
    "targetAudienceClarity": "Who the ad appears to target",
    "messageClarity": "Is the message clear within 3 seconds?",
    "conversionWeaknesses": ["Weakness 1", "Weakness 2"],
    "betterVersion": {
      "newHeadline": "High-converting alternative headline",
      "primaryText": "Compelling ad copy body",
      "cta": "Recommended CTA button text",
      "creativeDirection": "Suggested visual/image/video change",
      "landingPageRecommendation": "Where this ad should send visitors"
    }
  },
  "suggestedActionPlan": [
    {
      "stepNumber": 1,
      "action": "Exact step description",
      "toolsNeeded": "Tools needed (free / low-cost options)",
      "metricToMonitor": "Metric to verify improvement"
    }
  ],
  "disclaimer": "This analysis is based solely on the visible content in the uploaded screenshot. Verified metrics require direct platform access."
}

Do not include any conversational filler, markdown backticks, or text outside the JSON.`;

  // 1. Primary: Try Gemini Multimodal
  const geminiKey = getGeminiKey();
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const candidateModels = [
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-3.8-flash",
      ];

      for (const model of candidateModels) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 12000);

          const response = await ai.models.generateContent({
            model,
            contents: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: detectedMime,
                  data: cleanBase64,
                },
              },
            ],
            config: {
              responseMimeType: "application/json",
            },
          });
          clearTimeout(timer);

          if (response && response.text) {
            const parsed = JSON.parse(response.text.trim()) as ScreenshotAnalysisResult;
            return parsed;
          }
        } catch (mErr: unknown) {
          console.warn(`[Screenshot Analyzer] Model ${model} failed, trying next:`, sanitizeString(String(mErr)));
          continue;
        }
      }
    } catch (gErr: unknown) {
      console.warn("[Screenshot Analyzer] Gemini multimodal error:", sanitizeString(String(gErr)));
    }
  }

  // 2. Secondary: Fallback to Groq or OpenRouter vision API if available
  const groqKey = getGroqKey();
  if (groqKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);

      const groqPayload = {
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:${detectedMime};base64,${cleanBase64}` },
              },
            ],
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      };

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(groqPayload),
      });
      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        const content = json?.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content.trim()) as ScreenshotAnalysisResult;
          return parsed;
        }
      }
    } catch (groqErr) {
      console.warn("[Screenshot Analyzer] Groq vision fallback failed:", sanitizeString(String(groqErr)));
    }
  }

  // 3. Fallback: Return structured diagnostic explaining the limitations
  return {
    imageType,
    whatISee: "Uploaded business image received. Vision AI models encountered temporary provider limits.",
    theProblem: "Automatic visual feature extraction is currently operating under restricted capacity.",
    whyItMatters: "Direct OCR and visual bounding boxes require active multimodal AI endpoints.",
    howToFixIt: "Verify your API key configurations or retry in a few moments. You can also paste the URL or specific numbers into the text inspector.",
    nextStep: "Retry screenshot upload or use the website/YouTube live inspector tab.",
    visibleNumbersAndMetrics: ["Image uploaded successfully: Base64 payload received"],
    annotations: [
      {
        id: "box-fallback",
        label: "Visual Inspection Area",
        box_2d: [100, 100, 900, 900],
        severity: "opportunity",
        description: "Uploaded screenshot was received for processing.",
      },
    ],
    suggestedActionPlan: [
      {
        stepNumber: 1,
        action: "Enter website URL or YouTube link in the direct inspector for instant tag & metadata inspection.",
        toolsNeeded: "Built-in Live Inspector (Free)",
        metricToMonitor: "Tracking tags and public metadata",
      },
    ],
    disclaimer: "Real multimodal processing was temporarily unavailable. No simulated numbers were generated.",
  };
}
