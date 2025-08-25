# Estait Platform - Implementation Plan
## Complete Development Roadmap with API Integration
### Version 1.0 | December 2024

---

## 1. CURRENT STATE ANALYSIS

### 1.1 Completed Components ✅

| Component | Status | Issues | Required Actions |
|-----------|--------|--------|-----------------|
| **Project Setup** | ✅ Complete | None | None |
| **TypeScript Config** | ✅ Complete | Strict mode enabled | None |
| **Firebase Setup** | ✅ Complete | Auth configured | Add production keys |
| **Basic UI** | ✅ Complete | Dark theme implemented | None |
| **Vertex AI Integration** | ✅ Complete | System prompt configured | Refine prompts |
| **Wise Agent OAuth** | ✅ Partial | Token refresh missing | Implement refresh logic |
| **Dashboard Layout** | ✅ Complete | Uses mock data | Connect real APIs |

### 1.2 Incomplete/Mock Components ❌

| Component | Current State | Issues | Required Actions |
|-----------|--------------|--------|-----------------|
| **Market Analytics** | ❌ Mock Data | Hardcoded values | Integrate RealEstateAPI |
| **Property Search** | ❌ Mock Data | Fake properties | Connect to MLS API |
| **Property Details** | ❌ Placeholder | No real data | Implement full details |
| **Lead Scoring** | ❌ Not Implemented | Missing algorithm | Build scoring engine |
| **Email Campaigns** | ❌ Not Implemented | No integration | Connect Wise Agent |
| **Team Management** | ❌ Not Implemented | No UI | Build team features |
| **Reports** | ❌ Not Implemented | No analytics | Create reporting system |

### 1.3 Authentication Status

**Current Issue**: Authentication listeners exist but are not consistently used across components.

**Components with Auth**:
- `/dashboard/page.tsx` - Has onAuthStateChanged
- `/components/AuthStatus.tsx` - Has listener

**Components Missing Auth**:
- Property pages
- Task management
- Settings pages

**Fix Required**: Implement AuthContext provider at app level

---

## 2. DELIVERABLES & IMPLEMENTATION

### 2.1 Phase 1: Fix Core Issues (Week 1)

#### Deliverable 1.1: Restore Authentication System
```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user);
        setLoading(false);
      },
      (error) => {
        setError(error.message);
        setLoading(false);
      }
    );
    
    return unsubscribe;
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Implementation in layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

#### Deliverable 1.2: Remove All Mock Data
```typescript
// src/services/market-analytics.ts
import { realEstateAPI } from '@/lib/realestate/client';

export async function getMarketAnalytics(location: string) {
  const [city, state] = location.split(',').map(s => s.trim());
  
  // Real API call to RealEstateAPI.com
  const response = await fetch('/api/realestate/market-stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city, state })
  });
  
  const data = await response.json();
  
  return {
    medianPrice: data.median_listing_price,
    yoyChange: data.year_over_year_change,
    daysOnMarket: data.average_days_on_market,
    monthsSupply: data.months_of_inventory,
    saleToListRatio: data.sale_to_list_price_ratio,
    trend: data.price_trend // 'up', 'down', 'stable'
  };
}

// Remove mock data from MarketAnalytics component
const MarketAnalytics = async ({ location }) => {
  const stats = await getMarketAnalytics(location);
  
  return (
    <div className="bg-white/5 p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4">Market Analytics - {location}</h3>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <p className="text-3xl font-bold text-green-400">
            {stats.yoyChange > 0 ? '↑' : '↓'} {Math.abs(stats.yoyChange)}%
          </p>
          <p className="text-sm">Median Price YoY</p>
          <p className="text-xs">${stats.medianPrice.toLocaleString()}</p>
        </div>
        {/* ... rest of real data display */}
      </div>
    </div>
  );
};
```

#### Deliverable 1.3: Environment Variables Setup
```bash
# .env.local (Development)
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=estait-1fdbe.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=estait-1fdbe
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=estait-1fdbe.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Wise Agent OAuth (Production Credentials)
WISEAGENT_CLIENT_ID=29afa25e-cce6-47ac-8375-2da7c361031a
WISEAGENT_CLIENT_SECRET=t48/pe1i3uYKlSqwXv70bh91SgGFf9XhE2LKDnimEwI=
WISEAGENT_REDIRECT_URI=http://localhost:3000/api/crm/callback/wiseagent

