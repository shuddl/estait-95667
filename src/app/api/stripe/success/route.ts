import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_BASE_URL!;
  const res = NextResponse.redirect(new URL("/app", url));
  res.cookies.set("subscribed", "1", { 
    path: "/", 
    httpOnly: false, 
    maxAge: 60 * 60 * 24 * 365 
  });
  return res;
}