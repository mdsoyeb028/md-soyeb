import { generateAICompletion } from "./aiProvider";
import { BusinessAgentConfig, AgentActionTask } from "../types";

export interface CreateAgentInput {
  name: string;
  industry: string;
  location: string;
  country?: string;
  city?: string;
  website?: string;
  productsServices?: string;
  targetCustomers?: string;
  description?: string;
  preferredLanguage?: string;
  brandTone?: string;
  socialUrls?: string[];
  businessGoals?: string;
  customInstructions?: string;
  userId?: string;
}

export interface GeneratedAgentProfile {
  agent: BusinessAgentConfig;
  customSystemPrompt: string;
  recommendedWorkflowTemplates: Array<{
    title: string;
    description: string;
    category: string;
  }>;
  initialSuggestedTasks: Array<{
    title: string;
    category: AgentActionTask["category"];
    actionType: string;
    previewContent: string;
    estimatedCostOrBudget: string;
    targetPlatform: string;
  }>;
  quickPrompts: string[];
}

export async function generateBusinessAgentProfile(
  input: CreateAgentInput
): Promise<GeneratedAgentProfile> {
  const language = input.preferredLanguage || "English";

  const prompt = `You are an AI Business Operations Architect.
Generate a tailored Business AI Agent configuration for this specific business:

Business Name: ${input.name}
Industry: ${input.industry}
Location: ${input.location}
Website: ${input.website || "None provided"}
Products/Services: ${input.productsServices || "General products/services"}
Target Customers: ${input.targetCustomers || "General buyers"}
Description: ${input.description || ""}
Brand Tone: ${input.brandTone || "Professional & Growth-Oriented"}
Business Goals: ${input.businessGoals || "Increase customer acquisition and streamline repetitive operations"}
Custom Instructions: ${input.customInstructions || "None"}
Language: ${language}

Strict Rules:
- Support arbitrary legitimate businesses (do not restrict to only common examples).
- Produce practical, work-reducing workflows: repetitive research, repetitive writing, customer response drafting, ad plans, marketing planning.
- Remember: the agent NEVER executes external actions automatically; everything is drafted for human approval.

Return pure JSON matching this exact structure:
{
  "customSystemPrompt": "Full detailed system prompt for this specific business agent",
  "recommendedWorkflowTemplates": [
    { "title": "...", "description": "...", "category": "sales | marketing | support | research | seo" },
    { "title": "...", "description": "...", "category": "..." },
    { "title": "...", "description": "...", "category": "..." }
  ],
  "initialSuggestedTasks": [
    {
      "title": "Clear action title",
      "category": "marketing | sales | support | seo | outreach | ads | content | general",
      "actionType": "draft_outreach | ad_setup | website_copy | review_response",
      "previewContent": "Exact ready-to-use drafted content for the business owner to review",
      "estimatedCostOrBudget": "$0 (Organic) or suggested budget",
      "targetPlatform": "WhatsApp | Google | Meta | Website | Email"
    },
    {
      "title": "Second action title",
      "category": "sales",
      "actionType": "sales_followup",
      "previewContent": "Exact drafted followup script",
      "estimatedCostOrBudget": "$0",
      "targetPlatform": "WhatsApp"
    }
  ],
  "quickPrompts": [
    "Prompt 1 tailored to this business",
    "Prompt 2 tailored to this business",
    "Prompt 3 tailored to this business",
    "Prompt 4 tailored to this business"
  ]
}`;

  const completion = await generateAICompletion(prompt, {
    jsonMode: true,
    systemPrompt: "You are an AI Business Agent Architect that outputs valid JSON only.",
  });

  let parsed: any = {};
  try {
    const cleanJson = completion.text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    parsed = JSON.parse(cleanJson);
  } catch (err) {
    console.warn("JSON parse fallback in businessAgentGenerator:", err);
    parsed = {
      customSystemPrompt: `Dedicated AI Business Agent for ${input.name} in the ${input.industry} sector.`,
      recommendedWorkflowTemplates: [
        { title: "Customer Inquiries & Support", description: `Draft instant responses for ${input.name} inquiries`, category: "support" },
        { title: "Lead Generation & Outreach", description: "Prepare personalized WhatsApp and email outreach", category: "sales" },
        { title: "Marketing & Social Content", description: `Create high-converting content for ${input.industry} audience`, category: "marketing" }
      ],
      initialSuggestedTasks: [
        {
          title: `Draft 24-Hour WhatsApp Response for ${input.name}`,
          category: "support",
          actionType: "draft_outreach",
          previewContent: `Hi, thank you for reaching out to ${input.name}! How can we assist you with our ${input.productsServices || "services"} today?`,
          estimatedCostOrBudget: "$0",
          targetPlatform: "WhatsApp"
        }
      ],
      quickPrompts: [
        `How can ${input.name} get 10 new customers this month?`,
        `Write a cold outreach message for ${input.targetCustomers || "our clients"}`,
        `Analyze my website conversion bottlenecks`,
        `Create a 7-day marketing plan for ${input.name}`
      ]
    };
  }

  const agentConfig: BusinessAgentConfig = {
    id: `agent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: input.userId || "anonymous",
    name: input.name.trim(),
    industry: input.industry.trim(),
    location: input.location.trim(),
    website: input.website?.trim() || "",
    productsServices: input.productsServices?.trim() || "",
    targetCustomers: input.targetCustomers?.trim() || "",
    description: input.description?.trim() || "",
    preferredLanguage: language,
    brandTone: input.brandTone?.trim() || "Professional & Growth-Oriented",
    socialUrls: input.socialUrls || [],
    businessGoals: input.businessGoals?.trim() || "",
    customInstructions: `${parsed.customSystemPrompt || ""}\n${input.customInstructions || ""}`.trim(),
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    agent: agentConfig,
    customSystemPrompt: parsed.customSystemPrompt || "",
    recommendedWorkflowTemplates: parsed.recommendedWorkflowTemplates || [],
    initialSuggestedTasks: parsed.initialSuggestedTasks || [],
    quickPrompts: parsed.quickPrompts || [],
  };
}