# RealEstateAPI.com (Production Credentials)
REALESTATE_API_KEY=STOYC-1db8-7e5d-b2ff-92045cf12576
REALESTATE_API_BASE_URL=https://api.realestateapi.com/v2

# Encryption Key (Generate new one)
ENCRYPTION_KEY=your_generated_32_byte_hex_key

# Google Cloud
GCLOUD_PROJECT=estait-1fdbe
```

### 2.2 Phase 2: Wise Agent CRM Integration (Week 2)

#### Deliverable 2.1: OAuth Implementation
```typescript
// app/api/crm/wiseagent/auth/route.ts
export async function GET(request: NextRequest) {
  const authUrl = new URL('https://sync.thewiseagent.com/WiseAuth/auth');
  
  authUrl.searchParams.append('client_id', process.env.WISEAGENT_CLIENT_ID!);
  authUrl.searchParams.append('redirect_uri', process.env.WISEAGENT_REDIRECT_URI!);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'profile team marketing contacts properties calendar');
  
  return NextResponse.redirect(authUrl.toString());
}

// app/api/crm/callback/wiseagent/route.ts
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect('/dashboard?error=no_code');
  }
  
  // Exchange code for tokens
  const tokenResponse = await fetch('https://sync.thewiseagent.com/WiseAuth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(
        `${process.env.WISEAGENT_CLIENT_ID}:${process.env.WISEAGENT_CLIENT_SECRET}`
      ).toString('base64')}`
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code
    })
  });
  
  const tokens = await tokenResponse.json();
  
  // Encrypt and store tokens
  const encryptedTokens = encryptTokens(tokens);
  await storeTokensInFirestore(userId, encryptedTokens);
  
  return NextResponse.redirect('/dashboard?crm=connected');
}
```

