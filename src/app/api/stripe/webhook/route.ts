import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/server/firebaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET || "", {
  apiVersion: "2024-11-20.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing signature or webhook secret" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Update user subscription status
        const userId = session.client_reference_id || session.customer_email || "unknown";
        
        await db()
          .collection("users")
          .doc(userId)
          .set(
            {
              billing: {
                active: true,
                customerId: session.customer,
                subscriptionId: session.subscription,
                updatedAt: new Date(),
              },
            },
            { merge: true }
          );
        
        console.log(`Subscription activated for user: ${userId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find user by customer ID
        const usersSnapshot = await db()
          .collection("users")
          .where("billing.customerId", "==", subscription.customer)
          .get();
        
        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          await userDoc.ref.update({
            "billing.status": subscription.status,
            "billing.currentPeriodEnd": new Date(subscription.current_period_end * 1000),
            "billing.updatedAt": new Date(),
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find user by customer ID
        const usersSnapshot = await db()
          .collection("users")
          .where("billing.customerId", "==", subscription.customer)
          .get();
        
        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          await userDoc.ref.update({
            "billing.active": false,
            "billing.status": "canceled",
            "billing.canceledAt": new Date(),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Log payment failure
        console.error(`Payment failed for customer: ${invoice.customer}`);
        
        // You could send an email notification here
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}