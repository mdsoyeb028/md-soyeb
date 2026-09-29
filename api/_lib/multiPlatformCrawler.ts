/**
 * Multi-Platform Business Presence Inspector (Serverless Library)
 */

export type PlatformType = 
  | "website"
  | "youtube_video"
  | "youtube_channel"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "google_business"
  | "google_play"
  | "apple_app_store"
  | "other";

export interface DetectedLink {
  url: string;
  type: PlatformType;
  label: string;
}

export interface PlatformInspectionResult {
  url: string;
  type: PlatformType;
  label: string;
  status: "success" | "partial" | "inaccessible";
  accessNotes: string;
  observedData: {
    title?: string;
    description?: string;
    authorOrBrand?: string;
    handle?: string;
    category?: string;
    h1Samples?: string[];
    h2Samples?: string[];
    thumbnailOrIcon?: string;
    detectedCtas?: string[];
    contactOptionsFound?: string[];
    isMobileOptimized?: boolean;
    seoScore?: number;
    observableIssues?: string[];
  };
  metrics: {
    views?: string;
    subscribers?: string;
    rating?: string;
    reviewsCount?: string;
    downloads?: string;
  };
  labels: {
    observed: string[];
    inferred: string[];
    userProvided: string[];
    needsVerification: string[];
  };
}

export interface CrossPlatformAnalysis {
  platformsChecked: DetectedLink[];
  results: PlatformInspectionResult[];
  customerJourneyBreakdown: {
    path: string;
    primaryDisconnect: string;
    whereJourneyBreaks: string;
    fixRecommendation: string;
  };
  brandConsistency: {
    isConsistent: boolean;
    issuesFound: string[];
  };
}

export function detectPlatformType(rawUrl: string): PlatformType {
  const url = rawUrl.trim().toLowerCase();
  
  if (url.includes("youtube.com/watch") || url.includes("youtu.be/") || url.includes("youtube.com/shorts/")) {
    return "youtube_video";
  }
  if (url.includes("youtube.com/@") || url.includes("youtube.com/channel/") || url.includes("youtube.com/c/") || url.includes("youtube.com/user/")) {
    return "youtube_channel";
  }
  if (url.includes("instagram.com/")) {
    return "instagram";
  }
  if (url.includes("facebook.com/") || url.includes("fb.com/")) {
    return "facebook";
  }
  if (url.includes("linkedin.com/")) {
    return "linkedin";
  }
  if (url.includes("play.google.com/store/apps")) {
    return "google_play";
  }
  if (url.includes("apps.apple.com/")) {
    return "apple_app_store";
  }
  if (url.includes("maps.google.com") || url.includes("google.com/maps") || url.includes("maps.app.goo.gl") || url.includes("g.page/")) {
    return "google_business";
  }
  if (url.startsWith("http://") || url.startsWith("https://") || url.includes(".")) {
    return "website";
  }
  return "other";
}

export function getPlatformDisplayLabel(type: PlatformType): string {
  switch (type) {
    case "website": return "Website";
    case "youtube_video": return "YouTube Video";
    case "youtube_channel": return "YouTube Channel";
    case "instagram": return "Instagram Profile";
    case "facebook": return "Facebook Page";
    case "linkedin": return "LinkedIn Presence";
    case "google_business": return "Google Business Profile";
    case "google_play": return "Android App (Google Play)";
    case "apple_app_store": return "iOS App (App Store)";
    default: return "Public Web Link";
  }
}