#### Deliverable 2.2: Contact Synchronization
```typescript
// app/api/crm/wiseagent/contacts/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '100');
  
  const token = await getDecryptedToken(userId, 'wiseagent');
  
  const response = await fetch(
    `https://sync.thewiseagent.com/http/webconnect.asp?` +
    `requestType=getContacts&page=${page}&page_size=${pageSize}`,
    {
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Accept': 'application/json'
      }
    }
  );
  
  const contacts = await response.json();
  
  // Sync to Firestore
  await syncContactsToFirestore(contacts);
  
  return NextResponse.json({ 
    success: true, 
    contacts,
    total: contacts.length 
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const token = await getDecryptedToken(userId, 'wiseagent');
  
  const formData = new URLSearchParams({
    requestType: 'webcontact',
    CFirst: body.firstName,
    CLast: body.lastName,
    CEmail: body.email || '',
    MobilePhone: body.phone || '',
    Source: body.source || 'Estait AI',
    Categories: body.categories?.join(';') || '',
    ...body.additionalFields
  });
  
  const response = await fetch(
    'https://sync.thewiseagent.com/http/webconnect.asp',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData.toString()
    }
  );
  
  const result = await response.json();
  
  return NextResponse.json(result);
}
```

#### Deliverable 2.3: Task & Calendar Integration
```typescript
// app/api/crm/wiseagent/tasks/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const token = await getDecryptedToken(userId, 'wiseagent');
  
  const formData = new URLSearchParams({
    requestType: 'tasks',
    Description: body.description,
    TaskDue: body.dueDate, // MM/DD/YYYY format
    Priority: body.priority || '2', // 0-3
    ContactID: body.contactId || '',
    InsideTeamId: body.assigneeId || '',
    TaskNote: body.notes || ''
  });
  
  const response = await fetch(
    'https://sync.thewiseagent.com/http/webconnect.asp',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    }
  );
  
  return NextResponse.json(await response.json());
}
```

### 2.3 Phase 3: RealEstateAPI MLS Integration (Week 3)

#### Deliverable 3.1: Property Search Implementation
```typescript
// app/api/realestate/search/route.ts
import { realestateConfig } from '@/lib/realestate/config';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Transform search parameters
  const searchParams = {
    // Location
    city: body.city,
    state: body.state,
    zip: body.zip,
    
    // Status - Use actual MLS status
    mls_active: body.status === 'active',
    mls_pending: body.status === 'pending',
    mls_sold: body.status === 'sold',
    
    // Price Range
    listing_price_min: body.priceMin,
    listing_price_max: body.priceMax,
    
    // Property Details
    bedrooms_min: body.bedsMin,
    bathrooms_min: body.bathsMin,
    living_area_min: body.sqftMin,
    
    // Property Type
    property_type: body.propertyType,
    
    // Features
    pool: body.hasPool,
    garage: body.hasGarage,
    waterfront: body.isWaterfront,
    
    // Pagination
    size: body.limit || 50,
    page: body.page || 1
  };
  
  // Remove undefined values
  Object.keys(searchParams).forEach(key => {
    if (searchParams[key] === undefined) {
      delete searchParams[key];
    }
  });
  
  // Call RealEstateAPI
  const response = await fetch(
    `${realestateConfig.baseUrl}/PropertySearch`,
    {
      method: 'POST',
      headers: realestateConfig.headers,
      body: JSON.stringify(searchParams)
    }
  );
  
  if (!response.ok) {
    return NextResponse.json(
      { error: 'Search failed', details: await response.text() },
      { status: response.status }
    );
  }
  
  const data = await response.json();
  
  // Transform and enrich response
  const properties = data.data?.map(transformMLSProperty) || [];
  
  // Cache results
  await cacheSearchResults(searchParams, properties);
  
  return NextResponse.json({
    success: true,
    total: data.recordCount || 0,
    properties,
    pagination: {
      page: data.page || 1,
      pageSize: searchParams.size,
      hasMore: data.hasMore || false
    }
  });
}

function transformMLSProperty(mlsData: any) {
  return {
    id: mlsData.property_id,
    mlsNumber: mlsData.mls_number,
    address: mlsData.street_address,
    city: mlsData.city,
    state: mlsData.state,
    zip: mlsData.zip,
    price: mlsData.listing_price,
    bedrooms: mlsData.bedrooms,
    bathrooms: mlsData.bathrooms,
    squareFeet: mlsData.living_area,
    yearBuilt: mlsData.year_built,
    propertyType: mlsData.property_type,
    status: mlsData.status,
    photos: mlsData.photos?.map(p => ({
      url: p.href,
      caption: p.caption
    })) || [],
    description: mlsData.public_remarks,
    features: mlsData.features || [],
    listingDate: mlsData.listing_date,
    daysOnMarket: mlsData.days_on_market,
    listingAgent: {
      name: mlsData.listing_agent_name,
      email: mlsData.listing_agent_email,
      phone: mlsData.listing_agent_phone
    }
  };
}
```

#### Deliverable 3.2: Property Details Page
```typescript
// app/properties/[id]/page.tsx
import { getPropertyDetails } from '@/services/properties';
import { PropertyGallery } from '@/components/PropertyGallery';
import { PropertyInfo } from '@/components/PropertyInfo';
import { MarketInsights } from '@/components/MarketInsights';
import { ContactAgent } from '@/components/ContactAgent';

