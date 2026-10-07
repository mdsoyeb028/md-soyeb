import dns from "dns/promises";

export interface SafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  maxRedirects?: number;
  timeoutMs?: number;
  maxBytes?: number;
}

export interface SafeFetchResponse {
  url: string;
  status: number;
  statusText: string;
  headers: Headers;
  buffer: Buffer;
  text: () => string;
}

/**
 * Checks if an IPv4 or IPv6 address is private, loopback, link-local,
 * metadata address (including AWS/GCP 169.254.169.254), or reserved.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const trimmed = ip.trim();
  if (trimmed.includes(".")) {
    const parts = trimmed.split(".").map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true;
    }
    const [a, b] = parts;
    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 10.0.0.0/8 (Private)
    if (a === 10) return true;
    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 (Link-local & Cloud Instance Metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (a === 192 && b === 0) return true;
    // 198.18.0.0/15 (Network benchmark tests)
    if (a === 198 && (b === 18 || b === 19)) return true;
    // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (TEST-NET)
    if (a === 192 && b === 0 && parts[2] === 2) return true;
    if (a === 198 && b === 51 && parts[2] === 100) return true;
    if (a === 203 && b === 0 && parts[2] === 113) return true;
    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
    if (a >= 224) return true;
    return false;
  }

  const lower = trimmed.toLowerCase();
  // IPv6 loopback and unspecified
  if (lower === "::1" || lower === "::" || lower === "0:0:0:0:0:0:0:1" || lower === "0:0:0:0:0:0:0:0") {
    return true;
  }
  // IPv6 link-local (fe80::/10)
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
    return true;
  }
  // IPv6 unique local addresses (fc00::/7)
  if (lower.startsWith("fc") || lower.startsWith("fd")) {
    return true;
  }
  // IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1 or ::ffff:169.254.169.254)
  if (lower.startsWith("::ffff:")) {
    const ipv4Part = lower.substring(7);
    return isPrivateOrReservedIp(ipv4Part);
  }
  return false;
}

/**
 * Validates a target URL against SSRF rules:
 * 1. Must be http or https
 * 2. Hostname must be valid and non-local
 * 3. Resolves DNS and verifies all IP addresses are public
 */
export async function validatePublicUrl(targetUrl: string): Promise<URL> {
  let urlStr = targetUrl.trim();
  if (!urlStr) {
    throw new Error("URL cannot be empty.");
  }

  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = "https://" + urlStr;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error("Invalid URL format. Please provide a valid address.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Unsupported URL protocol. Only HTTP and HTTPS are permitted.");
  }

  const hostname = parsed.hostname;
  if (!hostname || hostname.length > 253) {
    throw new Error("Invalid hostname specified.");
  }

  const lowerHost = hostname.toLowerCase();
  const blockedHosts = [
    "localhost",
    "local",
    "invalid",
    "internal",
    "metadata.google.internal",
    "metadata",
    "instance-data",
  ];

  if (
    blockedHosts.includes(lowerHost) ||
    lowerHost.endsWith(".localhost") ||
    lowerHost.endsWith(".local") ||
    lowerHost.endsWith(".internal")
  ) {
    throw new Error("Access to local or private hostnames is prohibited for security reasons.");
  }

  // If hostname is directly an IP literal
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(":")) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error("SSRF Protection: Access to private, loopback, or cloud-metadata IP addresses is blocked.");
    }
    return parsed;
  }

  // Resolve DNS to verify all IP addresses
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`Could not resolve hostname "${hostname}". Please check that the domain exists.`);
    }

    for (const addr of addresses) {
      if (isPrivateOrReservedIp(addr.address)) {
        throw new Error("SSRF Protection: Domain resolves to a private, loopback, or cloud-metadata network address.");
      }
    }
  } catch (dnsErr: unknown) {
    if (dnsErr instanceof Error && dnsErr.message.includes("SSRF Protection")) {
      throw dnsErr;
    }
    throw new Error(`DNS resolution failed for hostname "${hostname}": ${dnsErr instanceof Error ? dnsErr.message : "Unresolved"}`);
  }

  return parsed;
}

/**
 * Performs a safe HTTP/HTTPS fetch with SSRF guard, redirect validation,
 * max 8s timeout, and max 2MB response size limit.
 */
export async function safeFetch(
  initialUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResponse> {
  const maxRedirects = options.maxRedirects ?? 3;
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024; // 2MB

  let currentUrl = initialUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const validatedUrl = await validatePublicUrl(currentUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(validatedUrl.toString(), {
        method: options.method || "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BusinessSecurityCrawler/2.0; +https://md-soyeb.vercel.app)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          ...(options.headers || {}),
        },
        body: options.body,
        redirect: "manual", // Handle redirects manually to enforce SSRF validation at every hop!
        signal: controller.signal,
      });

      // Handle Redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        clearTimeout(timer);
        const location = response.headers.get("location");
        if (!location) {
          throw new Error(`Received redirect status ${response.status} without Location header.`);
        }
        redirectsCount++;
        if (redirectsCount > maxRedirects) {
          throw new Error(`Exceeded maximum allowed redirects (${maxRedirects}).`);
        }
        currentUrl = new URL(location, validatedUrl).toString();
        continue;
      }

      // Stream with max size limit
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            totalBytes += value.length;
            if (totalBytes > maxBytes) {
              reader.cancel();
              throw new Error(`Response size exceeded maximum allowed limit of ${Math.round(maxBytes / (1024 * 1024))}MB.`);
            }
            chunks.push(value);
          }
        }
      }

      clearTimeout(timer);
      const fullBuffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));

      return {
        url: validatedUrl.toString(),
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        buffer: fullBuffer,
        text: () => fullBuffer.toString("utf-8"),
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Request timed out after ${timeoutMs}ms.`);
      }
      throw err;
    }
  }

  throw new Error(`Exceeded maximum redirects (${maxRedirects}).`);
}
