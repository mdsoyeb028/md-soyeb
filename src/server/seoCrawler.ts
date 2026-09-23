import dns from "dns/promises";
import { parse } from "node-html-parser";

export interface RealSeoAuditResult {
  score: number;
  url: string;
  normalizedUrl: string;
  responseTimeMs: number;
  pageSizeKb: number;
  isHttps: boolean;
  httpStatus: number;
  summary: string;
  technicalSeo: {
    mobile: string;
    speed: string;
    ssl: string;
    crawlability: string;
    coreWebVitalsNotice: string;
  };
  onPageSeo: {
    headings: string;
    contentQuality: string;
    internalLinks: string;
  };
  detectedData: {
    title: string;
    titleLength: number;
    metaDescription: string;
    descriptionLength: number;
    canonical: string | null;
    hasViewport: boolean;
    viewportContent: string | null;
    h1Count: number;
    h1Samples: string[];
    h2Count: number;
    h2Samples: string[];
    h3Count: number;
    totalImages: number;
    imagesWithAlt: number;
    imagesMissingAlt: number;
    internalLinksCount: number;
    externalLinksCount: number;
    robotsTxtFound: boolean;
    sitemapFound: boolean;
    wordCount: number;
  };
  keywords: Array<{
    term: string;
    volume: string;
    difficulty: string;
    intent: string;
  }>;
  keywordNotice: string;
  metaTitle: string;
  metaDescription: string;
  suggestions: Array<{
    priority: "Critical" | "High" | "Medium";
    title: string;
    action: string;
  }>;
  source: string;
}

// IP Range SSRF validator
function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 check
  if (ip.includes(".")) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // malformed IP
    }
    const [a, b] = parts;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 0.0.0.0/8
    if (a === 0) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (Link Local & Cloud Metadata like 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 100.64.0.0/10 (Carrier-Grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 192.0.0.0/24
    if (a === 192 && b === 0) return true;
    // 198.18.0.0/15 (Benchmark)
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return true;
    // 240.0.0.0/4 (Reserved)
    if (a >= 240) return true;
    return false;
  }

  // IPv6 check
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  // Unique local addresses (fc00::/7)
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  // Link-local unicast (fe80::/10)
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
  // IPv4-mapped IPv6 (::ffff:127.0.0.1)
  if (lower.includes("::ffff:")) {
    const v4Part = lower.split("::ffff:")[1];
    if (v4Part && isPrivateOrReservedIp(v4Part)) return true;
  }
  return false;
}

// Safely validate and resolve a target URL against SSRF
export async function validateAndResolveUrl(inputUrl: string): Promise<URL> {
  let target = inputUrl.trim();
  if (!target) {
    throw new Error("Website URL cannot be empty.");
  }

  // Auto-prepend https:// if missing scheme
  if (!/^https?:\/\//i.test(target)) {
    target = "https://" + target;
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    throw new Error("Invalid URL format. Please provide a valid website address (e.g., https://example.com).");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Unsupported URL protocol. Only HTTP and HTTPS are permitted.");
  }

  const hostname = parsed.hostname;
  if (!hostname || hostname.length > 253) {
    throw new Error("Invalid hostname specified.");
  }

  // Reject obvious local names immediately
  const blockedHosts = ["localhost", "local", "invalid", "internal", "metadata.google.internal"];
  if (blockedHosts.includes(hostname.toLowerCase()) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Access to local or private hostnames is prohibited for security reasons.");
  }

  // Resolve DNS to verify all IP addresses
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`Could not resolve hostname "${hostname}". Please check that the domain exists.`);
    }

    for (const addr of addresses) {
      if (isPrivateOrReservedIp(addr.address)) {
        throw new Error("Security Alert (SSRF Prevention): The specified domain resolves to a private, loopback, or cloud-metadata network address.");
      }
    }
  } catch (dnsErr: unknown) {
    if (dnsErr instanceof Error && dnsErr.message.includes("Security Alert")) {
      throw dnsErr;
    }
    throw new Error(`Domain lookup failed for "${hostname}". Please check that the URL is public and spelled correctly.`);
  }

  return parsed;
}

