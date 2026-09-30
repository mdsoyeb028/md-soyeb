import { parse } from "node-html-parser";

/**
 * Real Traffic Analytics & Multi-Source Performance Engine
 * 
 * Strict Integrity & Truth Rules:
 * 1. Do NOT use mock/demo traffic.
 * 2. Do NOT invent visitors, views, clicks, followers, leads, sales, rankings, revenue, conversion rates or competitors.
 * 3. If real data is unavailable, clearly return "Data unavailable / connect required" or "Not connected".
 * 4. Never present estimated numbers as actual numbers.
 * 5. Every data point must be classified: OBSERVED | USER PROVIDED | RESEARCHED | INFERRED | ESTIMATED | NEEDS VERIFICATION.
 */

export type DataLabel = 
  | "OBSERVED"
  | "USER PROVIDED"
  | "RESEARCHED"
  | "INFERRED"
  | "ESTIMATED"
  | "NEEDS VERIFICATION";

export interface IntegrationConnectionStatus {
  service: "ga4" | "gsc" | "youtube" | "meta" | "app_store";
  name: string;
  connected: boolean;
  message: string;
  setupGuideUrl: string;
  docsSource: string;
  availableMetrics: string[];
}

export interface RealWebsiteTrackingSignals {
  url: string;
  hasGa4Tag: boolean;
  ga4MeasurementIds: string[];
  hasGtmTag: boolean;
  gtmContainerIds: string[];
  hasSearchConsoleVerification: boolean;
  verificationTokens: string[];
  hasSitemap: boolean;
  sitemapUrl?: string;
  hasRobotsTxt: boolean;
  title?: string;
  metaDescription?: string;
  headingsCount: { h1: number; h2: number };
  detectedCtas: string[];
  statusMessage: string;
}

export interface RealYouTubePublicData {
  url: string;
  type: "video" | "channel";
  title?: string;
  authorName?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
  views?: string; // Real extracted or "Not publicly provided"
  publishDate?: string;
  channelId?: string;
  videoId?: string;
  isPubliclyAccessible: boolean;
  observedInsights: string[];
  limitationNotice: string;
  label: DataLabel;
}

export interface RealStoreListingData {
  url: string;
  platform: "google_play" | "apple_app_store";
  appId?: string;
  title?: string;
  developer?: string;
  category?: string;
  rating?: string; // Real extracted star rating e.g. "4.6"
  reviewsCount?: string; // Real e.g. "12.4K reviews"
  downloadsTier?: string; // Real e.g. "1,000,000+" or "10K+"
  contentRating?: string;
  isPubliclyAccessible: boolean;
  observedFindings: string[];
  label: DataLabel;
}

export interface TrafficFunnelStage {
  stageId: string;
  name: string;
  hindiExplanation: string;
  connected: boolean;
  value: number | null;
  displayValue: string; // e.g. "1,240" or "Not connected"
  label: DataLabel;
  note: string;
}

export interface TrafficSourceItem {
  id: string;
  source: string;
  sharePercent: number | null; // null if not connected
  connected: boolean;
  displayShare: string; // e.g. "54%" or "Not connected"
  whatItMeans: string;
  currentPerformance: string;
  problem: string;
  possibleReason: string;
  recommendedAction: string;
  metricToMonitor: string;
}

export interface DiagnosticCardItem {
  id: string;
  category: "critical" | "attention" | "opportunity" | "working_well";
  categoryEmoji: "🔴" | "🟠" | "🟡" | "🟢";
  categoryTitle: string;
  metricName: string;
  observedData: string;
  problem: string;
  possibleCause: string;
  evidence: string;
  whatToFix: string;
  howToFixIt: string;
  expectedMetricToMonitor: string;
  dataLabel: DataLabel;
  canFixWithAI: boolean;
}

export interface TrafficDiagnosisResult {
  funnel: TrafficFunnelStage[];
  sources: TrafficSourceItem[];
  diagnosticCards: DiagnosticCardItem[];
  integrationsStatus: IntegrationConnectionStatus[];
  summaryNote: string;
}

/**
 * Returns real connection status of configured analytics integrations
 */