export default async function PropertyDetailsPage({ params }) {
  const { id } = await params;
  
  // Fetch real property data from MLS
  const property = await getPropertyDetails(id);
  
  if (!property) {
    return <PropertyNotFound />;
  }
  
  // Get market comparables
  const comparables = await getComparables(property);
  
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-8">
        {/* Property Gallery */}
        <PropertyGallery photos={property.photos} />
        
        {/* Property Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2">
            <PropertyInfo property={property} />
            
            {/* Market Insights */}
            <MarketInsights 
              property={property}
              comparables={comparables}
            />
          </div>
          
          {/* Contact Agent Sidebar */}
          <div>
            <ContactAgent 
              agent={property.listingAgent}
              propertyId={property.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// services/properties.ts
export async function getPropertyDetails(propertyId: string) {
  const response = await fetch('/api/realestate/detail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      property_id: propertyId,
      include_comparables: true,
      include_history: true
    })
  });
  
  if (!response.ok) {
    return null;
  }
  
  const data = await response.json();
  return data.property;
}
```

#### Deliverable 3.3: Market Analytics Dashboard
```typescript
// app/api/realestate/market-stats/route.ts
export async function POST(request: NextRequest) {
  const { city, state, timeframe = '12months' } = await request.json();
  
  // Get current market stats
  const currentStats = await fetch(
    `${realestateConfig.baseUrl}/MarketStatistics`,
    {
      method: 'POST',
      headers: realestateConfig.headers,
      body: JSON.stringify({
        city,
        state,
        statistic_type: 'all',
        time_range: timeframe
      })
    }
  );
  
  const stats = await currentStats.json();
  
  // Calculate insights
  const insights = {
    medianPrice: stats.median_listing_price,
    avgPricePerSqft: stats.price_per_sqft,
    daysOnMarket: stats.average_days_on_market,
    inventory: stats.total_listings,
    newListings: stats.new_listings_count,
    pendingSales: stats.pending_sales_count,
    closedSales: stats.closed_sales_count,
    monthsSupply: stats.months_of_inventory,
    listToSaleRatio: stats.list_to_sale_price_ratio,
    
    // Year over year changes
    priceChangeYoY: stats.median_price_yoy_change,
    inventoryChangeYoY: stats.inventory_yoy_change,
    
    // Market trend analysis
    marketTrend: determineMarketTrend(stats),
    buyerMarketScore: calculateBuyerMarketScore(stats),
    
    // Forecast
    priceForecast: stats.price_forecast_next_quarter
  };
  
  return NextResponse.json({
    success: true,
    location: { city, state },
    timeframe,
    statistics: insights,
    lastUpdated: new Date().toISOString()
  });
}

function determineMarketTrend(stats: any): string {
  if (stats.months_of_inventory < 3) return 'sellers_market';
  if (stats.months_of_inventory > 6) return 'buyers_market';
  return 'balanced_market';
}

function calculateBuyerMarketScore(stats: any): number {
  // Score from 0-100, higher = better for buyers
  let score = 50;
  
  // Inventory (more = better for buyers)
  score += (stats.months_of_inventory - 3) * 5;
  
  // Days on market (more = better for buyers)
  score += (stats.average_days_on_market - 30) * 0.5;
  
  // Price trend (declining = better for buyers)
  score -= stats.median_price_yoy_change * 2;
  
  return Math.max(0, Math.min(100, score));
}
```

### 2.4 Phase 4: AI Enhancement (Week 4)

#### Deliverable 4.1: Enhanced NLP Processing
```typescript
// functions/src/ai/enhanced-processor.ts
const ENHANCED_SYSTEM_PROMPT = `
You are Estait, an expert real estate AI assistant with deep knowledge of:
- MLS systems and property data
- CRM best practices for real estate
- Market analysis and trends
- Lead nurturing strategies
- Transaction management

CONTEXT AWARENESS:
- Remember conversation history (last 50 messages)
- Track user preferences and patterns
- Understand property search criteria evolution
- Maintain client relationship context

ADVANCED CAPABILITIES:
1. Lead Scoring: Analyze lead quality based on:
   - Budget alignment with market
   - Timeline urgency (moving date)
   - Communication responsiveness
   - Property view history
   - Engagement metrics

2. Market Intelligence:
   - Identify market trends
   - Suggest optimal listing prices
   - Predict days on market
   - Recommend negotiation strategies

3. Workflow Automation:
   - Create multi-step task sequences
   - Schedule follow-ups based on lead behavior
   - Generate personalized email campaigns
   - Coordinate showing schedules

RESPONSE GUIDELINES:
- Be proactive with suggestions
- Provide data-backed recommendations
- Anticipate next steps
- Offer alternative solutions
- Include confidence scores

ACTION DEFINITIONS:
${JSON.stringify(ACTION_DEFINITIONS, null, 2)}

EXAMPLE INTERACTIONS:
[Provide comprehensive examples for each action type]
`;

