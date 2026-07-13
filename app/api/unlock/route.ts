import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, SITE_PASSWORD } from "@/lib/site-auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = form.get("password");
  const redirectTo = String(form.get("redirect") || "/");
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/";

  const url = request.nextUrl.clone();
  url.search = "";

  if (password === SITE_PASSWORD) {
    url.pathname = safeRedirect;
    const res = NextResponse.redirect(url);
    res.cookies.set(AUTH_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  }

  url.pathname = "/unlock";
  url.searchParams.set("redirect", safeRedirect);
  url.searchParams.set("error", "1");
  return NextResponse.redirect(url);
}
