export type BusinessUrlPlatform =
  | "website"
  | "youtube_video"
  | "youtube_channel"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "google_business"
  | "google_play"
  | "apple_app_store"
  | "other_business";

export interface DetectedUrlInfo {
  url: string;
  normalizedUrl: string;
  platform: BusinessUrlPlatform;
  label: string;
  badgeText: string;
  identifier?: string;
}

export function detectUrlPlatform(inputUrl: string): DetectedUrlInfo {
  let trimmed = (inputUrl || "").trim();
  if (!trimmed) {
    return {
      url: "",
      normalizedUrl: "",
      platform: "website",
      label: "Website",
      badgeText: "Website",
    };
  }

  // Auto-prepend https:// if missing protocol
  let normalized = trimmed;
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    // 1. YouTube Video vs Channel
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      if (host.includes("youtu.be") || pathname.includes("/watch") || pathname.includes("/shorts/")) {
        let videoId = "";
        if (host.includes("youtu.be")) {
          videoId = pathname.replace(/^\//, "").split("/")[0];
        } else if (pathname.includes("/shorts/")) {
          videoId = pathname.split("/shorts/")[1]?.split("/")[0] || "";
        } else {
          videoId = parsed.searchParams.get("v") || "";
        }
        return {
          url: trimmed,
          normalizedUrl: normalized,
          platform: "youtube_video",
          label: "YouTube Video",
          badgeText: "✓ YouTube Video detected",
          identifier: videoId,
        };
      }

      // YouTube Channel / Handle
      let handleOrChannel = "";
      if (pathname.startsWith("/@")) {
        handleOrChannel = pathname.slice(1).split("/")[0];
      } else if (pathname.includes("/channel/") || pathname.includes("/c/") || pathname.includes("/user/")) {
        const parts = pathname.split("/").filter(Boolean);
        handleOrChannel = parts[1] || "";
      }
      return {
        url: trimmed,
        normalizedUrl: normalized,
        platform: "youtube_channel",
        label: "YouTube Channel",
        badgeText: "✓ YouTube Channel detected",
        identifier: handleOrChannel,
      };
    }

    // 2. Instagram
    if (host.includes("instagram.com") || host.includes("instagr.am")) {
      const handle = pathname.split("/").filter(Boolean)[0] || "";
      return {
        url: trimmed,
        normalizedUrl: normalized,
        platform: "instagram",
        label: "Instagram Business",
        badgeText: "✓ Instagram detected",
        identifier: handle.replace(/^@/, ""),
      };
    }

    // 3. Google Play Store
    if (host.includes("play.google.com")) {
      const appId = parsed.searchParams.get("id") || "";
      return {
        url: trimmed,
        normalizedUrl: normalized,
        platform: "google_play",
        label: "Google Play Store App",
        badgeText: "✓ Android App detected",
        identifier: appId,
      };
    }

    // 4. Apple App Store
    if (host.includes("apps.apple.com") || host.includes("itunes.apple.com")) {
      const idMatch = pathname.match(/id(\d+)/i);
      const appId = idMatch ? idMatch[1] : "";
      return {
        url: trimmed,
        normalizedUrl: normalized,
        platform: "apple_app_store",
        label: "Apple App Store",
        badgeText: "✓ iOS App detected",
        identifier: appId,
      };
    }

    // 5. Google Business Profile / Google Maps
    if (
      host.includes("business.google.com") ||
      host.includes("maps.google.com") ||
      (host.includes("google.com") && pathname.includes("/maps")) ||
      host.includes("g.page") ||
      host.includes("maps.app.goo.gl") ||
      host.includes("goo.gl")
    ) {
      return {
        url: trimmed,
        normalizedUrl: normalized,
        platform: "google_business",
        label: "Google Business Profile",
        badgeText: "✓ Google Business Profile detected",
      };
    }

    // 6. Facebook
    if (host.includes("facebook.com") || host.includes("fb.com") || host.includes("fb.watch")) {
      return {
        url: trimmed,
        normalizedUrl: normalized,
        platform: "facebook",
        label: "Facebook Business Page",
        badgeText: "✓ Facebook detected",
      };
    }

    // 7. LinkedIn
    if (host.includes("linkedin.com")) {
      return {
        url: trimmed,
        normalizedUrl: normalized,
        platform: "linkedin",
        label: "LinkedIn Company / Profile",
        badgeText: "✓ LinkedIn detected",
      };
    }

    // 8. Default website
    return {
      url: trimmed,
      normalizedUrl: normalized,
      platform: "website",
      label: "Website",
      badgeText: "✓ Website detected",
      identifier: host,
    };
  } catch {
    return {
      url: trimmed,
      normalizedUrl: normalized,
      platform: "website",
      label: "Website",
      badgeText: "✓ Website detected",
    };
  }
}
