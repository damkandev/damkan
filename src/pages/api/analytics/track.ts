import type { APIRoute } from "astro";
import { readFile, writeFile, mkdir } from "fs/promises";
import { resolve } from "path";

const DATA_DIR = resolve("data");
const ANALYTICS_FILE = resolve(DATA_DIR, "analytics.json");

const LOCK_FILE = resolve(DATA_DIR, ".analytics.lock");

let lockPromise: Promise<void> | null = null;

const withLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  while (lockPromise) {
    await lockPromise;
  }
  const release = async () => {
    try {
      await writeFile(LOCK_FILE, "");
    } catch {
      // ignore
    }
  };
  try {
    const result = await fn();
    await release();
    return result;
  } catch (e) {
    await release();
    throw e;
  } finally {
    lockPromise = null;
  }
};

const getCountry = (headers: Headers): string | null => {
  return headers.get("cloudfront-viewer-country") || headers.get("x-vercel-ip-country") || null;
};

const MAX_ENTRIES = 50000;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const country = getCountry(request.headers);

    const entry = {
      ts: body.ts ?? Date.now(),
      page: typeof body.page === "string" ? body.page : null,
      referrer: typeof body.referrer === "string" ? body.referrer : null,
      country: typeof country === "string" ? country : null,
      utm_source: typeof body.utm_source === "string" ? body.utm_source : null,
      utm_medium: typeof body.utm_medium === "string" ? body.utm_medium : null,
      utm_campaign: typeof body.utm_campaign === "string" ? body.utm_campaign : null,
      utm_content: typeof body.utm_content === "string" ? body.utm_content : null,
      utm_term: typeof body.utm_term === "string" ? body.utm_term : null,
      embedded: ["linkedin", "instagram", "facebook", "twitter", "tiktok"].includes(body.embedded)
        ? body.embedded
        : null,
      sessionId: typeof body.sessionId === "string" ? body.sessionId : null,
      event: typeof body.event === "string" ? body.event : null,
      eventData: body.eventData && typeof body.eventData === "object" ? body.eventData : null,
    };

    await withLock(async () => {
      let entries: unknown[] = [];
      try {
        const content = await readFile(ANALYTICS_FILE, "utf-8");
        entries = JSON.parse(content);
      } catch {
        entries = [];
      }

      entries.push(entry);

      if (entries.length > MAX_ENTRIES) {
        entries = entries.slice(-MAX_ENTRIES);
      }

      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(ANALYTICS_FILE, JSON.stringify(entries), "utf-8");
    });

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
};

export const prerender = false;