export class EnhancedAIProcessor {
  private vertexAI: VertexAI;
  private conversationMemory: ConversationMemory;
  private contextEnricher: ContextEnricher;
  
  async processCommand(input: string, context: CommandContext) {
    // Enrich context with user history
    const enrichedContext = await this.contextEnricher.enrich(context);
    
    // Get conversation history
    const history = await this.conversationMemory.getHistory(
      context.sessionId,
      50 // Last 50 turns
    );
    
    // Build prompt with full context
    const prompt = this.buildContextualPrompt(input, enrichedContext, history);
    
    // Process with Gemini
    const response = await this.vertexAI.generateContent(prompt);
    
    // Parse and validate response
    const action = this.parseResponse(response);
    
    // Execute with confidence checking
    if (action.confidence > 0.8) {
      await this.executeAction(action);
    } else {
      action.requiresConfirmation = true;
    }
    
    // Update memory
    await this.conversationMemory.addTurn(context.sessionId, input, action);
    
    // Generate follow-up suggestions
    action.suggestedFollowUps = await this.generateFollowUps(action, context);
    
    return action;
  }
  
  private async generateFollowUps(action: AIAction, context: CommandContext) {
    const suggestions = [];
    
    switch (action.action) {
      case 'add_lead':
        suggestions.push(
          `Search for properties matching ${action.parameters.firstName}'s criteria`,
          `Schedule a follow-up call with ${action.parameters.firstName}`,
          `Add ${action.parameters.firstName} to email campaign`
        );
        break;
        
      case 'search_property':
        suggestions.push(
          'Save this search for future alerts',
          'Share these properties with a client',
          'Schedule showings for top matches',
          'Get market analysis for this area'
        );
        break;
        
      case 'create_task':
        suggestions.push(
          'Add this task to calendar',
          'Assign task to team member',
          'Create recurring task',
          'Set task priority'
        );
        break;
    }
    
    return suggestions;
  }
}
```

#### Deliverable 4.2: Lead Scoring Engine
```typescript
// services/lead-scoring.ts
export interface LeadScore {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: ScoreFactor[];
  recommendations: string[];
}

interface ScoreFactor {
  name: string;
  weight: number;
  score: number;
  reason: string;
}

export class LeadScoringEngine {
  async scoreContact(contact: Contact): Promise<LeadScore> {
    const factors: ScoreFactor[] = [];
    
    // 1. Budget Alignment (25% weight)
    const budgetScore = await this.scoreBudget(contact);
    factors.push(budgetScore);
    
    // 2. Timeline Urgency (20% weight)
    const timelineScore = this.scoreTimeline(contact);
    factors.push(timelineScore);
    
    // 3. Engagement Level (20% weight)
    const engagementScore = await this.scoreEngagement(contact);
    factors.push(engagementScore);
    
    // 4. Property Match (15% weight)
    const propertyScore = await this.scorePropertyMatch(contact);
    factors.push(propertyScore);
    
    // 5. Communication Quality (10% weight)
    const communicationScore = this.scoreCommunication(contact);
    factors.push(communicationScore);
    
    // 6. Source Quality (10% weight)
    const sourceScore = this.scoreSource(contact);
    factors.push(sourceScore);
    
    // Calculate weighted score
    const totalScore = factors.reduce((sum, factor) => 
      sum + (factor.score * factor.weight), 0
    );
    
    // Determine grade
    const grade = this.calculateGrade(totalScore);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, contact);
    