export function getAnalyticsIntegrationsStatus(): IntegrationConnectionStatus[] {
  const hasGa4 = Boolean(process.env.GA4_PROPERTY_ID && (process.env.GA4_CLIENT_EMAIL || process.env.GOOGLE_APPLICATION_CREDENTIALS));
  const hasGsc = Boolean(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL && (process.env.GSC_CLIENT_EMAIL || process.env.GOOGLE_APPLICATION_CREDENTIALS));
  const hasYouTube = Boolean(process.env.YOUTUBE_DATA_API_KEY || process.env.GOOGLE_API_KEY);
  const hasMeta = Boolean(process.env.META_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN);

  return [
    {
      service: "ga4",
      name: "Google Analytics 4",
      connected: hasGa4,
      message: hasGa4 
        ? "Connected to Google Analytics 4 property via server credentials."
        : "Connect Google Analytics to see website traffic.",
      setupGuideUrl: "https://support.google.com/analytics/answer/9304153",
      docsSource: "Google Analytics official documentation (Google Support)",
      availableMetrics: hasGa4 
        ? ["Users", "Sessions", "Pageviews", "Traffic Sources", "Engagement Rate"]
        : ["Unavailable — Connect GA4 property in server configuration"],
    },
    {
      service: "gsc",
      name: "Google Search Console",
      connected: hasGsc,
      message: hasGsc
        ? "Connected to Search Console property."
        : "Connect Search Console to see Google search performance.",
      setupGuideUrl: "https://developers.google.com/webmaster-tools/v1/searchanalytics",
      docsSource: "Google Search Central official documentation",
      availableMetrics: hasGsc
        ? ["Search Impressions", "Clicks", "CTR", "Average Position", "Top Queries"]
        : ["Unavailable — Connect Search Console property in server configuration"],
    },
    {
      service: "youtube",
      name: "YouTube Data API",
      connected: hasYouTube,
      message: hasYouTube
        ? "Connected to YouTube Data API v3."
        : "Connect YouTube to see channel/video performance.",
      setupGuideUrl: "https://developers.google.com/youtube/v3/getting-started",
      docsSource: "YouTube Developers official documentation",
      availableMetrics: hasYouTube
        ? ["Channel Subscribers", "Video Views", "Publishing Recency", "Public Statistics"]
        : ["Public oEmbed & HTML inspection available for any public URL"],
    },
    {
      service: "meta",
      name: "Meta / Instagram Graph API",
      connected: hasMeta,
      message: hasMeta
        ? "Connected to Meta Graph API."
        : "Meta / Instagram API not connected. Public bio & link inspection available.",
      setupGuideUrl: "https://developers.facebook.com/docs/instagram-api/",
      docsSource: "Meta for Developers documentation",
      availableMetrics: hasMeta
        ? ["Account Insights", "Media Reach", "Interactions"]
        : ["Public Profile Metadata Only"],
    },
    {
      service: "app_store",
      name: "Google Play / Apple App Store",
      connected: true, // Live public listing parser is enabled without private keys
      message: "Public listing inspection enabled for Google Play & iOS App Store.",
      setupGuideUrl: "https://support.google.com/googleplay/android-developer",
      docsSource: "Google Play Console & Apple App Store documentation",
      availableMetrics: ["Public Rating", "Review Count", "Downloads Range", "App Category", "Developer Info"],
    },
  ];
}

/**
 * Real website tracking inspection:
 * Fetches the user's public website HTML and detects real tracking scripts,
 * GA4 tags (G-XXXXXXXXXX), Google Tag Manager (GTM-XXXXXX), and Search Console tags.
 */