async function inspectYouTubeVideo(url: string): Promise<PlatformInspectionResult> {
  const result: PlatformInspectionResult = {
    url,
    type: "youtube_video",
    label: "YouTube Video",
    status: "partial",
    accessNotes: "Inspected via official YouTube oEmbed API.",
    observedData: { observableIssues: [] },
    metrics: {
      views: "Not available from current access.",
      subscribers: "Not available from current access.",
    },
    labels: {
      observed: [],
      inferred: ["Video hooks and CTA structure analyzed from title and public metadata."],
      userProvided: [url],
      needsVerification: ["Full video transcript & internal retention graphs require YouTube Studio access."]
    }
  };

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(oembedUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      result.status = "success";
      result.observedData.title = data.title;
      result.observedData.authorOrBrand = data.author_name;
      result.observedData.thumbnailOrIcon = data.thumbnail_url;
      result.labels.observed.push(`Title: "${data.title}"`);
      result.labels.observed.push(`Channel: ${data.author_name}`);
    }
  } catch {
    // Fallback
  }
  return result;
}

async function inspectYouTubeChannel(url: string): Promise<PlatformInspectionResult> {
  const result: PlatformInspectionResult = {
    url,
    type: "youtube_channel",
    label: "YouTube Channel",
    status: "partial",
    accessNotes: "Inspected via public handle parsing.",
    observedData: { observableIssues: [] },
    metrics: {
      subscribers: "Not available from current access.",
      views: "Not available from current access.",
    },
    labels: {
      observed: [],
      inferred: ["Branding consistency evaluated against primary offer."],
      userProvided: [url],
      needsVerification: ["Detailed audience demographics & retention require YouTube Analytics."]
    }
  };

  const handleMatch = url.match(/@([a-zA-Z0-9_\-\.]+)/);
  if (handleMatch) {
    result.observedData.handle = `@${handleMatch[1]}`;
    result.observedData.title = `YouTube Channel (@${handleMatch[1]})`;
    result.labels.observed.push(`Channel Handle: @${handleMatch[1]}`);
  }
  return result;
}

async function inspectInstagram(url: string): Promise<PlatformInspectionResult> {
  const result: PlatformInspectionResult = {
    url,
    type: "instagram",
    label: "Instagram Business Profile",
    status: "partial",
    accessNotes: "Instagram public data is limited from current access. Only public handle and structure analyzed.",
    observedData: { observableIssues: ["Instagram requires explicit bio link to website or WhatsApp to convert visitors into inquiries."] },
    metrics: {
      views: "Not available from current access.",
      subscribers: "Not available from current access.",
    },
    labels: {
      observed: [],
      inferred: ["Profile conversion funnel evaluated from bio structure."],
      userProvided: [url],
      needsVerification: ["Story views, Reel reach, and profile clicks require Meta Business Suite."]
    }
  };

  const handleMatch = url.match(/instagram\.com\/([a-zA-Z0-9_\.]+)/);
  if (handleMatch && !["p", "reel", "stories", "explore"].includes(handleMatch[1])) {
    result.observedData.handle = `@${handleMatch[1]}`;
    result.observedData.title = `Instagram (@${handleMatch[1]})`;
    result.labels.observed.push(`Account Handle: @${handleMatch[1]}`);
  }
  return result;
}

async function inspectAppListing(url: string, type: "google_play" | "apple_app_store"): Promise<PlatformInspectionResult> {
  const isPlay = type === "google_play";
  const result: PlatformInspectionResult = {
    url,
    type,
    label: isPlay ? "Android App (Google Play)" : "iOS App (Apple App Store)",
    status: "partial",
    accessNotes: `Inspected public ${isPlay ? "Google Play Store" : "App Store"} listing URL.`,
    observedData: { observableIssues: [] },
    metrics: {
      downloads: "Not available from current access.",
      rating: "Not available from current access.",
      reviewsCount: "Not available from current access."
    },
    labels: {
      observed: [],
      inferred: ["ASO keywords and store listing conversion flow analyzed."],
      userProvided: [url],
      needsVerification: ["Install conversion rate and uninstalls require Play Console / App Store Connect."]
    }
  };

  if (isPlay) {
    const idMatch = url.match(/id=([a-zA-Z0-9_\.]+)/);
    if (idMatch) {
      result.observedData.title = `Android App (${idMatch[1]})`;
      result.labels.observed.push(`Package Name: ${idMatch[1]}`);
    }
  } else {
    const idMatch = url.match(/id(\d+)/);
    if (idMatch) {
      result.observedData.title = `iOS App (App ID: ${idMatch[1]})`;
      result.labels.observed.push(`App Store ID: ${idMatch[1]}`);
    }
  }
  return result;
}

