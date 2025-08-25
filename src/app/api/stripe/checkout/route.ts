import { NextRequest, NextResponse } from "next/server";

const STRIPE_PRICES = {
  basic: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID || "price_basic",
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_pro",
  enterprise: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || "price_enterprise"
};

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    if (!plan || !STRIPE_PRICES[plan as keyof typeof STRIPE_PRICES]) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    // In production, this would create a real Stripe checkout session
    // For MVP demo, simulate the checkout URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    
    // Generate a mock session ID
    const sessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // For demo purposes, redirect directly to success
    // In production, this would be a real Stripe checkout URL
    const checkoutUrl = `${baseUrl}/api/stripe/success?session_id=${sessionId}`;

    return NextResponse.json({ 
      url: checkoutUrl,
      sessionId 
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}