    return {
      score: Math.round(totalScore),
      grade,
      factors,
      recommendations
    };
  }
  
  private async scoreBudget(contact: Contact): Promise<ScoreFactor> {
    const budget = contact.propertyInterests?.budget || 0;
    const marketMedian = await this.getMarketMedian(contact.propertyInterests?.location);
    
    let score = 50;
    let reason = '';
    
    if (budget > marketMedian * 1.5) {
      score = 100;
      reason = 'High budget relative to market';
    } else if (budget > marketMedian) {
      score = 80;
      reason = 'Above market median budget';
    } else if (budget > marketMedian * 0.7) {
      score = 60;
      reason = 'Realistic budget for market';
    } else {
      score = 30;
      reason = 'Below market budget';
    }
    
    return {
      name: 'Budget Alignment',
      weight: 0.25,
      score,
      reason
    };
  }
  
  private scoreTimeline(contact: Contact): ScoreFactor {
    const movingDate = contact.propertyInterests?.movingTimeframe;
    let score = 50;
    let reason = '';
    
    if (!movingDate) {
      score = 30;
      reason = 'No timeline specified';
    } else {
      const daysUntilMove = Math.floor(
        (new Date(movingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilMove < 30) {
        score = 100;
        reason = 'Urgent - moving within 30 days';
      } else if (daysUntilMove < 90) {
        score = 80;
        reason = 'Near-term - moving within 3 months';
      } else if (daysUntilMove < 180) {
        score = 60;
        reason = 'Medium-term - moving within 6 months';
      } else {
        score = 40;
        reason = 'Long-term - moving after 6 months';
      }
    }
    
    return {
      name: 'Timeline Urgency',
      weight: 0.20,
      score,
      reason
    };
  }
}
```

### 2.5 Phase 5: Testing & Quality Assurance (Week 5)

#### Deliverable 5.1: Unit Tests
```typescript
// __tests__/services/wiseagent.test.ts
import { describe, it, expect, vi } from 'vitest';
import { WiseAgentClient } from '@/services/wiseagent';

describe('WiseAgentClient', () => {
  let client: WiseAgentClient;
  
  beforeEach(() => {
    client = new WiseAgentClient();
  });
  
  describe('OAuth Flow', () => {
    it('should generate correct auth URL', () => {
      const url = client.getAuthUrl();
      
      expect(url).toContain('https://sync.thewiseagent.com/WiseAuth/auth');
      expect(url).toContain('client_id=29afa25e-cce6-47ac-8375-2da7c361031a');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=profile%20team%20marketing');
    });
    
    it('should exchange code for tokens', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          refresh_token: 'refresh-token',
          expires_at: '2024-12-31T00:00:00Z'
        })
      });
      
      global.fetch = mockFetch;
      
      const tokens = await client.exchangeCodeForTokens('test-code');
      
      expect(tokens.access_token).toBe('test-token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://sync.thewiseagent.com/WiseAuth/token',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code: 'test-code'
          })
        })
      );
    });
    
    it('should refresh expired tokens', async () => {
      const expiredToken = {
        access_token: 'expired',
        refresh_token: 'refresh-token',
        expires_at: new Date(Date.now() - 1000).toISOString()
      };
      
      const newToken = await client.refreshIfNeeded(expiredToken);
      
      expect(newToken.access_token).not.toBe('expired');
    });
  });
  
  describe('Contact Management', () => {
    it('should create contact with all fields', async () => {
      const contact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '5551234567',
        source: 'Website',
        categories: ['Buyer', 'Hot Lead']
      };
      
      const result = await client.createContact(contact);
      
      expect(result.success).toBe(true);
      expect(result.data.ClientID).toBeDefined();
    });
    
    it('should handle duplicate contacts', async () => {
      const duplicate = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };
      
      const result = await client.createContact(duplicate);
      
      expect(result.success).toBe(true);
      expect(result.data.NewContact).toBe(false);
    });
  });
});
```

#### Deliverable 5.2: Integration Tests
```typescript
// __tests__/integration/lead-flow.test.ts
import { test, expect } from '@playwright/test';