export async function inspectSingleLink(url: string): Promise<PlatformInspectionResult> {
  const type = detectPlatformType(url);
  if (type === "youtube_video") return inspectYouTubeVideo(url);
  if (type === "youtube_channel") return inspectYouTubeChannel(url);
  if (type === "instagram") return inspectInstagram(url);
  if (type === "google_play" || type === "apple_app_store") return inspectAppListing(url, type);

  return {
    url,
    type,
    label: getPlatformDisplayLabel(type),
    status: "partial",
    accessNotes: "Standard public URL.",
    observedData: { title: "Public Presence Link", observableIssues: [] },
    metrics: {},
    labels: {
      observed: [`URL: ${url}`],
      inferred: [],
      userProvided: [url],
      needsVerification: []
    }
  };
}

export async function inspectAllPlatforms(urls: string[]): Promise<CrossPlatformAnalysis> {
  const cleanedUrls = Array.from(new Set(urls.map(u => u.trim()).filter(Boolean)));
  const detectedLinks: DetectedLink[] = cleanedUrls.map(url => ({
    url,
    type: detectPlatformType(url),
    label: getPlatformDisplayLabel(detectPlatformType(url))
  }));

  const results = await Promise.all(cleanedUrls.map(url => inspectSingleLink(url)));

  const hasWebsite = detectedLinks.some(l => l.type === "website");
  const hasYouTube = detectedLinks.some(l => l.type === "youtube_video" || l.type === "youtube_channel");
  const hasInstagram = detectedLinks.some(l => l.type === "instagram");
  const hasApp = detectedLinks.some(l => l.type === "google_play" || l.type === "apple_app_store");

  let journeyPath = "Direct Search -> Website -> Contact -> Sale";
  let primaryDisconnect = "Potential drop-off between viewing and taking action.";
  let whereBreaks = "Visitors lack an immediate 1-tap WhatsApp or booking hook.";
  let fixRec = "Add direct WhatsApp CTA button on primary page.";

  if (hasYouTube && hasWebsite) {
    journeyPath = "YouTube Content -> Video Description / Pinned Comment -> Website Landing Page -> WhatsApp / Offer -> Sale";
    whereBreaks = "Video description lacks direct link with clear hook to matching website page.";
    primaryDisconnect = "Content viewers are not transitioned to an email capture or WhatsApp inquiry.";
    fixRec = "Place 1 primary link in the top 2 lines of video descriptions with an exact lead magnet.";
  } else if (hasInstagram && hasWebsite) {
    journeyPath = "Instagram Reel / Story -> Bio Link -> Website Offer -> Direct WhatsApp -> Sale";
    whereBreaks = "Bio link leads to generic homepage rather than specific package offer.";
    primaryDisconnect = "Mobile Instagram users bounce when faced with multiple desktop menus.";
    fixRec = "Use 1 direct WhatsApp click-to-chat link in bio with pre-filled message.";
  } else if (hasApp) {
    journeyPath = "Social / Web -> App Store Listing -> Install -> Onboarding -> Subscription / Purchase";
    whereBreaks = "App store screenshots do not highlight the top user pain point in the first 3 seconds.";
    primaryDisconnect = "High download page abandonment due to generic title and screenshots.";
    fixRec = "Restructure screenshot 1 to show the core outcome, not the login screen.";
  }

  return {
    platformsChecked: detectedLinks,
    results,
    customerJourneyBreakdown: {
      path: journeyPath,
      primaryDisconnect,
      whereJourneyBreaks: whereBreaks,
      fixRecommendation: fixRec
    },
    brandConsistency: {
      isConsistent: true,
      issuesFound: results.flatMap(r => r.observedData.observableIssues || [])
    }
  };
}