export async function inspectWebsiteTracking(targetUrl: string): Promise<RealWebsiteTrackingSignals> {
  let url = targetUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  const result: RealWebsiteTrackingSignals = {
    url,
    hasGa4Tag: false,
    ga4MeasurementIds: [],
    hasGtmTag: false,
    gtmContainerIds: [],
    hasSearchConsoleVerification: false,
    verificationTokens: [],
    hasSitemap: false,
    hasRobotsTxt: false,
    headingsCount: { h1: 0, h2: 0 },
    detectedCtas: [],
    statusMessage: "Inspecting live website...",
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BusinessDiagnosticSystem/1.0; +https://md-soyeb.vercel.app/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      result.statusMessage = `HTTP ${res.status}: Target website returned error.`;
      return result;
    }

    const html = await res.text();
    const root = parse(html);

    // Extract Title & Meta Description
    const titleTag = root.querySelector("title");
    result.title = titleTag ? titleTag.text.trim() : undefined;

    const metaDesc = root.querySelector("meta[name='description'], meta[property='og:description']");
    result.metaDescription = metaDesc ? metaDesc.getAttribute("content")?.trim() : undefined;

    // Detect GA4 measurement IDs: G-[A-Z0-9]{8,12}
    const ga4Matches = html.match(/G-[A-Z0-9]{8,14}/gi) || [];
    const uniqueGa4 = Array.from(new Set(ga4Matches));
    result.hasGa4Tag = uniqueGa4.length > 0;
    result.ga4MeasurementIds = uniqueGa4;

    // Detect GTM container IDs: GTM-[A-Z0-9]{5,10}
    const gtmMatches = html.match(/GTM-[A-Z0-9]{5,10}/gi) || [];
    const uniqueGtm = Array.from(new Set(gtmMatches));
    result.hasGtmTag = uniqueGtm.length > 0;
    result.gtmContainerIds = uniqueGtm;

    // Detect Google Search Console verification meta tag
    const gscMetas = root.querySelectorAll("meta[name='google-site-verification']");
    gscMetas.forEach((meta) => {
      const content = meta.getAttribute("content");
      if (content) result.verificationTokens.push(content);
    });
    result.hasSearchConsoleVerification = result.verificationTokens.length > 0;

    // Count H1 and H2
    result.headingsCount.h1 = root.querySelectorAll("h1").length;
    result.headingsCount.h2 = root.querySelectorAll("h2").length;

    // Detect prominent CTAs
    const buttons = root.querySelectorAll("a, button");
    const foundCtas: string[] = [];
    buttons.forEach((el) => {
      const text = el.text.trim();
      if (text && text.length < 35 && /contact|call|order|quote|buy|whatsapp|get started|book|enquire|sign up|demo/i.test(text)) {
        if (!foundCtas.includes(text) && foundCtas.length < 5) {
          foundCtas.push(text);
        }
      }
    });
    result.detectedCtas = foundCtas;

    // Probe robots.txt and sitemap.xml
    try {
      const parsedUrl = new URL(url);
      const origin = parsedUrl.origin;
      const robotsUrl = `${origin}/robots.txt`;
      const robotsRes = await fetch(robotsUrl, { method: "HEAD" }).catch(() => null);
      if (robotsRes && robotsRes.ok) {
        result.hasRobotsTxt = true;
      }
      const sitemapUrl = `${origin}/sitemap.xml`;
      const sitemapRes = await fetch(sitemapUrl, { method: "HEAD" }).catch(() => null);
      if (sitemapRes && sitemapRes.ok) {
        result.hasSitemap = true;
        result.sitemapUrl = sitemapUrl;
      }
    } catch {
      // Ignore URL parsing errors for robots probe
    }

    result.statusMessage = "Website live inspection completed successfully.";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    result.statusMessage = `Could not inspect website: ${msg}`;
  }

  return result;
}

/**
 * Real YouTube live public data extractor (oEmbed & public HTML)
 * Strictly does not invent numbers.
 */
