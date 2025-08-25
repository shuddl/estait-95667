/**
 * Stripe Payment Integration Service
 * Handles subscriptions, payments, and billing for Estait
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import Stripe from 'stripe';

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 
                       functions.config().stripe?.secret_key || '';

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-07-30.basil',
  typescript: true
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  priceId: string;
  features: string[];
  limits: {
    contacts: number;
    properties: number;
    aiRequests: number;
  };
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 99,
    priceId: '', // Will be set from Stripe dashboard
    features: [
      'Up to 100 contacts',
      '500 AI requests/month',
      'Basic CRM integration',
      'Email support'
    ],
    limits: {
      contacts: 100,
      properties: 50,
      aiRequests: 500
    }
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 199,
    priceId: '', // Will be set from Stripe dashboard
    features: [
      'Unlimited contacts',
      '2000 AI requests/month',
      'All CRM integrations',
      'Smart reminders',
      'Priority support',
      'Advanced analytics'
    ],
    limits: {
      contacts: -1, // unlimited
      properties: -1,
      aiRequests: 2000
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    priceId: '', // Will be set from Stripe dashboard
    features: [
      'Everything in Professional',
      'Unlimited AI requests',
      'Custom integrations',
      'Dedicated account manager',
      'API access',
      'White-label options'
    ],
    limits: {
      contacts: -1,
      properties: -1,
      aiRequests: -1
    }
  }
];

export class StripeService {
  /**
   * Create a Stripe customer for a user
   */
  async createCustomer(userId: string, email: string, name?: string): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          firebaseUserId: userId
        }
      });

      // Store Stripe customer ID in Firestore
      await admin.firestore()
        .collection('users')
        .doc(userId)
        .update({
          stripeCustomerId: customer.id,
          stripeCustomerCreated: admin.firestore.FieldValue.serverTimestamp()
        });

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to create customer account'
      );
    }
  }

  /**
   * Get or create Stripe customer
   */
  async getOrCreateCustomer(userId: string): Promise<string> {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    const userData = userDoc.data();
    
    if (userData?.stripeCustomerId) {
      return userData.stripeCustomerId;
    }

    // Create new customer
    const customer = await this.createCustomer(
      userId,
      userData?.email || '',
      userData?.displayName
    );

    return customer.id;
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid subscription plan'
      );
    }

    const customerId = await this.getOrCreateCustomer(userId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planId
      },
      subscription_data: {
        metadata: {
          userId,
          planId
        }
      },
      allow_promotion_codes: true
    });

    // Store session info
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('checkoutSessions')
      .doc(session.id)
      .set({
        sessionId: session.id,
        planId,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

    return session;
  }

  /**
   * Create a portal session for managing subscription
   */
  async createPortalSession(userId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    const customerId = await this.getOrCreateCustomer(userId);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    return session;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    const subscriptionId = userDoc.data()?.stripeSubscriptionId;
    
    if (!subscriptionId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No active subscription found'
      );
    }

    // Cancel at period end
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        subscriptionStatus: 'canceling',
        subscriptionCanceledAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  /**
   * Handle webhook events from Stripe
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  /**
   * Handle successful checkout
   */
  private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    if (!userId) return;

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        subscriptionPlanId: session.metadata?.planId,
        subscriptionStartDate: admin.firestore.Timestamp.fromMillis((subscription as any).current_period_start * 1000),
        subscriptionEndDate: admin.firestore.Timestamp.fromMillis((subscription as any).current_period_end * 1000),
        subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    // Update session status
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('checkoutSessions')
      .doc(session.id)
      .update({
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  /**
   * Handle subscription updates
   */
  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    const plan = SUBSCRIPTION_PLANS.find(p => 
      subscription.items.data.some(item => item.price.id === p.priceId)
    );

    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        subscriptionStatus: subscription.status,
        subscriptionPlanId: plan?.id || subscription.metadata?.planId,
        subscriptionStartDate: admin.firestore.Timestamp.fromMillis((subscription as any).current_period_start * 1000),
        subscriptionEndDate: admin.firestore.Timestamp.fromMillis((subscription as any).current_period_end * 1000),
        subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  /**
   * Handle subscription deletion
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (!userId) return;

    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        subscriptionStatus: 'canceled',
        subscriptionEndedAt: admin.firestore.FieldValue.serverTimestamp(),
        stripeSubscriptionId: admin.firestore.FieldValue.delete()
      });
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscription = (invoice as any).subscription;
    if (!subscription) return;

    const sub = await stripe.subscriptions.retrieve(subscription as string);
    const userId = sub.metadata?.userId;
    if (!userId) return;

    // Record payment
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('payments')
      .add({
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'succeeded',
        paidAt: admin.firestore.Timestamp.fromMillis((invoice.status_transitions.paid_at || 0) * 1000),
        periodStart: admin.firestore.Timestamp.fromMillis(invoice.period_start * 1000),
        periodEnd: admin.firestore.Timestamp.fromMillis(invoice.period_end * 1000)
      });

    // Update last payment date
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
        paymentStatus: 'current'
      });
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscription = (invoice as any).subscription;
    if (!subscription) return;

    const sub = await stripe.subscriptions.retrieve(subscription as string);
    const userId = sub.metadata?.userId;
    if (!userId) return;

    // Record failed payment
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('payments')
      .add({
        invoiceId: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: 'failed',
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        attemptCount: invoice.attempt_count
      });

    // Update payment status
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .update({
        paymentStatus: 'past_due',
        lastPaymentFailure: admin.firestore.FieldValue.serverTimestamp()
      });

    // TODO: Send payment failure email
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    const data = userDoc.data();
    return data?.subscriptionStatus === 'active' || data?.subscriptionStatus === 'trialing';
  }

  /**
   * Get user's subscription details
   */
  async getSubscriptionDetails(userId: string): Promise<any> {
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    const data = userDoc.data();
    
    if (!data?.stripeSubscriptionId) {
      return null;
    }

    const subscription = await stripe.subscriptions.retrieve(data.stripeSubscriptionId);
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === data.subscriptionPlanId);

    return {
      status: subscription.status,
      plan,
      currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
    };
  }
}

export const stripeService = new StripeService();