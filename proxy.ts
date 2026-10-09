import { NextResponse, type NextRequest } from "next/server";

/**
 * UX only: bounce visitors without a session cookie straight to /login before
 * any rendering. Real authorisation happens on the server for every page and
 * API call (the cookie may be present but revoked or expired).
 */
export function proxy(req: NextRequest) {
  if (!req.cookies.has("wr_session")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/workshops/:path*", "/users/:path*", "/activity/:path*"],
};
