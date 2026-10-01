import { performRealSeoAudit } from "./seoCrawler";
import { performRealResearch } from "./researchEngine";
import { performMultiLinkPresenceAnalysis } from "./presenceAnalyzer";
import { 
  inspectWebsiteTracking, 
  inspectYouTubePublic, 
  inspectStoreListing, 
  buildRealTrafficDiagnosis 
} from "./realTrafficAnalytics";
import { analyzeBusinessScreenshot } from "./screenshotAnalyzer";
import { 
  generateCustomerAcquisitionPlan, 
  generateAdsPlan, 
  generateProblemFixPlan 
} from "./problemSolver";
import { generateAICompletion } from "./aiProvider";
import { BusinessAgentConfig } from "../types";

export type SupportedAgentTool =
  | "analyzeWebsite"
  | "analyzeYouTube"
  | "analyzeSocial"
  | "analyzeApp"
  | "analyzeImage"
  | "analyzeDocument"
  | "analyzeBusiness"
  | "analyzeSEO"
  | "analyzeTraffic"
  | "researchWeb"
  | "analyzeCompetitors"
  | "generateMarketingPlan"
  | "generateSalesPlan"
  | "generateAdPlan"
  | "generateSocialContent"
  | "generateSEOContent"
  | "generateCustomerReply"
  | "generateReport"
  | "createTask"
  | "saveReport";

export interface ToolExecutionParams {
  tool: SupportedAgentTool;
  args: Record<string, any>;
  agentConfig: BusinessAgentConfig;
  language?: string;
}

export interface ToolExecutionResult {
  tool: SupportedAgentTool;
  success: boolean;
  data: any;
  summary: string;
  sourceLabel: string;
  error?: string;
}