// Safely fetch public webpage with redirect protection, size limits, and timeout
async function safeFetchWebpage(targetUrl: URL): Promise<{
  html: string;
  statusCode: number;
  responseTimeMs: number;
  finalUrl: string;
  pageSizeBytes: number;
  isHttps: boolean;
}> {
  let currentUrl = targetUrl;
  let redirects = 0;
  const maxRedirects = 3;

  while (redirects <= maxRedirects) {
    // SSRF check on every hop
    currentUrl = await validateAndResolveUrl(currentUrl.toString());

    const startTime = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
      const response = await fetch(currentUrl.toString(), {
        method: "GET",
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BusinessHub-SEO-Auditor/1.0; +https://md-soyeb.vercel.app)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      const responseTimeMs = Math.round(performance.now() - startTime);

      // Handle redirect
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const locationHeader = response.headers.get("location");
        if (!locationHeader) {
          throw new Error(`Redirect HTTP ${response.status} returned without Location header.`);
        }
        currentUrl = new URL(locationHeader, currentUrl);
        redirects++;
        continue;
      }

      // Check status
      if (!response.ok && response.status !== 304) {
        throw new Error(`Target webpage returned HTTP error status ${response.status} (${response.statusText}).`);
      }

      // Read response body with maximum limit (2.5 MB)
      const reader = response.body?.getReader();
      if (!reader) {
        const text = await response.text();
        return {
          html: text,
          statusCode: response.status,
          responseTimeMs,
          finalUrl: currentUrl.toString(),
          pageSizeBytes: Buffer.byteLength(text, "utf-8"),
          isHttps: currentUrl.protocol === "https:",
        };
      }

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      const MAX_BYTES = 2.5 * 1024 * 1024;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalBytes += value.length;
          if (totalBytes > MAX_BYTES) {
            reader.cancel();
            break;
          }
        }
      }

      const fullBuffer = Buffer.concat(chunks);
      const htmlText = fullBuffer.toString("utf-8");

      return {
        html: htmlText,
        statusCode: response.status,
        responseTimeMs,
        finalUrl: currentUrl.toString(),
        pageSizeBytes: totalBytes,
        isHttps: currentUrl.protocol === "https:",
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error("Too many redirects encountered while attempting to fetch the webpage.");
}

// Safely probe robots.txt and sitemap
async function probeRobotsAndSitemap(originUrl: URL): Promise<{ robotsFound: boolean; sitemapFound: boolean; sitemapUrlFromRobots: string | null }> {
  let robotsFound = false;
  let sitemapFound = false;
  let sitemapUrlFromRobots: string | null = null;

  try {
    const robotsUrl = new URL("/robots.txt", originUrl.origin);
    await validateAndResolveUrl(robotsUrl.toString());

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(robotsUrl.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: { "User-Agent": "BusinessHub-SEO-Auditor/1.0" },
    });
    clearTimeout(timeout);

    if (res.ok) {
      robotsFound = true;
      const text = await res.text();
      const sitemapMatch = text.match(/Sitemap:\s*(https?:\/\/[^\s]+)/i);
      if (sitemapMatch && sitemapMatch[1]) {
        sitemapFound = true;
        sitemapUrlFromRobots = sitemapMatch[1].trim();
      }
    }
  } catch {
    // Non-fatal probe
  }

  if (!sitemapFound) {
    try {
      const sitemapProbeUrl = new URL("/sitemap.xml", originUrl.origin);
      await validateAndResolveUrl(sitemapProbeUrl.toString());

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(sitemapProbeUrl.toString(), {
        method: "HEAD",
        signal: controller.signal,
        headers: { "User-Agent": "BusinessHub-SEO-Auditor/1.0" },
      });
      clearTimeout(timeout);

      if (res.ok) {
        sitemapFound = true;
      }
    } catch {
      // Non-fatal probe
    }
  }

  return { robotsFound, sitemapFound, sitemapUrlFromRobots };
}

// Extract frequently occurring keywords from real content
function extractKeywordsFromPage(title: string, h1s: string[], h2s: string[], metaDesc: string, targetKeyword?: string): string[] {
  const terms: string[] = [];
  if (targetKeyword && targetKeyword.trim()) {
    terms.push(targetKeyword.trim());
  }

  const combined = [title, ...h1s, ...h2s, metaDesc].join(" ").toLowerCase();
  const cleaned = combined.replace(/[^a-z0-9\s-]/g, " ");
  const words = cleaned.split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  // 2-word phrases
  for (let i = 0; i < words.length - 1 && terms.length < 5; i++) {
    const phrase = `${words[i]} ${words[i + 1]}`;
    if (!terms.includes(phrase)) {
      terms.push(phrase);
    }
  }

  // 1-word terms if not enough
  for (const w of words) {
    if (terms.length >= 5) break;
    if (!terms.includes(w)) {
      terms.push(w);
    }
  }

  return terms.slice(0, 4);
}

