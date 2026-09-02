import type { APIRoute } from "astro";
import { readFile } from "fs/promises";
import { resolve } from "path";

const ANALYTICS_FILE = resolve("data", "analytics.json");

const DASHBOARD_TOKEN = import.meta.env.DASHBOARD_TOKEN || import.meta.env.DASHBOARD_PASSWORD || "";

const readEntries = async (): Promise<AnalyticsEntry[]> => {
  try {
    const content = await readFile(ANALYTICS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
};

interface AnalyticsEntry {
  ts: number;
  page: string | null;
  referrer: string | null;
  country: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  embedded: string | null;
  sessionId: string | null;
  event: string | null;
  eventData: Record<string, unknown> | null;
}

interface AggregatedData {
  pageviews: { total7d: number; total30d: number; total: number };
  uniqueVisitors: { total7d: number; total30d: number; total: number };
  topPages: Array<{ page: string; count7d: number; count30d: number; count: number }>;
  topCountries: Array<{ country: string; count7d: number; count30d: number; count: number }>;
  topUtmSources: Array<{ source: string; medium: string; count: number }>;
  embeddedBrowsers: Array<{ browser: string; count7d: number; count30d: number; count: number }>;
  events: Array<{
    event: string;
    count7d: number;
    count30d: number;
    count: number;
    metadata: Record<string, Array<{ value: string; count: number }>>;
  }>;
}

const daysAgo = (days: number) => Date.now() - days * 24 * 60 * 60 * 1000;

const aggregate = (entries: AnalyticsEntry[]): AggregatedData => {
  const since7d = daysAgo(7);
  const since30d = daysAgo(30);

  const pageviews = entries.filter((e) => e.event === null || e.event === "pageview");
  const pv7d = pageviews.filter((e) => e.ts >= since7d).length;
  const pv30d = pageviews.filter((e) => e.ts >= since30d).length;

  const uniqueSessions7d = new Set(
    pageviews.filter((e) => e.ts >= since7d && e.sessionId).map((e) => e.sessionId),
  ).size;
  const uniqueSessions30d = new Set(
    pageviews.filter((e) => e.ts >= since30d && e.sessionId).map((e) => e.sessionId),
  ).size;
  const uniqueSessionsTotal = new Set(
    pageviews.filter((e) => e.sessionId).map((e) => e.sessionId),
  ).size;

  const pageCounts = new Map<string, { count7d: number; count30d: number; count: number }>();
  for (const e of pageviews) {
    if (!e.page) continue;
    const existing = pageCounts.get(e.page) || { count7d: 0, count30d: 0, count: 0 };
    if (e.ts >= since7d) existing.count7d++;
    if (e.ts >= since30d) existing.count30d++;
    existing.count++;
    pageCounts.set(e.page, existing);
  }
  const topPages = Array.from(pageCounts.entries())
    .map(([page, counts]) => ({ page, ...counts }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const countryCounts = new Map<string, { count7d: number; count30d: number; count: number }>();
  for (const e of pageviews) {
    if (!e.country) continue;
    const existing = countryCounts.get(e.country) || { count7d: 0, count30d: 0, count: 0 };
    if (e.ts >= since7d) existing.count7d++;
    if (e.ts >= since30d) existing.count30d++;
    existing.count++;
    countryCounts.set(e.country, existing);
  }
  const topCountries = Array.from(countryCounts.entries())
    .map(([country, counts]) => ({ country, ...counts }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  const utmCounts = new Map<string, { source: string; medium: string; count: number }>();
  for (const e of entries) {
    if (!e.utm_source && !e.utm_medium) continue;
    const key = `${e.utm_source || "(none)"}|${e.utm_medium || "(none)"}`;
    const existing = utmCounts.get(key) || { source: e.utm_source || "(none)", medium: e.utm_medium || "(none)", count: 0 };
    existing.count++;
    utmCounts.set(key, existing);
  }
  const topUtmSources = Array.from(utmCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const embeddedCounts = new Map<string, { count7d: number; count30d: number; count: number }>();
  for (const e of pageviews) {
    if (!e.embedded) continue;
    const existing = embeddedCounts.get(e.embedded) || { count7d: 0, count30d: 0, count: 0 };
    if (e.ts >= since7d) existing.count7d++;
    if (e.ts >= since30d) existing.count30d++;
    existing.count++;
    embeddedCounts.set(e.embedded, existing);
  }
  const embeddedBrowsers = Array.from(embeddedCounts.entries())
    .map(([browser, counts]) => ({ browser, ...counts }))
    .sort((a, b) => b.count - a.count);

  const eventEntries = entries.filter((e) => e.event && e.event !== "pageview");
  const eventMap = new Map<string, { count7d: number; count30d: number; count: number; metadata: Map<string, Map<string, number>> }>();
  for (const e of eventEntries) {
    if (!e.event) continue;
    let existing = eventMap.get(e.event);
    if (!existing) {
      existing = { count7d: 0, count30d: 0, count: 0, metadata: new Map() };
      eventMap.set(e.event, existing);
    }
    if (e.ts >= since7d) existing.count7d++;
    if (e.ts >= since30d) existing.count30d++;
    existing.count++;

    if (e.eventData) {
      for (const [key, value] of Object.entries(e.eventData)) {
        let keyMap = existing.metadata.get(key);
        if (!keyMap) {
          keyMap = new Map();
          existing.metadata.set(key, keyMap);
        }
        const val = String(value);
        keyMap.set(val, (keyMap.get(val) || 0) + 1);
      }
    }
  }

  const events = Array.from(eventMap.entries()).map(([event, data]) => {
    const metadata: Record<string, Array<{ value: string; count: number }>> = {};
    for (const [key, valMap] of data.metadata) {
      metadata[key] = Array.from(valMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    }
    return { event, count7d: data.count7d, count30d: data.count30d, count: data.count, metadata };
  }).sort((a, b) => b.count - a.count);

  return {
    pageviews: { total7d: pv7d, total30d: pv30d, total: pageviews.length },
    uniqueVisitors: { total7d: uniqueSessions7d, total30d: uniqueSessions30d, total: uniqueSessionsTotal },
    topPages,
    topCountries,
    topUtmSources,
    embeddedBrowsers,
    events,
  };
};

export const GET: APIRoute = async ({ request }) => {
  const cookie = request.headers.get("cookie") || "";
  if (!cookie.includes("dash-session=authed")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const entries = await readEntries();
  const data = aggregate(entries);

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const prerender = false;
