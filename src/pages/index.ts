// La raíz manda al idioma según el país de la visita (cabecera de Vercel); sin país (en dev), según el navegador.
// 302 y Vary: si fuera 301 el navegador lo guardaría y ya no cambiaría de país.
import type { APIRoute } from "astro";

export const prerender = false;

const HISPANOS = new Set(["AR", "BO", "CL", "CO", "CR", "CU", "DO", "EC", "ES", "GQ", "GT", "HN", "MX", "NI", "PA", "PE", "PR", "PY", "SV", "UY", "VE"]);

export const GET: APIRoute = ({ request, url }) => {
  const pais = request.headers.get("x-vercel-ip-country");
  const es = pais ? HISPANOS.has(pais.toUpperCase()) : !/^en\b/i.test(request.headers.get("accept-language") ?? "");
  return new Response(null, {
    status: 302,
    headers: { Location: `/${es ? "es" : "en"}/${url.search}`, Vary: "x-vercel-ip-country, accept-language", "Cache-Control": "private, no-store" },
  });
};
