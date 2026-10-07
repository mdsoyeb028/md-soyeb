import { parseRequestBody, sendJsonResponse } from "../serverlessHttp.ts";
import { performRealSeoAudit } from "../seoCrawler.ts";
import { 
  inspectWebsiteTracking, 
  inspectYouTubePublic, 
  inspectStoreListing 
} from "../realTrafficAnalytics.ts";
import { 
  performMultiLinkPresenceAnalysis, 
  detectUrlPlatform 
} from "../presenceAnalyzer.ts";
import { normalizeServerErrorMessage } from "../aiProvider.ts";
import { UrlInputSchema } from "../schemas.ts";

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
    const rawBody = await parseRequestBody(req);
    const parsed = UrlInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errMsg = parsed.error.issues[0]?.message || "Invalid URL parameter.";
      sendJsonResponse(res, 400, { success: false, error: errMsg });
      return;
    }

    const { url } = parsed.data;
    const cleanUrl = url.trim();
    const detected = detectUrlPlatform(cleanUrl);
    const platform = detected.platform;

    let observedData: any = null;
    let summary = "";
    let dataLabel: "OBSERVED" | "RESEARCHED" | "NEEDS VERIFICATION" = "OBSERVED";
    let isConnected = true;

    if (platform === "website") {
      try {
        const [audit, tracking] = await Promise.allSettled([
          performRealSeoAudit(cleanUrl),
          inspectWebsiteTracking(cleanUrl),
        ]);
        observedData = {
          seoAudit: audit.status === "fulfilled" ? audit.value : null,
          trackingSignals: tracking.status === "fulfilled" ? tracking.value : null,
        };
        summary = `Observed Website: Real SEO Score ${observedData.seoAudit?.score || "N/A"}/100. Title: "${observedData.seoAudit?.title || "Not found"}". Found ${observedData.seoAudit?.suggestions?.length || 0} optimization opportunities.`;
      } catch (crawlErr) {
        observedData = { error: String(crawlErr) };
        summary = "Website could not be accessed or restricted by robots.txt / firewall.";
        dataLabel = "NEEDS VERIFICATION";
      }
    } else if (platform === "youtube_video" || platform === "youtube_channel") {
      try {
        const ytData = await inspectYouTubePublic(cleanUrl);
        observedData = ytData;
        summary = ytData.isPubliclyAccessible
          ? `Observed YouTube Resource: "${ytData.title || "Video"}" by ${ytData.authorName || "Channel"}. Status: Publicly Accessible.`
          : `YouTube resource check: ${ytData.limitationNotice || "Data unavailable"}.`;
      } catch {
        observedData = null;
        summary = "YouTube resource inspection complete: Data is not connected or restricted.";
        isConnected = false;
        dataLabel = "NEEDS VERIFICATION";
      }
    } else if (platform === "google_play" || platform === "apple_app_store") {
      try {
        const appData = await inspectStoreListing(cleanUrl);
        observedData = appData;
        summary = `Observed App Listing: "${appData.title || "App"}" (${appData.platform}). Star rating: ${appData.rating || "N/A"}.`;
      } catch {
        observedData = null;
        summary = "App store listing could not be extracted.";
        isConnected = false;
        dataLabel = "NEEDS VERIFICATION";
      }
    } else if (platform === "instagram" || platform === "google_business") {
      try {
        const presence = await performMultiLinkPresenceAnalysis([{ url: cleanUrl, platform }]);
        observedData = presence;
        summary = `Public channel evaluation complete. Status: ${presence.analyzed_links?.[0]?.status || "evaluated"}.`;
      } catch {
        observedData = null;
        summary = "Channel public presence check: Data is not connected.";
        isConnected = false;
        dataLabel = "NEEDS VERIFICATION";
      }
    } else {
      observedData = null;
      isConnected = false;
      summary = "URL type detected, but live API analysis is not currently supported for this private network.";
      dataLabel = "NEEDS VERIFICATION";
    }

    sendJsonResponse(res, 200, {
      success: true,
      url: cleanUrl,
      platform,
      isConnected,
      dataLabel,
      summary,
      observedData,
    });
  } catch (err: unknown) {
    sendJsonResponse(res, 500, { success: false, error: normalizeServerErrorMessage(err) });
  }
}
