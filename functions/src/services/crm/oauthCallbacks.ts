import * as functions from "firebase-functions";
import { db } from "../../lib/firebase";
import { encryptToken } from "../../lib/security";
import axios from "axios";

interface OAuthConfig {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const getCRMConfig = (provider: string): OAuthConfig => {
  const baseUrl = functions.config().app?.base_url || "https://estait.com";
  
  switch (provider) {
    case "wise_agent":
      return {
        tokenUrl: "https://api.wiseagent.com/oauth/token",
        clientId: functions.config().wise_agent?.client_id || "",
        clientSecret: functions.config().wise_agent?.client_secret || "",
        redirectUri: `${baseUrl}/api/auth/callback/wise_agent`,
      };
    case "follow_up_boss":
      return {
        tokenUrl: "https://api.followupboss.com/oauth/token",
        clientId: functions.config().follow_up_boss?.client_id || "",
        clientSecret: functions.config().follow_up_boss?.client_secret || "",
        redirectUri: `${baseUrl}/api/auth/callback/follow_up_boss`,
      };
    case "real_geeks":
      return {
        tokenUrl: "https://api.realgeeks.com/oauth/token",
        clientId: functions.config().real_geeks?.client_id || "",
        clientSecret: functions.config().real_geeks?.client_secret || "",
        redirectUri: `${baseUrl}/api/auth/callback/real_geeks`,
      };
    default:
      throw new Error(`Unknown CRM provider: ${provider}`);
  }
};

export const handleOAuthCallback = async (
  provider: string,
  code: string,
  state: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Extract userId from state parameter
    const userId = state;
    if (!userId) {
      throw new Error("Invalid state parameter");
    }

    // Get OAuth config for provider
    const config = getCRMConfig(provider);

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      config.tokenUrl,
      {
        grant_type: "authorization_code",
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Prepare credentials object
    const credentials = {
      access_token,
      refresh_token,
      expires_at: Date.now() + (expires_in * 1000),
      provider,
    };

    // Encrypt and store credentials
    await db
      .collection("users")
      .doc(userId)
      .collection("credentials")
      .doc(provider)
      .set({
        encryptedToken: encryptToken(JSON.stringify(credentials)),
        provider,
        connectedAt: new Date(),
        updatedAt: new Date(),
      });

    // Update user document
    await db
      .collection("users")
      .doc(userId)
      .update({
        [`connectedCRMs.${provider}`]: true,
        updatedAt: new Date(),
      });

    return {
      success: true,
      message: `Successfully connected to ${provider.replace("_", " ").toUpperCase()}`,
    };
  } catch (error) {
    console.error(`OAuth callback error for ${provider}:`, error);
    return {
      success: false,
      message: `Failed to connect to ${provider.replace("_", " ").toUpperCase()}`,
    };
  }
};

export const disconnectCRM = async (
  userId: string,
  provider: string
): Promise<void> => {
  // Delete stored credentials
  await db
    .collection("users")
    .doc(userId)
    .collection("credentials")
    .doc(provider)
    .delete();

  // Update user document
  await db
    .collection("users")
    .doc(userId)
    .update({
      [`connectedCRMs.${provider}`]: false,
      updatedAt: new Date(),
    });
};

export const getCRMAuthUrl = (provider: string, userId: string): string => {
  const baseUrl = functions.config().app?.base_url || "https://estait.com";
  
  switch (provider) {
    case "wise_agent":
      const waClientId = functions.config().wise_agent?.client_id || "";
      const waRedirect = `${baseUrl}/api/auth/callback/wise_agent`;
      return `https://api.wiseagent.com/oauth/authorize?client_id=${waClientId}&redirect_uri=${encodeURIComponent(waRedirect)}&response_type=code&state=${userId}&scope=contacts,tasks`;
      
    case "follow_up_boss":
      const fubClientId = functions.config().follow_up_boss?.client_id || "";
      const fubRedirect = `${baseUrl}/api/auth/callback/follow_up_boss`;
      return `https://api.followupboss.com/oauth/authorize?client_id=${fubClientId}&redirect_uri=${encodeURIComponent(fubRedirect)}&response_type=code&state=${userId}`;
      
    case "real_geeks":
      const rgClientId = functions.config().real_geeks?.client_id || "";
      const rgRedirect = `${baseUrl}/api/auth/callback/real_geeks`;
      return `https://app.realgeeks.com/oauth/authorize?client_id=${rgClientId}&redirect_uri=${encodeURIComponent(rgRedirect)}&response_type=code&state=${userId}`;
      
    default:
      throw new Error(`Unknown CRM provider: ${provider}`);
  }
};