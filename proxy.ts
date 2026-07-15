import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { AUTH_COOKIE } from "./lib/site-auth";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

function isPublicPath(pathname: string) {
  return pathname === "/unlock" || pathname === "/api/unlock";
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Site-wide dev password gate (unchanged)
  const authed = request.cookies.get(AUTH_COOKIE)?.value === "1";
  if (!authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/unlock";
    url.search = "";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Locale routing, then refresh the Supabase auth session onto that response.
  const response = intlMiddleware(request);
  return await updateSession(request, response);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
