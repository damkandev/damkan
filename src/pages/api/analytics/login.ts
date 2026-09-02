---
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const user = formData.get("user") as string;
  const pass = formData.get("password") as string;

  const expectedUser = import.meta.env.DASHBOARD_USER || "";
  const expectedPass = import.meta.env.DASHBOARD_PASSWORD || "";

  if (user === expectedUser && pass === expectedPass && expectedUser && expectedPass) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/es/dashboard/",
        "Set-Cookie": `dash-session=authed; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`,
      },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/es/dashboard/?error=1",
    },
  });
};

export const prerender = false;
