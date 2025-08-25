import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/app")) return NextResponse.next();

  const hasAuth = req.cookies.get("fb_user")?.value;          // set after Firebase login
  const subscribed = req.cookies.get("subscribed")?.value;    // set on Stripe success
  if (!hasAuth) return NextResponse.redirect(new URL("/", req.url));
  if (!subscribed) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*"] };