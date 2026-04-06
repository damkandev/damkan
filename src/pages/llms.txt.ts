import type { APIRoute } from "astro";
import { generateLlmsTxt } from "../services/llms";

export const GET: APIRoute = async ({ site }) => {
  const body = await generateLlmsTxt(site);

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=600",
    },
  });
};