export async function inspectYouTubePublic(targetUrl: string): Promise<RealYouTubePublicData> {
  const isChannel = /youtube\.com\/(?:@|channel\/|c\/)/i.test(targetUrl);
  const result: RealYouTubePublicData = {
    url: targetUrl,
    type: isChannel ? "channel" : "video",
    isPubliclyAccessible: false,
    observedInsights: [],
    limitationNotice: "YouTube Data API is required for full watch time, subscriber counts, and retention curves. Publicly accessible metadata shown.",
    label: "OBSERVED",
  };

  try {
    // 1. YouTube oEmbed endpoint (Official Google API)
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
    const res = await fetch(oembedUrl, {
      headers: { "User-Agent": "BusinessDiagnosticSystem/1.0" },
    });

    if (res.ok) {
      const data = await res.json();
      result.isPubliclyAccessible = true;
      result.title = data.title;
      result.authorName = data.author_name;
      result.authorUrl = data.author_url;
      result.thumbnailUrl = data.thumbnail_url;
      result.observedInsights.push(`Observed Author/Channel: "${data.author_name}"`);
      result.observedInsights.push(`Observed Title: "${data.title}"`);
    } else {
      result.observedInsights.push("YouTube oEmbed returned no data. Video or channel may be private, age-restricted, or removed.");
    }

    // 2. Fetch public HTML for video views or publish date if it is a video
    if (!isChannel) {
      try {
        const vidRes = await fetch(targetUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        });
        if (vidRes.ok) {
          const html = await vidRes.text();
          const viewMatch = html.match(/"viewCount":"(\d+)"/) || html.match(/([\d,]+)\s+views/i);
          if (viewMatch && viewMatch[1]) {
            result.views = `${parseInt(viewMatch[1].replace(/,/g, ""), 10).toLocaleString()} views`;
            result.observedInsights.push(`Observed Public View Count: ${result.views}`);
          }
          const dateMatch = html.match(/"uploadDate":"([^"]+)"/) || html.match(/"dateText":\{"simpleText":"([^"]+)"\}/);
          if (dateMatch && dateMatch[1]) {
            result.publishDate = dateMatch[1];
            result.observedInsights.push(`Observed Publish Date: ${dateMatch[1]}`);
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
  } catch (err: unknown) {
    result.observedInsights.push(`Could not fetch YouTube data: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
}

/**
 * Real Google Play or Apple App Store public listing extractor
 * Strictly does not invent numbers.
 */
export async function inspectStoreListing(targetUrl: string): Promise<RealStoreListingData> {
  const isPlayStore = targetUrl.includes("play.google.com");
  const platform = isPlayStore ? "google_play" : "apple_app_store";

  const result: RealStoreListingData = {
    url: targetUrl,
    platform,
    isPubliclyAccessible: false,
    observedFindings: [],
    label: "OBSERVED",
  };

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });

    if (res.ok) {
      const html = await res.text();
      const root = parse(html);
      result.isPubliclyAccessible = true;

      if (isPlayStore) {
        // Google Play listing parsing
        const titleEl = root.querySelector("h1[itemprop='name']") || root.querySelector("h1");
        result.title = titleEl ? titleEl.text.trim() : undefined;

        // Rating
        const ratingMatch = html.match(/aria-label="Rated ([0-9.]+) stars out of five/i) || html.match(/"ratingValue":"([0-9.]+)"/);
        if (ratingMatch) {
          result.rating = `${ratingMatch[1]} / 5.0`;
          result.observedFindings.push(`Observed Rating: ${result.rating}`);
        }

        // Reviews
        const reviewsMatch = html.match(/([0-9.,KMBkmb]+)\s+reviews/i) || html.match(/"ratingCount":"([0-9]+)"/);
        if (reviewsMatch) {
          result.reviewsCount = reviewsMatch[1] + " reviews";
          result.observedFindings.push(`Observed Reviews Count: ${result.reviewsCount}`);
        }

        // Downloads
        const downloadsMatch = html.match(/([0-9.,KMBkmb+]+\s+downloads|[0-9.,KMBkmb+]+\+?\s+Downloads)/i);
        if (downloadsMatch) {
          result.downloadsTier = downloadsMatch[0];
          result.observedFindings.push(`Observed Installs Tier: ${result.downloadsTier}`);
        }
      } else {
        // Apple App Store listing parsing
        const titleEl = root.querySelector("h1.product-header__title") || root.querySelector("h1");
        result.title = titleEl ? titleEl.text.replace(/[\n\r]+/g, " ").trim() : undefined;

        const ratingMatch = html.match(/class="we-customer-ratings__averages__display">([0-9.]+)<\/span>/) || html.match(/"ratingValue":\s*([0-9.]+)/);
        if (ratingMatch) {
          result.rating = `${ratingMatch[1]} / 5.0`;
          result.observedFindings.push(`Observed App Store Rating: ${result.rating}`);
        }

        const ratingCountMatch = html.match(/([0-9.,KMBkmb]+)\s+Ratings/i);
        if (ratingCountMatch) {
          result.reviewsCount = ratingCountMatch[0];
          result.observedFindings.push(`Observed Ratings Count: ${result.reviewsCount}`);
        }
      }

      if (result.title) {
        result.observedFindings.push(`Observed App Title: "${result.title}"`);
      }
    } else {
      result.observedFindings.push(`Listing returned HTTP ${res.status}. Verify the URL is a public app listing.`);
    }
  } catch (err: unknown) {
    result.observedFindings.push(`Listing lookup failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
}

/**
 * Builds the Real Traffic Diagnosis based purely on available data.
 * If data is missing, sets displayValue = "Not connected" and does NOT invent 0 or fake numbers.
 */
export function buildRealTrafficDiagnosis(options: {
  websiteTracking?: RealWebsiteTrackingSignals | null;
  gscData?: { impressions?: number; clicks?: number; ctr?: number; position?: number } | null;
  ga4Data?: { users?: number; sessions?: number; pageviews?: number } | null;
  youtubeData?: RealYouTubePublicData | null;
}): TrafficDiagnosisResult {
  const { websiteTracking, gscData, ga4Data, youtubeData } = options;

  // 1. Build Funnel (Strictly NO fake data: show "Not connected" where missing)
  const funnel: TrafficFunnelStage[] = [
    {
      stageId: "discovery",
      name: "Discovery & Impressions",
      hindiExplanation: "Kitni baar aapka business logon ke samne aaya.",
      connected: Boolean(gscData?.impressions !== undefined),
      value: gscData?.impressions ?? null,
      displayValue: gscData?.impressions !== undefined ? gscData.impressions.toLocaleString() : "Not connected",
      label: gscData?.impressions !== undefined ? "OBSERVED" : "NEEDS VERIFICATION",
      note: gscData?.impressions !== undefined 
        ? `Real Google Search Impressions observed.`
        : "Connect Google Search Console to see real search impressions.",
    },
    {
      stageId: "search_social_clicks",
      name: "Search / Social Clicks",
      hindiExplanation: "Kitne logon ne search ya social result dekhkar click kiya.",
      connected: Boolean(gscData?.clicks !== undefined),
      value: gscData?.clicks ?? null,
      displayValue: gscData?.clicks !== undefined ? gscData.clicks.toLocaleString() : "Not connected",
      label: gscData?.clicks !== undefined ? "OBSERVED" : "NEEDS VERIFICATION",
      note: gscData?.clicks !== undefined 
        ? `Real Google Clicks observed.`
        : "Connect Search Console to see real organic clicks.",
    },
    {
      stageId: "website_visit",
      name: "Website Visits / Users",
      hindiExplanation: "Kitne log aapki website ya landing page par aaye.",
      connected: Boolean(ga4Data?.users !== undefined),
      value: ga4Data?.users ?? null,
      displayValue: ga4Data?.users !== undefined ? ga4Data.users.toLocaleString() : "Not connected",
      label: ga4Data?.users !== undefined ? "OBSERVED" : "NEEDS VERIFICATION",
      note: ga4Data?.users !== undefined 
        ? `Real GA4 Users observed.`
        : "Connect Google Analytics 4 to see real visitors.",
    },
    {
      stageId: "landing_page_sessions",
      name: "Landing Page Engaged Sessions",
      hindiExplanation: "Kitne logon ne landing page par time spend kiya.",
      connected: Boolean(ga4Data?.sessions !== undefined),
      value: ga4Data?.sessions ?? null,
      displayValue: ga4Data?.sessions !== undefined ? ga4Data.sessions.toLocaleString() : "Not connected",
      label: ga4Data?.sessions !== undefined ? "OBSERVED" : "NEEDS VERIFICATION",
      note: ga4Data?.sessions !== undefined 
        ? `Real GA4 Sessions observed.`
        : "Connect GA4 to track session engagement.",
    },
    {
      stageId: "lead_enquiry",
      name: "Leads & Enquiries",
      hindiExplanation: "Kitne logon ne contact form bhara, WhatsApp click kiya ya call kiya.",
      connected: false,
      value: null,
      displayValue: "Not connected",
      label: "NEEDS VERIFICATION",
      note: "Connect CRM, Form tracking, or WhatsApp link events to see verified leads.",
    },
    {
      stageId: "customer",
      name: "Paying Customers",
      hindiExplanation: "Kitne visitors ne deal close ki ya purchase kiya.",
      connected: false,
      value: null,
      displayValue: "Not connected",
      label: "NEEDS VERIFICATION",
      note: "Connect payment gateway or CRM to see real paying customers.",
    },
    {
      stageId: "repeat_customer",
      name: "Repeat Customers",
      hindiExplanation: "Kitne puraane customers ne dobara order ya service li.",
      connected: false,
      value: null,
      displayValue: "Not connected",
      label: "NEEDS VERIFICATION",
      note: "Connect billing or retention database to monitor repeat buyers.",
    },
  ];

  // 2. Build Sources Breakdown
  const sources: TrafficSourceItem[] = [
    {
      id: "google_search",
      source: "Google Search (Organic)",
      sharePercent: gscData?.clicks ? 100 : null,
      connected: Boolean(gscData?.clicks !== undefined),
      displayShare: gscData?.clicks !== undefined ? `${gscData.clicks.toLocaleString()} clicks` : "Not connected",
      whatItMeans: "People finding your business via Google queries and clicking into your pages.",
      currentPerformance: gscData ? `CTR: ${(gscData.ctr || 0).toFixed(2)}% | Avg Position: ${(gscData.position || 0).toFixed(1)}` : "No data connected.",
      problem: gscData && (gscData.ctr || 0) < 2.0 && (gscData.impressions || 0) > 100 
        ? "High impressions but comparatively low CTR." 
        : "Connect Search Console to identify search query bottlenecks.",
      possibleReason: "Title tags and meta descriptions may not match user intent or offer a compelling reason to click.",
      recommendedAction: "Rewrite title tags to include high-intent keywords, clear customer value, and active verbs.",
      metricToMonitor: "Organic Search CTR and Clicks in Search Console.",
    },
    {
      id: "direct_traffic",
      source: "Direct Traffic",
      sharePercent: null,
      connected: Boolean(ga4Data?.sessions !== undefined),
      displayShare: "Not connected",
      whatItMeans: "Visitors who type your URL directly, use bookmarks, or click untagged links in messaging apps.",
      currentPerformance: "GA4 not connected.",
      problem: "Unable to verify brand recall or direct traffic without connected GA4 property.",
      possibleReason: "Offline or direct word-of-mouth visibility is untracked.",
      recommendedAction: "Install Google Analytics 4 tracking tag on all website pages.",
      metricToMonitor: "Direct Sessions & New Users in GA4.",
    },
    {
      id: "social_traffic",
      source: "Social Media (Instagram / YouTube / LinkedIn)",
      sharePercent: null,
      connected: Boolean(youtubeData?.isPubliclyAccessible),
      displayShare: youtubeData?.views ? `YouTube: ${youtubeData.views}` : "Not connected",
      whatItMeans: "Traffic coming from profiles, post captions, video descriptions, and bio links.",
      currentPerformance: youtubeData?.title ? `Inspected: "${youtubeData.title}"` : "Social traffic analytics not connected.",
      problem: "Lack of UTM tagging on social bio links makes social attribution invisible.",
      possibleReason: "Links in bio or video descriptions lack Campaign URL parameters (utm_source=youtube).",
      recommendedAction: "Add UTM tagged links to YouTube video descriptions and Instagram bio.",
      metricToMonitor: "Referral Sessions from youtube.com and instagram.com in GA4.",
    },
    {
      id: "referral_traffic",
      source: "Referral Traffic & Backlinks",
      sharePercent: null,
      connected: false,
      displayShare: "Not connected",
      whatItMeans: "Visitors referred from external blogs, partner websites, industry directories, or reviews.",
      currentPerformance: "Referral analytics not connected.",
      problem: "No verified external domain referral data connected.",
      possibleReason: "Lack of active outreach or directory listings.",
      recommendedAction: "Claim profiles on Google Business, industry associations, and verified partner websites.",
      metricToMonitor: "Referral Domains & Referral Clicks.",
    },
  ];

  // 3. Build Diagnostic Priority Cards
  const diagnosticCards: DiagnosticCardItem[] = [];

  // Card 1: Website Tracking Readiness
  if (websiteTracking) {
    if (!websiteTracking.hasGa4Tag && !websiteTracking.hasGtmTag) {
      diagnosticCards.push({
        id: "diag-tracking-missing",
        category: "critical",
        categoryEmoji: "🔴",
        categoryTitle: "Critical: Website Analytics Tag Missing",
        metricName: "Google Analytics / GTM Tag Detection",
        observedData: `Inspected live HTML of ${websiteTracking.url}. Found 0 GA4 measurement IDs and 0 GTM containers.`,
        problem: "Website visitor traffic cannot be recorded or analyzed because tracking script is absent.",
        possibleCause: "Analytics snippet was never installed in <head> or was accidentally removed during redesign.",
        evidence: "Live HTML search yielded no 'G-' or 'GTM-' script references.",
        whatToFix: "Install Google Analytics 4 tag (gtag.js) or Google Tag Manager container in the website <head> tag.",
        howToFixIt: "Go to Google Analytics > Admin > Data Streams > Web > copy the Google tag code and paste immediately after the opening <head> on every page.",
        expectedMetricToMonitor: "Real-time user count in Google Analytics 4 Realtime report.",
        dataLabel: "OBSERVED",
        canFixWithAI: true,
      });
    } else {
      diagnosticCards.push({
        id: "diag-tracking-active",
        category: "working_well",
        categoryEmoji: "🟢",
        categoryTitle: "Working Well: Tracking Tags Detected",
        metricName: "Google Analytics Tag Readiness",
        observedData: `Found active tags: ${[...websiteTracking.ga4MeasurementIds, ...websiteTracking.gtmContainerIds].join(", ")}`,
        problem: "None. Website has verified tracking scripts installed.",
        possibleCause: "Correct tracking code placement in website HTML.",
        evidence: `Verified measurement ID(s) present in page source.`,
        whatToFix: "Verify that custom conversion events (e.g. form_submit, click_whatsapp) are configured in GA4 Events.",
        howToFixIt: "In GA4 > Admin > Events > Mark key lead events as Conversions.",
        expectedMetricToMonitor: "Conversions count in GA4 Conversions report.",
        dataLabel: "OBSERVED",
        canFixWithAI: false,
      });
    }

    // Heading and Title SEO checks
    if (websiteTracking.headingsCount.h1 === 0) {
      diagnosticCards.push({
        id: "diag-h1-missing",
        category: "attention",
        categoryEmoji: "🟠",
        categoryTitle: "Needs Attention: Missing Primary Heading (H1)",
        metricName: "H1 Heading Tag",
        observedData: "0 <h1> tags found on the inspected page.",
        problem: "Search engines and first-time visitors lack a clear primary headline stating what your business provides.",
        possibleCause: "Page styling uses styled <div> or <p> tags instead of semantic <h1> element.",
        evidence: "HTML tag parser detected 0 <h1> elements.",
        whatToFix: "Add exactly one descriptive <h1> tag near the top containing your primary service and target city/market.",
        howToFixIt: "Replace the top banner text with: <h1 className='text-3xl font-bold'>[Your Core Service] for [Target Customer]</h1>.",
        expectedMetricToMonitor: "Google Search impressions for primary brand & service terms.",
        dataLabel: "OBSERVED",
        canFixWithAI: true,
      });
    }

    if (!websiteTracking.hasSitemap) {
      diagnosticCards.push({
        id: "diag-sitemap-missing",
        category: "opportunity",
        categoryEmoji: "🟡",
        categoryTitle: "Improvement Opportunity: Sitemap.xml Not Detected",
        metricName: "XML Sitemap Availability",
        observedData: "No accessible /sitemap.xml found at the root domain.",
        problem: "Google search spiders may take longer to discover new pages or sub-services on your website.",
        possibleCause: "Sitemap generator plugin or route was not created or robots.txt does not declare its URL.",
        evidence: "HTTP HEAD probe to /sitemap.xml did not return 200 OK.",
        whatToFix: "Generate a dynamic or static sitemap.xml and submit the link in Google Search Console > Sitemaps.",
        howToFixIt: "Create sitemap.xml listing all canonical URLs with lastmod dates and declare 'Sitemap: https://yourdomain.com/sitemap.xml' in robots.txt.",
        expectedMetricToMonitor: "Submitted pages indexed in Search Console Indexing report.",
        dataLabel: "OBSERVED",
        canFixWithAI: true,
      });
    }
  }

  // Card 2: Google Search Console CTR Diagnosis (when connected)
  if (gscData && gscData.impressions && gscData.clicks !== undefined) {
    const ctr = gscData.ctr ?? (gscData.impressions > 0 ? (gscData.clicks / gscData.impressions) * 100 : 0);
    if (ctr < 2.5 && gscData.impressions > 50) {
      diagnosticCards.push({
        id: "diag-search-ctr-low",
        category: "attention",
        categoryEmoji: "🟠",
        categoryTitle: "Needs Attention: Low Search Click-Through Rate (CTR)",
        metricName: "Google Search Organic CTR",
        observedData: `Impressions: ${gscData.impressions.toLocaleString()} | Clicks: ${gscData.clicks.toLocaleString()} | CTR: ${ctr.toFixed(2)}%`,
        problem: "Your search impressions are comparatively high, but clicks are low. People see your result on Google but choose other listings.",
        possibleCause: "Search title may not be attractive enough; meta description may not communicate the offer clearly; or ranking position is lower on page 1.",
        evidence: `CTR is ${ctr.toFixed(2)}%, below typical page 1 benchmark of 3-7%.`,
        whatToFix: "Rewrite the title tag and meta description for top impression pages with emotional hooks and clear value propositions.",
        howToFixIt: "Use format: '[Primary Service] in [Location] — [Specific Result / Offer]'. Keep title between 50-60 characters.",
        expectedMetricToMonitor: "Average CTR in Google Search Console over next 14 days.",
        dataLabel: "OBSERVED",
        canFixWithAI: true,
      });
    } else {
      diagnosticCards.push({
        id: "diag-search-ctr-good",
        category: "working_well",
        categoryEmoji: "🟢",
        categoryTitle: "Working Well: Search CTR Within Healthy Range",
        metricName: "Google Search Organic CTR",
        observedData: `Observed CTR: ${ctr.toFixed(2)}% across ${gscData.impressions.toLocaleString()} search impressions.`,
        problem: "None detected for this CTR bracket.",
        possibleCause: "Title tags match query intent reasonably well.",
        evidence: `CTR of ${ctr.toFixed(2)}% indicates visitors click your search snippet when shown.`,
        whatToFix: "Focus on publishing supporting topic cluster content to increase total impression volume.",
        howToFixIt: "Identify related questions from Search Console Search Analytics and build dedicated answering sections.",
        expectedMetricToMonitor: "Total clicks and average position in Search Console.",
        dataLabel: "OBSERVED",
        canFixWithAI: false,
      });
    }
  }

  // Fallback diagnostic card if no analytics connected at all
  if (diagnosticCards.length === 0) {
    diagnosticCards.push({
      id: "diag-connect-required",
      category: "attention",
      categoryEmoji: "🟠",
      categoryTitle: "Needs Attention: No Analytics Source Connected Yet",
      metricName: "Data Connectivity Status",
      observedData: "0 active data connections (GA4, Search Console, YouTube Data API).",
      problem: "No live analytics streams are connected to diagnose traffic bottlenecks.",
      possibleCause: "Website URL was not entered for inspection or API integrations are pending server setup.",
      evidence: "System has no recorded traffic metrics to calculate conversion or bounce rates.",
      whatToFix: "Enter your website URL above for instant live tag inspection, or connect Google Analytics / Search Console.",
      howToFixIt: "Paste your website link in the inspector box above and click 'Inspect Live Site'.",
      expectedMetricToMonitor: "Data connectivity status indicator.",
      dataLabel: "NEEDS VERIFICATION",
      canFixWithAI: false,
    });
  }

  return {
    funnel,
    sources,
    diagnosticCards,
    integrationsStatus: getAnalyticsIntegrationsStatus(),
    summaryNote: "All displayed numbers are derived strictly from real inspected sources. Where data is unintegrated, 'Not connected' is explicitly displayed. No estimates or simulations are treated as actual data.",
  };
}
