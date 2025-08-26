/**
 * Follow Up Boss CRM Integration Service
 * Handles OAuth flow and API interactions for Follow Up Boss
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { encrypt, decrypt } from "../../lib/security";

export interface FollowUpBossTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface FollowUpBossContact {
  id?: string;
  name: string;
  email?: string;
  phones?: Array<{ type: string; value: string }>;
  tags?: string[];
  source?: string;
  stage?: string;
  assignedUserId?: string;
  customFields?: Record<string, any>;
}

export interface FollowUpBossTask {
  id?: string;
  description: string;
  dueDate: string;
  userId?: string;
  personId?: string;
  isCompleted?: boolean;
  type?: "Call" | "Email" | "Text" | "Meeting" | "Other";
}

export class FollowUpBossService {
  private readonly baseUrl = "https://api.followupboss.com/v1";
  
  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(userId: string, redirectUri: string): string {
    const clientId = process.env.FOLLOWUPBOSS_CLIENT_ID || 
                    functions.config().followupboss?.client_id;
    
    if (!clientId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Follow Up Boss client ID is not configured."
      );
    }
    
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state: userId,
      scope: "read write"
    });
    
    return `https://api.followupboss.com/oauth/authorize?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<FollowUpBossTokenResponse> {
    const clientId = process.env.FOLLOWUPBOSS_CLIENT_ID || 
                    functions.config().followupboss?.client_id;
    const clientSecret = process.env.FOLLOWUPBOSS_CLIENT_SECRET || 
                        functions.config().followupboss?.client_secret;
    
    if (!clientId || !clientSecret) {
      throw new Error("Follow Up Boss credentials are not configured.");
    }
    
    const response = await fetch("https://api.followupboss.com/oauth/token", {
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
    
    return await response.json() as FollowUpBossTokenResponse;
  }
  
  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<FollowUpBossTokenResponse> {
    const clientId = process.env.FOLLOWUPBOSS_CLIENT_ID || 
                    functions.config().followupboss?.client_id;
    const clientSecret = process.env.FOLLOWUPBOSS_CLIENT_SECRET || 
                        functions.config().followupboss?.client_secret;
    
    if (!clientId || !clientSecret) {
      throw new Error("Follow Up Boss credentials are not configured.");
    }
    
    const response = await fetch("https://api.followupboss.com/oauth/token", {
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
    
    return await response.json() as FollowUpBossTokenResponse;
  }
  
  /**
   * Store tokens in Firestore
   */
  async storeTokens(userId: string, tokens: FollowUpBossTokenResponse): Promise<void> {
    const expiresAt = Date.now() + (tokens.expires_in * 1000);
    
    await admin.firestore()
      .collection("users")
      .doc(userId)
      .collection("credentials")
      .doc("follow_up_boss")
      .set({
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        expiresAt,
        tokenType: tokens.token_type,
        connectedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    await admin.firestore()
      .collection("users")
      .doc(userId)
      .update({
        crmConnected: true,
        crmType: "follow_up_boss",
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
      .doc("follow_up_boss")
      .get();
    
    if (!tokenDoc.exists || !tokenDoc.data()) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Follow Up Boss is not connected for this user."
      );
    }
    
    const data = tokenDoc.data();
    if (!data?.accessToken || !data?.refreshToken) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "No tokens found for Follow Up Boss."
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
        console.error("Failed to refresh Follow Up Boss token:", error);
        throw new functions.https.HttpsError(
          "unauthenticated",
          "Failed to refresh Follow Up Boss authentication. Please reconnect your account."
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
      throw new Error(`Follow Up Boss API error: ${error}`);
    }
    
    return await response.json();
  }
  
  /**
   * Add a new contact
   */
  async addContact(userId: string, contact: FollowUpBossContact): Promise<any> {
    return await this.makeApiRequest(userId, "/people", {
      method: "POST",
      body: JSON.stringify(contact)
    });
  }
  
  /**
   * Update a contact
   */
  async updateContact(userId: string, contactId: string, updates: Partial<FollowUpBossContact>): Promise<any> {
    return await this.makeApiRequest(userId, `/people/${contactId}`, {
      method: "PUT",
      body: JSON.stringify(updates)
    });
  }
  
  /**
   * Get contacts
   */
  async getContacts(userId: string, params?: {
    limit?: number;
    offset?: number;
    sort?: string;
    q?: string;
    tag?: string;
    stage?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/people${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return await this.makeApiRequest(userId, endpoint);
  }
  
  /**
   * Search contacts
   */
  async searchContacts(userId: string, query: string): Promise<any> {
    return await this.getContacts(userId, { q: query });
  }
  
  /**
   * Add a task
   */
  async addTask(userId: string, task: FollowUpBossTask): Promise<any> {
    return await this.makeApiRequest(userId, "/tasks", {
      method: "POST",
      body: JSON.stringify(task)
    });
  }
  
  /**
   * Update a task
   */
  async updateTask(userId: string, taskId: string, updates: Partial<FollowUpBossTask>): Promise<any> {
    return await this.makeApiRequest(userId, `/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(updates)
    });
  }
  
  /**
   * Get tasks
   */
  async getTasks(userId: string, params?: {
    limit?: number;
    offset?: number;
    userId?: string;
    personId?: string;
    isCompleted?: boolean;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    return await this.makeApiRequest(userId, endpoint);
  }
  
  /**
   * Add a note to a contact
   */
  async addNote(userId: string, personId: string, note: string): Promise<any> {
    return await this.makeApiRequest(userId, "/notes", {
      method: "POST",
      body: JSON.stringify({
        personId,
        body: note
      })
    });
  }
  
  /**
   * Get user info
   */
  async getUserInfo(userId: string): Promise<any> {
    return await this.makeApiRequest(userId, "/me");
  }
}

export const followUpBossService = new FollowUpBossService();