const STOP_WORDS = new Set([
  "this", "that", "with", "from", "your", "have", "more", "will", "about",
  "their", "what", "which", "there", "when", "make", "like", "time", "just",
  "know", "take", "people", "into", "year", "good", "some", "could", "them",
  "other", "than", "then", "look", "only", "come", "over", "think", "also",
  "back", "after", "used", "work", "well", "even", "want", "because", "any",
  "these", "give", "day", "most", "us"
]);

// Main Audit Function
export async function performRealSeoAudit(targetUrlInput: string, targetKeyword?: string): Promise<RealSeoAuditResult> {
  const resolvedUrl = await validateAndResolveUrl(targetUrlInput);
  const fetchResult = await safeFetchWebpage(resolvedUrl);
  const { robotsFound, sitemapFound } = await probeRobotsAndSitemap(resolvedUrl);

  const root = parse(fetchResult.html);

  // 1. Title
  const titleEl = root.querySelector("title");
  const titleText = titleEl ? titleEl.text.trim() : "";
  const titleLength = titleText.length;

  // 2. Meta description
  const metaDescEl = root.querySelector('meta[name="description" i]') || root.querySelector('meta[property="og:description" i]');
  const metaDescText = metaDescEl ? (metaDescEl.getAttribute("content") || "").trim() : "";
  const descLength = metaDescText.length;

  // 3. Canonical
  const canonicalEl = root.querySelector('link[rel="canonical" i]');
  const canonicalHref = canonicalEl ? (canonicalEl.getAttribute("href") || "").trim() : null;

  // 4. Viewport (Mobile)
  const viewportEl = root.querySelector('meta[name="viewport" i]');
  const hasViewport = Boolean(viewportEl);
  const viewportContent = viewportEl ? viewportEl.getAttribute("content") || null : null;

  // 5. Headings
  const h1Els = root.querySelectorAll("h1");
  const h1Samples = h1Els.map((el) => el.text.trim()).filter(Boolean).slice(0, 3);
  const h1Count = h1Els.length;

  const h2Els = root.querySelectorAll("h2");
  const h2Samples = h2Els.map((el) => el.text.trim()).filter(Boolean).slice(0, 3);
  const h2Count = h2Els.length;

  const h3Els = root.querySelectorAll("h3");
  const h3Count = h3Els.length;

  // 6. Images & Alt
  const imgEls = root.querySelectorAll("img");
  const totalImages = imgEls.length;
  let imagesWithAlt = 0;
  for (const img of imgEls) {
    const alt = img.getAttribute("alt");
    if (alt && alt.trim().length > 0) {
      imagesWithAlt++;
    }
  }
  const imagesMissingAlt = totalImages - imagesWithAlt;

  // 7. Links
  const linkEls = root.querySelectorAll("a[href]");
  let internalLinksCount = 0;
  let externalLinksCount = 0;
  for (const a of linkEls) {
    const href = a.getAttribute("href") || "";
    if (href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:")) continue;
    if (href.startsWith("/") || href.includes(resolvedUrl.hostname)) {
      internalLinksCount++;
    } else if (/^https?:\/\//i.test(href)) {
      externalLinksCount++;
    }
  }

  // 8. Word count
  const bodyText = (root.querySelector("body")?.text || root.text || "").replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;
  const pageSizeKb = Math.round((fetchResult.pageSizeBytes / 1024) * 10) / 10;

  // Calculate Mathematical SEO Score
  let score = 0;

  // HTTPS (10 pts)
  if (fetchResult.isHttps) score += 10;

  // Response Time (10 pts)
  if (fetchResult.responseTimeMs < 1000) score += 10;
  else if (fetchResult.responseTimeMs < 2000) score += 7;
  else if (fetchResult.responseTimeMs < 4000) score += 4;
  else score += 1;

  // Mobile Viewport (15 pts)
  if (hasViewport) score += 15;

  // Title tag (15 pts total)
  if (titleLength > 0) {
    score += 10;
    if (titleLength >= 25 && titleLength <= 65) score += 5;
  }

  // Meta description (15 pts total)
  if (descLength > 0) {
    score += 10;
    if (descLength >= 50 && descLength <= 165) score += 5;
  }

  // H1 Tag (10 pts)
  if (h1Count === 1) score += 10;
  else if (h1Count > 1) score += 7;

  // H2 Tags (5 pts)
  if (h2Count > 0) score += 5;

  // Images with Alt (10 pts)
  if (totalImages === 0) {
    score += 10; // no images to penalize
  } else {
    const altRatio = imagesWithAlt / totalImages;
    score += Math.round(altRatio * 10);
  }

  // Canonical (5 pts)
  if (canonicalHref) score += 5;

  // Robots.txt (5 pts)
  if (robotsFound) score += 5;

  // Sitemap (5 pts)
  if (sitemapFound) score += 5;

  score = Math.min(100, Math.max(10, score));

  // Generate Prioritized Suggestions from ACTUAL detected data
  const suggestions: Array<{ priority: "Critical" | "High" | "Medium"; title: string; action: string }> = [];

  if (!fetchResult.isHttps) {
    suggestions.push({
      priority: "Critical",
      title: "Enable Secure HTTPS",
      action: "The website is serving traffic over unencrypted HTTP. Install an SSL/TLS certificate to protect users and avoid Google search ranking demotions.",
    });
  }

  if (!hasViewport) {
    suggestions.push({
      priority: "Critical",
      title: "Add Mobile Viewport Meta Tag",
      action: "Missing <meta name='viewport' content='width=device-width, initial-scale=1'> tag. Search engines penalize pages that fail mobile accessibility tests.",
    });
  }

  if (h1Count === 0) {
    suggestions.push({
      priority: "Critical",
      title: "Missing Primary <h1> Heading",
      action: "No <h1> heading was detected on this page. Add a single, clear <h1> describing the primary topic or commercial offering.",
    });
  } else if (h1Count > 1) {
    suggestions.push({
      priority: "Medium",
      title: "Multiple <h1> Headings Detected",
      action: `Found ${h1Count} <h1> tags. Best SEO practice is to maintain exactly one <h1> per page for semantic clarity.`,
    });
  }

  if (descLength === 0) {
    suggestions.push({
      priority: "High",
      title: "Write a Dedicated Meta Description",
      action: "No meta description found. Search engines will generate automated excerpts. Write a 120-160 character description with a clear call-to-action.",
    });
  } else if (descLength < 50) {
    suggestions.push({
      priority: "Medium",
      title: "Expand Short Meta Description",
      action: `Current meta description is only ${descLength} characters. Expand to 120-160 characters to maximize SERP click-through rate.`,
    });
  } else if (descLength > 165) {
    suggestions.push({
      priority: "Medium",
      title: "Shorten Long Meta Description",
      action: `Current meta description is ${descLength} characters and may be truncated on Google mobile search results.`,
    });
  }

  if (titleLength === 0) {
    suggestions.push({
      priority: "Critical",
      title: "Missing Page <title> Tag",
      action: "No <title> tag found. Specify a unique, keyword-rich title between 30 and 60 characters.",
    });
  } else if (titleLength < 25) {
    suggestions.push({
      priority: "Medium",
      title: "Lengthen Page Title",
      action: `Current title "${titleText}" is only ${titleLength} characters. Add brand name and primary commercial keyword.`,
    });
  } else if (titleLength > 65) {
    suggestions.push({
      priority: "Medium",
      title: "Optimize Title Length",
      action: `Current title is ${titleLength} characters and may be clipped in search result snippets. Aim for 45-60 characters.`,
    });
  }

  if (imagesMissingAlt > 0) {
    suggestions.push({
      priority: "High",
      title: `Add Alt Attributes to ${imagesMissingAlt} Image(s)`,
      action: `${imagesMissingAlt} of ${totalImages} image(s) lack an alt attribute. Descriptive alt text helps image indexing and improves web accessibility.`,
    });
  }

  if (!canonicalHref) {
    suggestions.push({
      priority: "Medium",
      title: "Specify Canonical Link Tag",
      action: "Add <link rel='canonical' href='...'> to prevent duplicate content consolidation issues.",
    });
  }

  if (!robotsFound) {
    suggestions.push({
      priority: "Medium",
      title: "Deploy robots.txt File",
      action: "robots.txt was not reachable at the root domain. Create a robots.txt file to guide search engine crawlers.",
    });
  }

  if (!sitemapFound) {
    suggestions.push({
      priority: "Medium",
      title: "Create and Submit XML Sitemap",
      action: "No sitemap detected in robots.txt or at /sitemap.xml. An XML sitemap helps search engines discover and index your pages faster.",
    });
  }

  if (fetchResult.responseTimeMs > 2500) {
    suggestions.push({
      priority: "High",
      title: "Improve Server Response Time",
      action: `Page response time was ${fetchResult.responseTimeMs}ms. Aim for under 1000ms by optimizing server-side execution and CDN caching.`,
    });
  }

  // Keywords extracted from actual page content
  const extractedTerms = extractKeywordsFromPage(titleText, h1Samples, h2Samples, metaDescText, targetKeyword);
  const keywords = extractedTerms.map((term, index) => ({
    term,
    volume: "Volume Unavailable (Requires Google Search Console / Ads API)",
    difficulty: "Competitive Index Unavailable (Requires live SEMrush/Ahrefs API)",
    intent: index === 0 ? "Commercial / Target Term" : index % 2 === 0 ? "Transactional" : "Informational",
  }));

  const summary = `Audited ${resolvedUrl.hostname} with status HTTP ${fetchResult.statusCode} (${fetchResult.responseTimeMs}ms). Detected ${h1Count} H1 heading, ${totalImages} image(s), and ${pageSizeKb} KB HTML payload. Overall detected SEO health score is ${score}/100 based on verified on-page technical factors.`;

  return {
    score,
    url: targetUrlInput,
    normalizedUrl: resolvedUrl.toString(),
    responseTimeMs: fetchResult.responseTimeMs,
    pageSizeKb,
    isHttps: fetchResult.isHttps,
    httpStatus: fetchResult.statusCode,
    summary,
    technicalSeo: {
      mobile: hasViewport ? `Responsive Viewport tag detected (${viewportContent || "standard"}).` : "FAIL: No mobile viewport meta tag detected.",
      speed: `Initial HTML server response time: ${fetchResult.responseTimeMs}ms. Page payload size: ${pageSizeKb} KB.`,
      ssl: fetchResult.isHttps ? "Secure HTTPS active." : "FAIL: Insecure HTTP connection detected.",
      crawlability: `robots.txt: ${robotsFound ? "Reachable" : "Not Found"}; XML Sitemap: ${sitemapFound ? "Detected" : "Not Found"}.`,
      coreWebVitalsNotice: "Real-user Core Web Vitals (LCP, CLS, INP) require Chrome UX Report (CrUX) or Google Search Console integration. Live CrUX data is unavailable without authorized property access.",
    },
    onPageSeo: {
      headings: `Found ${h1Count} H1 tag(s)${h1Samples[0] ? ' ("' + h1Samples[0].slice(0, 40) + '...")' : ""}, ${h2Count} H2 tag(s), and ${h3Count} H3 tag(s).`,
      contentQuality: `Page payload: ${pageSizeKb} KB (~${wordCount} words detected in visible DOM).`,
      internalLinks: `Detected ${internalLinksCount} internal link(s) and ${externalLinksCount} external link(s).`,
    },
    detectedData: {
      title: titleText,
      titleLength,
      metaDescription: metaDescText,
      descriptionLength: descLength,
      canonical: canonicalHref,
      hasViewport,
      viewportContent,
      h1Count,
      h1Samples,
      h2Count,
      h2Samples,
      h3Count,
      totalImages,
      imagesWithAlt,
      imagesMissingAlt,
      internalLinksCount,
      externalLinksCount,
      robotsTxtFound: robotsFound,
      sitemapFound,
      wordCount,
    },
    keywords,
    keywordNotice: "Notice: Live search volume, keyword difficulty, and impression numbers are not simulated or fabricated. They require authorized Google Search Console / Google Ads API credentials.",
    metaTitle: titleText || (targetKeyword ? `${targetKeyword} | Official Website` : "Homepage | Business Hub"),
    metaDescription: metaDescText || (targetKeyword ? `Learn more about our ${targetKeyword} with fast delivery and high quality.` : "Explore our products and services."),
    suggestions,
    source: "live-page-crawler",
  };
}
