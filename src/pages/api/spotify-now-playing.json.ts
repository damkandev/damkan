import type { APIRoute } from "astro";
import { getNowPlaying } from "../../services/spotify";

export const prerender = false;

export const GET: APIRoute = async () => {
  const result = await getNowPlaying();

  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=0, s-maxage=30",
    },
  });
};
