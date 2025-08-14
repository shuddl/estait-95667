/**
 * Type definitions for Firebase Functions
 */

import { CallableContext } from 'firebase-functions/v1/https';

// ============================================================================
// AI TYPES
// ============================================================================

export interface AIResponse {
  action: 'add_lead' | 'create_task' | 'search_properties' | 'unknown';
  parameters: Record<string, any>;
  responseToUser: string;
}

export interface VertexAIContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface VertexAIRequest {
  contents: VertexAIContent[];
  systemInstruction?: string | {
    role: string;
    parts: Array<{ text: string }>;
  };
}

export interface VertexAICandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
}

export interface VertexAIResponse {
  response: {
    candidates?: VertexAICandidate[];
  };
}

// ============================================================================
// CRM TYPES
// ============================================================================

export type CRMType = 'wise_agent' | 'follow_up_boss' | 'real_geeks';

export interface WiseAgentContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface WiseAgentTask {
  description: string;
  dueDate: string;
}

export interface WiseAgentTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

// ============================================================================
// PROPERTY TYPES
// ============================================================================

export interface PropertySearchParams {
  location: string;
  minBeds?: number;
  maxPrice?: number;
}

export interface PropertySearchResult {
  properties: Array<{
    id: string;
    address: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
  }>;
}

// ============================================================================
// FUNCTION TYPES
// ============================================================================

export interface ProcessAgentCommandData {
  commandText: string;
}

export interface ProcessAgentCommandResponse {
  responseToUser: string;
  data?: any;
}

export interface WiseAgentAuthData {
  // No data needed, uses context.auth
}

export interface WiseAgentAuthResponse {
  authUrl: string;
}

export interface OAuthCallbackQuery {
  code?: string;
  state?: string;
}

// ============================================================================
// FIREBASE FUNCTION CONTEXT TYPES
// ============================================================================

export interface AuthenticatedContext extends CallableContext {
  auth: {
    uid: string;
    token: any;
  };
}

// Type guard for authenticated context
export function isAuthenticated(context: CallableContext): context is AuthenticatedContext {
  return context.auth !== undefined && context.auth !== null;
}

// Re-export Express types for convenience
export type { Request, Response } from 'express';