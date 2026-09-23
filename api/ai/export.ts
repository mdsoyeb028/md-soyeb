import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { "User-Agent": "aistudio-build" },
    },
  });
};

const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-flash-latest",
];

export default async function handler(req: Request, res: Response) {
  // Always return application/json
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed. Please use POST.`,
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const {
      productName,
      productCategory,
      originCountry,
      targetCountry,
      buyerType,
      businessSize,
      specificQuestion,
      subTool,
      budget,
      quantity,
      businessType,
    } = body;

    if (!productName || typeof productName !== "string" || !productName.trim()) {
      return res.status(400).json({
        success: false,
        error: "Product name is required for export analysis.",
      });
    }

    if (productName.length > 300) {
      return res.status(400).json({
        success: false,
        error: "Product name exceeds 300 characters limit.",
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        success: false,
        error: "GEMINI_API_KEY is not configured on the server. Please define GEMINI_API_KEY in your server environment variables.",
      });
    }

    const selectedProduct = productName.trim();
    const selectedCategory = productCategory && typeof productCategory === "string" && productCategory.trim() ? productCategory.trim() : "Commercial Goods & Manufactured Products";
    const selectedOrigin = originCountry && typeof originCountry === "string" && originCountry.trim() ? originCountry.trim() : "Origin Country";
    const selectedTarget = targetCountry && typeof targetCountry === "string" && targetCountry.trim() ? targetCountry.trim() : "International Market";
    const selectedBuyerType = buyerType && typeof buyerType === "string" && buyerType.trim() ? buyerType.trim() : "B2B Wholesalers, Distributors & Importers";
    const selectedSize = businessSize || businessType || "Small to Medium Exporter";
    const selectedQuestion = specificQuestion && typeof specificQuestion === "string" && specificQuestion.trim() ? specificQuestion.trim() : "";
    const selectedSubTool = subTool && typeof subTool === "string" ? subTool.trim() : "opportunities";

    const prompt = `You are an elite international trade consultant, customs logistics strategist, and B2B export advisor.

TRADE PARAMETERS:
- Product Name: "${selectedProduct}"
- Product Category: "${selectedCategory}"
- Country of Origin: "${selectedOrigin}"
- Target Destination Country: "${selectedTarget}"
- Target Buyer/Customer Type: "${selectedBuyerType}"
- Exporter Business Size / Type: "${selectedSize}"
- Specific User Question / Inquiries: "${selectedQuestion || "Complete export feasibility, compliance, Incoterms, and buyer outreach strategy."}"
- Sub-Tool Requested: "${selectedSubTool}"
- Budget / Quantity Context: "${budget || "Commercial scale"} / ${quantity || "Standard export batches"}"

CRITICAL ACCURACY & COMPLIANCE RULES:
1. Do NOT invent or fabricate official regulations, import licenses, exact tariff duty percentages, mandatory HS codes, buyers, companies, phone numbers, email addresses, or market statistics.
2. Do NOT promise guaranteed export profits, guaranteed sales, or verified buyer lists.
3. When information depends on destination-country specific rules, customs classifications, or bi-lateral trade agreements, YOU MUST explicitly label it as: "Needs verification with the relevant official authority."
4. Provide practical, high-value commercial guidance:
   - Target-country market research & product suitability
   - HS-code research guidance (explaining how the 6-digit Harmonized System works and how to find the specific national 8-10 digit tariff line)
   - Incoterms explanation (e.g. FOB vs CIF vs DDP, where transfer of risk occurs)
   - Payment method guidance (e.g. Irrevocable LC at Sight, Advance TT 30/70, Documentary Collections)
   - Packaging, labeling & seaworthy logistics (drop testing, ISPM-15 wooden pallet heat treatment, barcode/country of origin labeling)
   - Required international shipping documents checklist (Commercial Invoice, Packing List, Bill of Lading / Airway Bill, Certificate of Origin, Insurance)
   - Risk and compliance checklist
   - B2B buyer outreach message draft or quotation draft tailored to this trade relationship.

Respond with strictly valid JSON according to this exact JSON schema:
{
  "product": "${selectedProduct}",
  "category": "${selectedCategory}",
  "originCountry": "${selectedOrigin}",
  "targetCountry": "${selectedTarget}",
  "verificationNotice": "Needs verification with the relevant official authority.",
  "customerTypes": [
    "string",
    "string",
    "string"
  ],
  "marketSuitability": "In-depth analysis of product fit, consumer/commercial demand in ${selectedTarget}, positioning, and competitive entry hurdles.",
  "hsCodeGuidance": "Detailed Harmonized System classification advice, likely chapter range, and steps to determine the exact destination tariff code with the national customs office.",
  "incotermsGuidance": "Clear explanation of standard Incoterms (e.g. FOB Port of Loading vs CIF Destination Port), insurance obligations, and risk allocation for this trade lane.",
  "paymentGuidance": "Practical trade finance and secure payment mechanisms (e.g., Irrevocable Letter of Credit, confirmed LC, advance telegraphic transfer split).",
  "logisticsPackaging": "Export-grade packaging specifications, moisture protection, palletization standards (ISPM-15), drop-testing, and shipping marks.",
  "requiredDocuments": [
    "Commercial Invoice with Incoterms and HS Code",
    "Packing List itemizing net/gross weights and dimensions",
    "Bill of Lading (Ocean) or Air Waybill (Air)",
    "Certificate of Origin (Preferential / Non-Preferential)",
    "Marine Cargo Insurance Certificate",
    "Needs verification with the relevant official authority for specific destination permits"
  ],
  "complianceChecklist": [
    "Obtain Import Export Code (IEC / EORI) from national trade body",
    "Verify product quality, food safety, or technical standard certificates in ${selectedTarget} - Needs verification with the relevant official authority",
    "Confirm destination customs tariff rate and applicable VAT/GST",
    "Ensure packaging complies with international phytosanitary and environmental disposal regulations",
    "Vet buyer legal registration and establish trade credit terms prior to shipping"
  ],
  "buyerOutreachDraft": "Professional, personalized B2B cold introduction letter/email for foreign buyers with clear subject line, value proposition, MOQ, and sample offer.",
  "quotationDraft": "Formal B2B export price quotation framework including validity period, payment terms, Incoterms, lead time, and port specifications.",
  "content": "Comprehensive, beautifully structured Markdown briefing incorporating all executive research, checklists, and actionable advice with clear headers, bullet points, and prominent 'Needs verification with the relevant official authority' notices."
}`;

    let lastError: Error | null = null;
    let aiText = "";

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        if (response && response.text) {
          aiText = response.text;
          break;
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }
    }

    if (!aiText) {
      throw new Error(
        `Export intelligence generation failed across candidate models: ${lastError?.message || "Service temporarily unavailable."}`
      );
    }

    const parsed = JSON.parse(aiText);

    return res.status(200).json({
      success: true,
      data: {
        ...parsed,
        source: "gemini-ai",
      },
      ...parsed,
      content: parsed.content || "Export briefing generated successfully.",
      source: "gemini-ai",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Export analysis failed.";
    console.error("Vercel Serverless Export API Error:", message);
    const status = message.includes("required") || message.includes("exceeds") ? 400 : 503;
    return res.status(status).json({
      success: false,
      error: message,
    });
  }
}
