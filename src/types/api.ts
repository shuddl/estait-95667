// API Response Types

export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  image: string;
  description: string;
  mlsNumber?: string;
  listingAgent?: string;
  daysOnMarket?: number;
}

export interface RealEstateAPIResponse {
  success: boolean;
  total?: number;
  properties?: Property[];
  error?: string;
}

export interface ProcessCommandResponse {
  success: boolean;
  response: string;
  isPropertySearch?: boolean;
  originalCommand?: string;
  error?: string;
}

export interface StripeCheckoutResponse {
  url: string;
  sessionId?: string;
}

export interface CRMResponse {
  success: boolean;
  result?: any;
  error?: string;
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscriptionDetails?: {
    plan?: {
      name: string;
      id: string;
    };
    status: string;
    currentPeriodEnd?: string;
  };
}

export interface FirebaseFunctions {
  processAgentCommand: (data: { commandText: string; sessionId: string }) => Promise<{ data: any }>;
  getSubscriptionStatus: () => Promise<{ data: SubscriptionStatus }>;
  getUpcomingReminders: (data: { limit: number }) => Promise<{ data: { reminders: any[] } }>;
  createCheckoutSession: (data: { planId: string; successUrl: string; cancelUrl: string }) => Promise<{ data: { url: string } }>;
  wiseAgentAuth: () => Promise<{ data: { authUrl: string } }>;
  followUpBossAuth: () => Promise<{ data: { authUrl: string } }>;
  realGeeksAuth: () => Promise<{ data: { authUrl: string } }>;
}