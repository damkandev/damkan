const ENDPOINT = "/api/analytics/track";

type EmbeddedBrowser = "linkedin" | "instagram" | "facebook" | "twitter" | "tiktok" | null;

const detectEmbedded = (): EmbeddedBrowser => {
  const ua = navigator.userAgent;
  if (ua.includes("LinkedIn")) return "linkedin";
  if (ua.includes("Instagram")) return "instagram";
  if (ua.includes("FBAV") || ua.includes("FBAN")) return "facebook";
  if (ua.includes("Twitter")) return "twitter";
  if (ua.includes("musical_ly")) return "tiktok";
  return null;
};

const sessionId = (() => {
  const seed = navigator.userAgent + Date.now() + Math.random();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
})();

const getUtmParams = (): Record<string, string> => {
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const val = params.get(key);
    if (val) result[key] = val;
  }
  return result;
};

const queue: (() => Promise<void>)[] = [];
let processing = false;

const send = async (payload: Record<string, unknown>) => {
  const attempt = async () => {
    try {
      await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // silently fail
    }
  };
  queue.push(attempt);
  if (!processing) {
    processing = true;
    while (queue.length > 0) {
      const task = queue.shift();
      if (task) await task();
    }
    processing = false;
  }
};

export const track = (event: string, metadata?: Record<string, string | number>) => {
  const payload: Record<string, unknown> = {
    ts: Date.now(),
    page: window.location.pathname,
    referrer: document.referrer || null,
    embedded: detectEmbedded(),
    sessionId,
    event,
    eventData: metadata || null,
    ...getUtmParams(),
  };
  void send(payload);
};

if (typeof window !== "undefined" && document.readyState !== "loading") {
  track("pageview");
} else {
  addEventListener("DOMContentLoaded", () => track("pageview"), { once: true });
}
