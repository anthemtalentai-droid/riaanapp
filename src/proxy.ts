import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isForemanPath = pathname.startsWith("/foreman");

  // Allow public paths through
  if (
    pathname.startsWith("/login") ||
    pathname === "/foreman/login" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/foreman-login-roster"
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // Foreman Mode has its own login screen (PIN, no email keyboard) — send
    // an unauthenticated /foreman/* request there, not the desktop /login.
    const loginUrl = new URL(isForemanPath ? "/foreman/login" : "/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // A FOREMAN session must never reach the desktop app (quotes, invoices,
  // profitability all live there) — enforced here, not just by hiding nav.
  // Everyone else is free to use /foreman too (e.g. Admin previewing it).
  if (token.role === "FOREMAN" && !isForemanPath && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/foreman", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