export async function executeAgentTool(params: ToolExecutionParams): Promise<ToolExecutionResult> {
  const { tool, args, agentConfig, language = "English" } = params;

  try {
    switch (tool) {
      case "analyzeWebsite":
      case "analyzeSEO": {
        const url = args.url || agentConfig.website;
        if (!url || typeof url !== "string") {
          return {
            tool,
            success: false,
            data: null,
            summary: "Website URL is required.",
            sourceLabel: "OBSERVED",
            error: "No website URL provided.",
          };
        }
        const audit = await performRealSeoAudit(url.trim());
        return {
          tool,
          success: true,
          data: audit,
          summary: `Inspected ${audit.normalizedUrl}: SEO Health Score ${audit.score}/100 with ${audit.suggestions?.length || 0} technical signals evaluated.`,
          sourceLabel: "OBSERVED",
        };
      }

      case "analyzeYouTube": {
        const url = args.url;
        if (!url || typeof url !== "string") {
          return {
            tool,
            success: false,
            data: null,
            summary: "YouTube video or channel URL required.",
            sourceLabel: "OFFICIAL_DATA",
            error: "No YouTube URL provided.",
          };
        }
        const ytData = await inspectYouTubePublic(url.trim());
        return {
          tool,
          success: true,
          data: ytData,
          summary: ytData.isPubliclyAccessible 
            ? `YouTube resource evaluated: "${ytData.title || "Video"}" by ${ytData.authorName || "Channel"}. Status: Publicly Accessible.`
            : `YouTube resource inspection complete: ${ytData.limitationNotice || "Restricted/Private"}.`,
          sourceLabel: "OFFICIAL_DATA",
        };
      }

      case "analyzeSocial": {
        const urls = args.urls || (agentConfig.socialUrls && agentConfig.socialUrls.length > 0 ? agentConfig.socialUrls : [args.url]);
        const cleanUrls = Array.isArray(urls) ? urls.filter(Boolean) : [urls].filter(Boolean);
        if (cleanUrls.length === 0) {
          return {
            tool,
            success: false,
            data: null,
            summary: "Social media profile URL required.",
            sourceLabel: "OBSERVED",
            error: "No social URL provided.",
          };
        }
        const result = await performMultiLinkPresenceAnalysis(cleanUrls);
        return {
          tool,
          success: true,
          data: result,
          summary: `Evaluated ${result.analyzed_links?.length || 0} social channels for cross-platform trust and reach.`,
          sourceLabel: "OBSERVED",
        };
      }

      case "analyzeApp": {
        const url = args.url;
        if (!url) {
          return {
            tool,
            success: false,
            data: null,
            summary: "Google Play or Apple App Store URL required.",
            sourceLabel: "OBSERVED",
            error: "No App Store URL provided.",
          };
        }
        const appData = await inspectStoreListing(String(url).trim());
        return {
          tool,
          success: true,
          data: appData,
          summary: `Listing evaluated: ${appData.title || "App"} (${appData.platform}). Rating: ${appData.rating || "N/A"}.`,
          sourceLabel: "OBSERVED",
        };
      }

      case "analyzeImage": {
        const { imageBase64, mimeType } = args;
        if (!imageBase64) {
          return {
            tool,
            success: false,
            data: null,
            summary: "Image base64 data required.",
            sourceLabel: "OBSERVED",
            error: "No image provided.",
          };
        }
        const imgResult = await analyzeBusinessScreenshot({
          imageBase64,
          imageMimeType: mimeType || "image/png",
          imageType: args.imageType || "analytics",
          language,
          userNotes: args.notes || "",
        });
        return {
          tool,
          success: true,
          data: imgResult,
          summary: `Visual analysis complete: ${(imgResult.theProblem || imgResult.whatISee || "").slice(0, 80)}...`,
          sourceLabel: "OBSERVED",
        };
      }

      case "analyzeDocument": {
        const { documentText, documentName } = args;
        const textToAnalyze = documentText || args.extractedText || "";
        if (!textToAnalyze || textToAnalyze.length < 5) {
          return {
            tool,
            success: false,
            data: null,
            summary: "Document text could not be extracted.",
            sourceLabel: "OBSERVED",
            error: "Empty document text.",
          };
        }
        const summaryPrompt = `Analyze this business document for ${agentConfig.name} (${agentConfig.industry}):
Document: "${documentName || "Uploaded Document"}"
Content:
${textToAnalyze.slice(0, 3000)}

Extract:
1. Core business facts
2. Product/Pricing information
3. Customer obligations or policies
4. Key takeaway for the AI agent to remember
Language: ${language}`;

        const summaryRes = await generateAICompletion(summaryPrompt);

        return {
          tool,
          success: true,
          data: {
            documentName,
            length: textToAnalyze.length,
            extractedSummary: summaryRes.text,
          },
          summary: `Document "${documentName || "File"}" parsed and integrated into business context.`,
          sourceLabel: "OBSERVED",
        };
      }

      case "analyzeTraffic": {
        const url = args.url || agentConfig.website;
        let trackingData: any = null;
        if (url) {
          try {
            trackingData = await inspectWebsiteTracking(url);
          } catch {
            // non blocking
          }
        }
        const diagnosis = buildRealTrafficDiagnosis({
          websiteTracking: trackingData,
          gscData: args.gscData || null,
          ga4Data: args.ga4Data || null,
          youtubeData: args.youtubeData || null,
        });
        return {
          tool,
          success: true,
          data: { trackingData, diagnosis },
          summary: `Traffic bottleneck diagnosis evaluated across ${diagnosis.funnel.length} funnel stages.`,
          sourceLabel: "OBSERVED",
        };
      }

      case "researchWeb": {
        const query = args.query || `${agentConfig.industry} market benchmarks and buyers`;
        const research = await performRealResearch(query, {
          businessName: agentConfig.name,
          industry: agentConfig.industry,
          city: agentConfig.location,
        });
        return {
          tool,
          success: true,
          data: research,
          summary: `Verified ${research.sources.length} live research sources for "${query}".`,
          sourceLabel: "RESEARCHED",
        };
      }

      case "analyzeCompetitors": {
        const competitors = args.competitors || "Local and digital competitors";
        const prompt = `Conduct a realistic competitor differentiation analysis for:
Business: ${agentConfig.name} (${agentConfig.industry}, ${agentConfig.location})
Products: ${agentConfig.productsServices}
Competitor Context: ${competitors}

Provide:
1. Differentiation Matrix (Why buy from ${agentConfig.name} vs competitors)
2. Pricing & Trust Positioning
3. 3 Immediate advantages to highlight in marketing
Language: ${language}`;

        const compRes = await generateAICompletion(prompt);
        return {
          tool,
          success: true,
          data: { analysis: compRes.text },
          summary: `Competitor differentiation analysis prepared for ${agentConfig.name}.`,
          sourceLabel: "RESEARCHED",
        };
      }

      case "generateMarketingPlan": {
        const plan = await generateProblemFixPlan(
          `Marketing & Acquisition Plan for ${agentConfig.name}`,
          `Industry: ${agentConfig.industry}, Products: ${agentConfig.productsServices}`,
          `Location: ${agentConfig.location}, Goals: ${agentConfig.businessGoals}`,
          language
        );
        return {
          tool,
          success: true,
          data: plan,
          summary: `7-Day and 30-Day marketing roadmap prepared with ready headlines and WhatsApp CTA.`,
          sourceLabel: "PREPARED_BY_AI",
        };
      }

      case "generateSalesPlan": {
        const plan = await generateCustomerAcquisitionPlan(
          args.query || `How to get more paying clients for ${agentConfig.name}`,
          `Industry: ${agentConfig.industry}, Products: ${agentConfig.productsServices}, Location: ${agentConfig.location}`,
          language
        );
        return {
          tool,
          success: true,
          data: plan,
          summary: `Sales acquisition strategy prepared with channel comparisons and outreach scripts.`,
          sourceLabel: "PREPARED_BY_AI",
        };
      }

      case "generateAdPlan": {
        const plan = await generateAdsPlan({
          platform: args.platform || "Google Ads",
          productService: agentConfig.productsServices || agentConfig.industry,
          targetLocation: agentConfig.location,
          monthlyBudget: args.budget || "$150 / month",
          language,
        });
        return {
          tool,
          success: true,
          data: plan,
          summary: `Advertising campaign drafted for ${args.platform || "Google Ads"} targeting ${agentConfig.location}.`,
          sourceLabel: "PREPARED_BY_AI",
        };
      }

      case "generateSocialContent": {
        const prompt = `Generate a 7-day social media plan for ${agentConfig.name} (${agentConfig.industry}).
Products/Services: ${agentConfig.productsServices}
Brand Tone: ${agentConfig.brandTone}
Language: ${language}

Create:
Day 1 to Day 7:
- Hook (First 3 seconds / headline)
- Visual concept
- Caption & Call to Action (Comment/DM)
- Suggested hashtags`;

        const socialRes = await generateAICompletion(prompt);
        return {
          tool,
          success: true,
          data: { contentPlan: socialRes.text },
          summary: `7-Day social content calendar drafted for ${agentConfig.name}.`,
          sourceLabel: "PREPARED_BY_AI",
        };
      }

      case "generateSEOContent": {
        const prompt = `Generate on-page SEO meta tags and schema markup for:
Business: ${agentConfig.name}
Industry: ${agentConfig.industry}
Location: ${agentConfig.location}
Website: ${agentConfig.website || "https://example.com"}
Language: ${language}

Provide:
1. Primary Title Tag (< 60 chars)
2. Meta Description (< 155 chars)
3. H1 Heading option
4. JSON-LD LocalBusiness or Organization schema snippet`;

        const seoRes = await generateAICompletion(prompt);
        return {
          tool,
          success: true,
          data: { seoContent: seoRes.text },
          summary: `SEO meta tags and structured schema generated.`,
          sourceLabel: "PREPARED_BY_AI",
        };
      }

      case "generateCustomerReply": {
        const inquiry = args.customerInquiry || "Customer asked for price and portfolio";
        const prompt = `Draft a polite, high-converting customer response for ${agentConfig.name} (${agentConfig.industry}):
Customer Inquiry: "${inquiry}"
Products/Services: ${agentConfig.productsServices}
Brand Tone: ${agentConfig.brandTone}
Language: ${language}

Provide:
1. Instant WhatsApp / SMS reply (< 300 chars)
2. Detailed Email reply
3. 2 Next-step qualification questions`;

        const replyRes = await generateAICompletion(prompt);
        return {
          tool,
          success: true,
          data: { replies: replyRes.text },
          summary: `Customer reply prepared for approval.`,
          sourceLabel: "PREPARED_BY_AI",
        };
      }

      case "analyzeBusiness": {
        const fixPlan = await generateProblemFixPlan(
          args.challenge || "Business growth and operational bottleneck diagnosis",
          `Industry: ${agentConfig.industry}, Products: ${agentConfig.productsServices}`,
          `Location: ${agentConfig.location}, Goals: ${agentConfig.businessGoals}`,
          language
        );
        return {
          tool,
          success: true,
          data: fixPlan,
          summary: `Comprehensive business diagnosis completed with immediate priority action.`,
          sourceLabel: "PREPARED_BY_AI",
        };
      }

      case "createTask": {
        const task = {
          id: `task_${Date.now()}`,
          title: args.title || "New Business Task",
          description: args.description || "",
          category: args.category || "marketing",
          status: args.status || "TODO",
          preparedContent: args.preparedContent || "",
          requiresApproval: Boolean(args.requiresApproval ?? true),
          createdAt: new Date().toISOString(),
        };
        return {
          tool,
          success: true,
          data: task,
          summary: `Created task "${task.title}" with status: ${task.status}.`,
          sourceLabel: "USER_PROVIDED",
        };
      }

      case "generateReport":
      case "saveReport": {
        const title = args.title || `${agentConfig.name} Performance & Operations Report`;
        const report = {
          id: `report_${Date.now()}`,
          title,
          type: "business",
          category: args.category || "Business Operations",
          summary: args.summary || `Executive growth brief for ${agentConfig.name}`,
          content: args.content || `Full report generated on ${new Date().toLocaleDateString()}`,
          createdAt: new Date().toISOString(),
        };
        return {
          tool,
          success: true,
          data: report,
          summary: `Report "${report.title}" ready to save to your cloud vault.`,
          sourceLabel: "PREPARED_BY_AI",
        };
      }

      default:
        return {
          tool,
          success: false,
          data: null,
          summary: `Unknown tool: ${tool}`,
          sourceLabel: "ERROR",
          error: `Tool ${tool} is not implemented.`,
        };
    }
  } catch (err: unknown) {
    return {
      tool,
      success: false,
      data: null,
      summary: `Failed to execute ${tool}.`,
      sourceLabel: "ERROR",
      error: String(err),
    };
  }
}
