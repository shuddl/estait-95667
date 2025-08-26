/**
 * Real Geeks CRM Integration Service
 * Handles OAuth flow and API interactions for Real Geeks
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { encrypt, decrypt } from "../../lib/security";

export interface RealGeeksTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface RealGeeksLead {
  id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: "New" | "Contacted" | "Qualified" | "Unqualified" | "Lost";
  tags?: string[];
  notes?: string;
  property_types?: string[];
  price_min?: number;
  price_max?: number;
  bedrooms_min?: number;
  bathrooms_min?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RealGeeksActivity {
  id?: string;
  lead_id: string;
  type: "note" | "email" | "call" | "text" | "showing" | "meeting";
  description: string;
  created_at?: string;
  due_date?: string;
  completed?: boolean;
}

export interface RealGeeksProperty {
  id?: string;
  mls_number?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  lot_size?: number;
  year_built?: number;
  property_type: string;
  status: "Active" | "Pending" | "Sold" | "Withdrawn";
  listing_date?: string;
  images?: string[];
}

export class RealGeeksService {
  private readonly baseUrl = "https://api.realgeeks.com/v2";
  
  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(userId: string, redirectUri: string): string {
    const clientId = process.env.REALGEEKS_CLIENT_ID || 
                    functions.config().realgeeks?.client_id;
    
    if (!clientId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Real Geeks client ID is not configured."
      );
    }
    
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state: userId,
      scope: "leads:read leads:write properties:read activities:write"
    });
    
    return `https://app.realgeeks.com/oauth/authorize?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<RealGeeksTokenResponse> {
    const clientId = process.env.REALGEEKS_CLIENT_ID || 
                    functions.config().realgeeks?.client_id;
    const clientSecret = process.env.REALGEEKS_CLIENT_SECRET || 
                        functions.config().realgeeks?.client_secret;
    
    if (!clientId || !clientSecret) {
      throw new Error("Real Geeks credentials are not configured.");
    }
    
    const response = await fetch("https://app.realgeeks.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }
    
    return await response.json() as RealGeeksTokenResponse;
  }
  
  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<RealGeeksTokenResponse> {
    const clientId = process.env.REALGEEKS_CLIENT_ID || 
                    functions.config().realgeeks?.client_id;
    const clientSecret = process.env.REALGEEKS_CLIENT_SECRET || 
                        functions.config().realgeeks?.client_secret;
    
    if (!clientId || !clientSecret) {
      throw new Error("Real Geeks credentials are not configured.");
    }
    
    const response = await fetch("https://app.realgeeks.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }
    
    return await response.json() as RealGeeksTokenResponse;
  }
  
  /**
   * Store tokens in Firestore
   */
  async storeTokens(userId: string, tokens: RealGeeksTokenResponse): Promise<void> {
    const expiresAt = Date.now() + (tokens.expires_in * 1000);
    
    await admin.firestore()
      .collection("users")
      .doc(userId)
      .collection("credentials")
      .doc("real_geeks")
      .set({
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        expiresAt,
        tokenType: tokens.token_type,
        scope: tokens.scope,
        connectedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    await admin.firestore()
      .collection("users")
      .doc(userId)
      .update({
        crmConnected: true,
        crmType: "real_geeks",
        crmConnectedAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }
  
  /**
   * Get valid access token (with auto-refresh if needed)
   */
  async getValidAccessToken(userId: string): Promise<string> {
    const tokenDoc = await admin.firestore()
      .collection("users")
      .doc(userId)
      .collection("credentials")
      .doc("real_geeks")
      .get();
    
    if (!tokenDoc.exists || !tokenDoc.data()) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Real Geeks is not connected for this user."
      );
    }
    
    const data = tokenDoc.data();
    if (!data?.accessToken || !data?.refreshToken) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "No tokens found for Real Geeks."
      );
    }
    
    // Check if token is expired or about to expire (5 minutes buffer)
    const expiresAt = data.expiresAt || 0;
    const now = Date.now();
    const buffer = 5 * 60 * 1000; // 5 minutes
    
    if (now >= expiresAt - buffer) {
      // Token expired or about to expire, refresh it
      try {
        const refreshToken = decrypt(data.refreshToken);
        const newTokens = await this.refreshAccessToken(refreshToken);
        await this.storeTokens(userId, newTokens);
        return newTokens.access_token;
      } catch (error) {
        console.error("Failed to refresh Real Geeks token:", error);
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Failed to refresh Real Geeks authentication. Please reconnect your account."
        );
      }
    }
    
    return decrypt(data.accessToken);
  }
  
  /**
   * Make authenticated API request
   */
  private async makeApiRequest(
    userId: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const accessToken = await this.getValidAccessToken(userId);
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Real Geeks API error: ${error}`);
    }
    
    return await response.json();
  }
  
  /**
   * Add a new lead
   */
  async addLead(userId: string, lead: RealGeeksLead): Promise<any> {
    return await this.makeApiRequest(userId, "/leads", {
      method: "POST",
      body: JSON.stringify(lead)
    });
  }
  
  /**
   * Update a lead
   */
  async updateLead(userId: string, leadId: string, updates: Partial<RealGeeksLead>): Promise<any> {
    return await this.makeApiRequest(userId, `/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify(updates)
    });
  }
  
  /**
   * Get leads
   */
  async getLeads(userId: string, params?: {
    page?: number;
    per_page?: number;
    sort?: string;
    status?: string;
    tag?: string;
    search?: string;
    created_after?: string;
    updated_after?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/leads${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return await this.makeApiRequest(userId, endpoint);
  }
  
  /**
   * Get a single lead
   */
  async getLead(userId: string, leadId: string): Promise<any> {
    return await this.makeApiRequest(userId, `/leads/${leadId}`);
  }
  
  /**
   * Search leads
   */
  async searchLeads(userId: string, query: string): Promise<any> {
    return await this.getLeads(userId, { search: query });
  }
  
  /**
   * Add an activity
   */
  async addActivity(userId: string, activity: RealGeeksActivity): Promise<any> {
    return await this.makeApiRequest(userId, "/activities", {
      method: "POST",
      body: JSON.stringify(activity)
    });
  }
  
  /**
   * Update an activity
   */
  async updateActivity(userId: string, activityId: string, updates: Partial<RealGeeksActivity>): Promise<any> {
    return await this.makeApiRequest(userId, `/activities/${activityId}`, {
      method: "PATCH",
      body: JSON.stringify(updates)
    });
  }
  
  /**
   * Get activities
   */
  async getActivities(userId: string, params?: {
    lead_id?: string;
    type?: string;
    completed?: boolean;
    page?: number;
    per_page?: number;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/activities${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return await this.makeApiRequest(userId, endpoint);
  }
  
  /**
   * Search properties
   */
  async searchProperties(userId: string, params: {
    city?: string;
    state?: string;
    zip?: string;
    min_price?: number;
    max_price?: number;
    min_beds?: number;
    min_baths?: number;
    min_sqft?: number;
    property_type?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    const endpoint = `/properties/search?${queryParams.toString()}`;
    return await this.makeApiRequest(userId, endpoint);
  }
  
  /**
   * Get property details
   */
  async getProperty(userId: string, propertyId: string): Promise<any> {
    return await this.makeApiRequest(userId, `/properties/${propertyId}`);
  }
  
  /**
   * Add a tag to a lead
   */
  async addTagToLead(userId: string, leadId: string, tag: string): Promise<any> {
    return await this.makeApiRequest(userId, `/leads/${leadId}/tags`, {
      method: "POST",
      body: JSON.stringify({ tag })
    });
  }
  
  /**
   * Remove a tag from a lead
   */
  async removeTagFromLead(userId: string, leadId: string, tag: string): Promise<any> {
    return await this.makeApiRequest(userId, `/leads/${leadId}/tags/${tag}`, {
      method: "DELETE"
    });
  }
  
  /**
   * Get lead statistics
   */
  async getLeadStats(userId: string): Promise<any> {
    return await this.makeApiRequest(userId, "/leads/stats");
  }
  
  /**
   * Bulk update leads
   */
  async bulkUpdateLeads(userId: string, leadIds: string[], updates: Partial<RealGeeksLead>): Promise<any> {
    return await this.makeApiRequest(userId, "/leads/bulk", {
      method: "PATCH",
      body: JSON.stringify({
        lead_ids: leadIds,
        updates
      })
    });
  }
}

export const realGeeksService = new RealGeeksService();