test.describe('Lead Capture Flow', () => {
  test('should capture lead through AI assistant', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Login if needed
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('[type="submit"]');
    
    // Wait for dashboard
    await page.waitForSelector('[data-testid="ai-assistant"]');
    
    // Use AI to add lead
    await page.fill(
      '[data-testid="ai-input"]',
      'Add Sarah Johnson 555-9876, looking for 3BR homes in Austin under 500k'
    );
    await page.click('[data-testid="ai-submit"]');
    
    // Wait for AI response
    await page.waitForSelector('[data-testid="ai-response"]');
    
    // Verify response
    const response = await page.textContent('[data-testid="ai-response"]');
    expect(response).toContain('added Sarah Johnson');
    
    // Verify contact appears in list
    await page.click('[data-testid="contacts-tab"]');
    await page.waitForSelector('[data-testid="contact-list"]');
    
    const contacts = await page.textContent('[data-testid="contact-list"]');
    expect(contacts).toContain('Sarah Johnson');
    
    // Verify in CRM
    const crmContact = await verifyInWiseAgent('sarah.johnson@example.com');
    expect(crmContact).toBeTruthy();
  });
  
  test('should search properties and save results', async ({ page }) => {
    await page.goto('/properties/search');
    
    // Fill search form
    await page.fill('[name="city"]', 'Austin');
    await page.selectOption('[name="state"]', 'TX');
    await page.fill('[name="priceMax"]', '500000');
    await page.fill('[name="bedsMin"]', '3');
    
    // Submit search
    await page.click('[data-testid="search-submit"]');
    
    // Wait for results
    await page.waitForSelector('[data-testid="property-results"]');
    
    // Verify results
    const results = await page.$$('[data-testid="property-card"]');
    expect(results.length).toBeGreaterThan(0);
    
    // Save search
    await page.click('[data-testid="save-search"]');
    
    // Verify saved
    const saved = await page.textContent('[data-testid="saved-searches"]');
    expect(saved).toContain('Austin, TX');
  });
});
```

#### Deliverable 5.3: Performance Tests
```typescript
// __tests__/performance/load.test.ts
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
  },
};

export default function () {
  // Test property search
  const searchPayload = JSON.stringify({
    city: 'Austin',
    state: 'TX',
    priceMax: 500000,
    bedsMin: 3
  });
  
  const searchRes = http.post(
    'https://estait-1fdbe.web.app/api/realestate/search',
    searchPayload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${__ENV.TEST_TOKEN}'
      }
    }
  );
  
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search returns properties': (r) => {
      const body = JSON.parse(r.body);
      return body.properties && body.properties.length > 0;
    },
    'search response time OK': (r) => r.timings.duration < 2000,
  });
  
  // Test AI command processing
  const aiPayload = JSON.stringify({
    commandText: 'Search for homes in Austin',
    sessionId: `test-${__VU}-${__ITER}`
  });
  
  const aiRes = http.post(
    'https://estait-1fdbe.web.app/api/ai/process',
    aiPayload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${__ENV.TEST_TOKEN}'
      }
    }
  );
  
  check(aiRes, {
    'AI status is 200': (r) => r.status === 200,
    'AI returns action': (r) => {
      const body = JSON.parse(r.body);
      return body.action && body.responseToUser;
    },
    'AI response time OK': (r) => r.timings.duration < 3000,
  });
}
```

### 2.6 Phase 6: Production Deployment (Week 6)

#### Deliverable 6.1: Production Configuration
```bash
# Production environment setup
firebase functions:config:set \
  wiseagent.client_id="29afa25e-cce6-47ac-8375-2da7c361031a" \
  wiseagent.client_secret="t48/pe1i3uYKlSqwXv70bh91SgGFf9XhE2LKDnimEwI=" \
  wiseagent.redirect_uri="https://estait-1fdbe.web.app/api/crm/callback/wiseagent" \
  realestate.api_key="STOYC-1db8-7e5d-b2ff-92045cf12576" \
  encryption.key="$(openssl rand -hex 32)"

# Deploy all services
firebase deploy --only hosting,functions,firestore:rules,storage:rules

# Set up monitoring
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="API Latency Alert" \
  --condition-display-name="Latency > 2s" \
  --condition-threshold-value=2000 \
  --condition-threshold-duration=60s
