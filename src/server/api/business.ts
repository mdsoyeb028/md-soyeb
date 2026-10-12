import {
  generateAICompletion,
  normalizeServerErrorMessage,
  safeParseJson,
} from "../aiProvider.ts";
import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (typeof res.status === "function") res.status(204).end();
    else {
      res.statusCode = 204;
      res.end();
    }
    return;
  }

  if (req.method !== "POST") {
    sendJsonResponse(res, 405, {
      success: false,
      error: `Method ${req.method} Not Allowed. Expected POST.`,
    });
    return;
  }

  try {
    const body = await parseRequestBody(req);
    const { 
      toolType, 
      inputData, 
      businessName, 
      industry, 
      challenge, 
      goals, 
      language, 
      languageName 
    } = body || {};

    const selectedLanguage = languageName || language || "English";
    const resolvedTool = toolType || "growth-roadmap";
    const isRoadmap = resolvedTool === "growth-roadmap";

    let prompt = "";
    if (isRoadmap) {
      const data = inputData || { businessName, businessType: industry, stage: "Startup", goals: goals || challenge };
      const bName = data.businessName || businessName || "My Business";
      const bType = data.businessType || industry || "General Business";
      const bStage = data.stage || "Startup";
      const bGoals = data.goals || goals || challenge || "Scale revenue and customer acquisition";
      const bMarket = data.targetMarket || "Domestic & International";
      const bTimeframe = data.timeframe || "90-Day Quarter";

      prompt = `You are a Principal Commercial Strategist & Business Growth Consultant.
Generate an actionable, exhaustive, and realistic "Business Growth Roadmap" step-by-step checklist.
Business Name: ${bName}
Business Type: ${bType}
Business Stage: ${bStage}
Primary Growth Target: ${bGoals}
Target Market / Region: ${bMarket}
Time Horizon: ${bTimeframe}
Output Language: ${selectedLanguage}

CRITICAL INSTRUCTIONS:
1. Output in ${selectedLanguage}. Keep technical, trade and financial terms standard.
2. Structure the roadmap into 3 to 4 sequential, chronological PHASES tailored to the "${bStage}" stage.
3. For each phase, provide 3 to 5 distinct, high-impact checklist action tasks.
4. Each task must have a clear title, estimated timeframe (e.g. Day 1-3, Week 2, Month 2), priority (CRITICAL, HIGH, or MEDIUM), actionable guidance/tips, and a verifiable deliverable/KPI.
5. Also provide an executive summary, top bottleneck to avoid, quick-win action, and graduation milestone.

You must return valid JSON in this exact structure:
{
  "businessName": "${bName}",
  "businessType": "${bType}",
  "stage": "${bStage}",
  "stageLabel": "${bStage}",
  "timeHorizon": "${bTimeframe}",
  "summary": "2-3 sentence strategic executive diagnosis of this stage",
  "keyBottleneckToAvoid": "The #1 trap businesses in this stage fall into",
  "recommendedQuickWin": "A high-impact action the business can complete in 48 hours",
  "graduationMilestone": "The metric or proof required to graduate to the next stage",
  "phases": [
    {
      "phaseNumber": 1,
      "title": "Phase 1: Foundation & Market Fit",
      "focus": "Core focus of this phase",
      "timeframe": "Weeks 1-2",
      "tasks": [
        {
          "id": "task-1-1",
          "title": "Actionable task name",
          "timeframe": "Day 1-3",
          "priority": "CRITICAL",
          "guidance": "Detailed practical execution tip and how to avoid mistakes.",
          "deliverable": "Concrete proof of completion"
        }
      ]
    }
  ]
}`;
    } else {
      prompt = `You are a senior commercial strategist and business growth advisor.
Tool Requested: ${resolvedTool}
Input Data: ${JSON.stringify(inputData || {})}
Target Output Language: ${selectedLanguage}

CRITICAL LANGUAGE INSTRUCTIONS:
1. Respond in the user's selected language: ${selectedLanguage}. All business advice, calculations explanations, steps, and deliverables MUST be in ${selectedLanguage}.
2. Preserve proper technical terms, brand names, URLs, formulas, and currencies where appropriate.

Provide a structured, highly actionable business deliverable in clear markdown format.
Be rigorous, realistic, and commercially sound. Do not invent fake statistics or guaranteed financial outcomes.`;
    }

    const { text, provider } = await generateAICompletion(prompt, { jsonMode: isRoadmap });

    let parsedRoadmap: any = null;
    let formattedText = text;

    if (isRoadmap) {
      try {
        parsedRoadmap = safeParseJson(text);
        if (parsedRoadmap && parsedRoadmap.phases && Array.isArray(parsedRoadmap.phases)) {
          const phaseMarkdown = parsedRoadmap.phases.map((p: any) => {
            const taskLines = (p.tasks || []).map((t: any) => 
              `- [ ] **[${t.priority || "HIGH"}] ${t.title}** (${t.timeframe || ""})\n  *Guidance:* ${t.guidance || ""}\n  *Deliverable:* ${t.deliverable || ""}`
            ).join("\n\n");
            return `### ${p.title} (${p.timeframe || ""})\n*Focus:* ${p.focus || ""}\n\n${taskLines}`;
          }).join("\n\n---\n\n");

          formattedText = `# Business Growth Roadmap: ${parsedRoadmap.businessName || "My Business"}\n**Stage:** ${parsedRoadmap.stageLabel || parsedRoadmap.stage} | **Horizon:** ${parsedRoadmap.timeHorizon || "90 Days"}\n\n> ${parsedRoadmap.summary || ""}\n\n**⚡ Quick Win (Next 48h):** ${parsedRoadmap.recommendedQuickWin || "Review roadmap tasks."}\n**⚠️ Pitfall to Avoid:** ${parsedRoadmap.keyBottleneckToAvoid || "Lack of focus."}\n**🎯 Next Stage Gate:** ${parsedRoadmap.graduationMilestone || "Achieve target MRR."}\n\n---\n\n${phaseMarkdown}`;
        }
      } catch (parseErr) {
        console.warn("Could not parse roadmap JSON, returning raw text:", parseErr);
      }
    }

    sendJsonResponse(res, 200, {
      success: true,
      data: {
        content: formattedText,
        roadmap: parsedRoadmap,
        source: provider,
      },
      roadmap: parsedRoadmap,
      content: formattedText,
      diagnosis: parsedRoadmap,
      provider,
    });
  } catch (err: unknown) {
    sendJsonResponse(res, 500, {
      success: false,
      error: normalizeServerErrorMessage(err),
    });
  }
}
