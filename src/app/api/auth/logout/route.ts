import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_BASE_URL!;
  const res = NextResponse.redirect(new URL("/", url));
  res.cookies.set("fb_user", "", { path: "/", maxAge: 0 });
  res.cookies.set("subscribed", "", { path: "/", maxAge: 0 });
  return res;
}