```

#### Deliverable 6.2: Migration Scripts
```typescript
// scripts/migrate-to-production.ts
async function migrateToProduction() {
  console.log('Starting production migration...');
  
  // 1. Backup existing data
  await backupFirestore();
  
  // 2. Update security rules
  await deploySecurityRules();
  
  // 3. Create indexes
  await createFirestoreIndexes();
  
  // 4. Migrate user data
  await migrateUsers();
  
  // 5. Set up monitoring
  await setupMonitoring();
  
  // 6. Verify integrations
  await verifyIntegrations();
  
  console.log('Migration complete!');
}

async function verifyIntegrations() {
  const checks = [
    { name: 'Wise Agent OAuth', test: testWiseAgentAuth },
    { name: 'RealEstate API', test: testRealEstateAPI },
    { name: 'Vertex AI', test: testVertexAI },
    { name: 'Firebase Auth', test: testFirebaseAuth }
  ];
  
  for (const check of checks) {
    try {
      await check.test();
      console.log(`✅ ${check.name}: PASSED`);
    } catch (error) {
      console.error(`❌ ${check.name}: FAILED`, error);
      throw error;
    }
  }
}
```

---

## 3. TIMELINE & MILESTONES

| Week | Phase | Deliverables | Success Criteria |
|------|-------|--------------|------------------|
| **Week 1** | Fix Core Issues | Auth system, Remove mocks, Env setup | All tests pass, No mock data |
| **Week 2** | Wise Agent CRM | OAuth, Contacts, Tasks | Full CRM sync working |
| **Week 3** | MLS Integration | Search, Details, Analytics | Live property data |
| **Week 4** | AI Enhancement | NLP, Lead scoring, Automation | 90% command accuracy |
| **Week 5** | Testing & QA | Unit, Integration, Performance | 80% test coverage |
| **Week 6** | Production | Deploy, Monitor, Support | 99.9% uptime |

---

## 4. RESOURCE REQUIREMENTS

### 4.1 Development Team
- **Senior Full-Stack Developer**: 1 FTE
- **AI/ML Engineer**: 0.5 FTE
- **QA Engineer**: 0.5 FTE
- **DevOps Engineer**: 0.25 FTE

### 4.2 Infrastructure Costs
- **Firebase**: ~$200/month (Blaze plan)
- **Google Cloud**: ~$150/month (Vertex AI)
- **RealEstateAPI**: Included (API key provided)
- **Monitoring**: ~$50/month

### 4.3 Third-Party Services
- **Wise Agent**: OAuth integration (free)
- **RealEstateAPI.com**: $0 (key provided)
- **Sentry**: ~$26/month (error tracking)
- **Cloudflare**: Free tier

---

## 5. RISK MITIGATION

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|-------------------|
| API Rate Limits | High | Medium | Implement caching, queuing |
| Token Expiration | Medium | Low | Auto-refresh mechanism |
| Data Sync Issues | Medium | High | Conflict resolution, retry logic |
| Security Breach | Low | Critical | Encryption, audits, monitoring |
| Performance Issues | Medium | Medium | CDN, optimization, scaling |

---

## 6. DEFINITION OF DONE

### Feature Completion Checklist
- [ ] Code reviewed and approved
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] Deployed to staging
- [ ] QA sign-off received
- [ ] Deployed to production
- [ ] Monitoring configured
- [ ] User acceptance confirmed

---

## 7. POST-LAUNCH SUPPORT

### 7.1 Monitoring Plan
- **Uptime**: StatusCake or Pingdom
- **Performance**: Google Cloud Monitoring
- **Errors**: Sentry
- **Analytics**: Google Analytics 4
- **User Feedback**: Intercom or Zendesk

### 7.2 Maintenance Schedule
- **Daily**: Check monitoring dashboards
- **Weekly**: Review error logs, update dependencies
- **Monthly**: Performance review, security updates
- **Quarterly**: Feature planning, architecture review

---

**Document Status**: ACTIVE
**Version**: 1.0
**Last Updated**: December 2024
**Next Review**: Week 1 Completion