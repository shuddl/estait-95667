/**
 * Type definitions for Estait Real Estate CRM Platform
 * All application-wide types are centralized here for consistency
 */

import { User as FirebaseUser } from 'firebase/auth';

// ============================================================================
// USER & AUTHENTICATION TYPES
// ============================================================================

export type User = FirebaseUser;

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// CRM INTEGRATION TYPES
// ============================================================================

export type CRMType = 'wise_agent' | 'follow_up_boss' | 'real_geeks';

export interface CRMToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  crmType: CRMType;
}

export interface EncryptedCRMToken {
  accessToken: string; // Encrypted
  refreshToken: string; // Encrypted
  expiresAt: number;
}

// ============================================================================
// CHAT & AI TYPES
// ============================================================================

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  data?: unknown; // For property search results or other structured data
}

export interface AIResponse {
  action: 'add_lead' | 'create_task' | 'search_properties' | 'unknown';
  parameters: Record<string, unknown>;
  responseToUser: string;
}

export interface ProcessAgentCommandResponse {
  responseToUser: string;
  data?: {
    confidence?: number;
    suggestedFollowUps?: string[];
    properties?: Property[];
    [key: string]: unknown;
  };
}

// ============================================================================
// PROPERTY TYPES
// ============================================================================

export interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  yearBuilt: number;
  description?: string;
  images: string[];
  features?: string[];
  listingDate?: string;
  status: 'active' | 'pending' | 'sold';
  mls?: string;
}

export interface PropertySearchParams {
  location: string;
  minBeds?: number;
  maxBeds?: number;
  minPrice?: number;
  maxPrice?: number;
  minSqft?: number;
  maxSqft?: number;
}

export interface PropertySearchResult {
  properties: Property[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// CONTACT & LEAD TYPES
// ============================================================================

export interface Contact {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source?: string;
  status?: 'lead' | 'client' | 'archived';
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface AddLeadParams {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// ============================================================================
// TASK TYPES
// ============================================================================

export interface Task {
  id?: string;
  description: string;
  dueDate: string; // YYYY-MM-DD format
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  contactId?: string;
  propertyId?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface CreateTaskParams {
  description: string;
  dueDate: string;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface AnalyticsData {
  totalLeads: number;
  totalTasks: number;
  completedTasks: number;
  activeProperties: number;
  monthlyLeads?: number[];
  conversionRate?: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface WiseAgentResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RealEstateAPIResponse {
  results: Array<{
    propertyId: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
    price: number;
    details: {
      bedrooms: number;
      bathrooms: number;
      squareFeet: number;
      yearBuilt: number;
    };
    images?: string[];
  }>;
  totalResults: number;
  page: number;
}

// ============================================================================
// FIREBASE FUNCTION TYPES
// ============================================================================

export interface ProcessAgentCommandData {
  commandText: string;
}

export interface WiseAgentAuthResponse {
  authUrl: string;
}

export interface OAuthCallbackQuery {
  code: string;
  state: string;
}

// ============================================================================
// FORM & UI TYPES
// ============================================================================

export interface FormError {
  field?: string;
  message: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export type DashboardProps = Record<string, unknown>;

export interface PropertyDetailsProps {
  params: {
    id: string;
  };
}

export interface PropertySearchResultsProps {
  searchParams?: {
    location?: string;
    minBeds?: string;
    maxPrice?: string;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type AsyncFunction<T = void> = () => Promise<T>;
export type VoidFunction = () => void;
export type ErrorHandler = (error: Error | unknown) => void;

// Type guard functions
export function isProperty(obj: unknown): obj is Property {
  const prop = obj as Record<string, unknown>;
  return !!prop && typeof prop.id === 'string' && typeof prop.price === 'number';
}

export function isChatMessage(obj: unknown): obj is ChatMessage {
  const msg = obj as Record<string, unknown>;
  return !!msg && typeof msg.id === 'string' && typeof msg.text === 'string' && 
         (msg.sender === 'user' || msg.sender === 'ai');
}