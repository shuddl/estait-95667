# Estait Platform - Technical Specification
## Architecture & Implementation Guide
### Version 1.0 | December 2024

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### 1.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                          │
├────────────────────────────────────────────────────────────────┤
│  Web App (PWA)    │    Mobile Web    │    Future: Native     │
│  - Next.js 15     │    - Responsive  │    - React Native    │
│  - React 18       │    - Touch UI    │    - iOS/Android     │
└──────────────────┬────────────────────────────────────────────┘
                   │ HTTPS/WSS
┌──────────────────▼────────────────────────────────────────────┐
│                      APPLICATION LAYER                         │
├────────────────────────────────────────────────────────────────┤
│  API Gateway      │    Business Logic   │    AI Processing   │
│  - Rate Limiting  │    - Workflows      │    - Vertex AI     │
│  - Auth Checks    │    - Validation     │    - NLP Engine    │
│  - Caching        │    - Transformers   │    - ML Models     │
└──────────────────┬────────────────────────────────────────────┘
                   │
┌──────────────────▼────────────────────────────────────────────┐
│                     INTEGRATION LAYER                          │
├────────────────────────────────────────────────────────────────┤
│  Wise Agent API   │   RealEstateAPI    │   Firebase Services │
│  - OAuth 2.0      │   - MLS Data       │   - Auth           │
│  - Webhooks       │   - Property API   │   - Functions      │
│  - REST API       │   - Agent Data     │   - Storage        │
└──────────────────┬────────────────────────────────────────────┘
                   │
┌──────────────────▼────────────────────────────────────────────┐
│                        DATA LAYER                              │
├────────────────────────────────────────────────────────────────┤
│  Firestore        │    Cloud Storage   │    Redis Cache      │
│  - Documents      │    - Images        │    - Sessions       │
│  - Collections    │    - Documents     │    - API Results   │
│  - Real-time      │    - Backups       │    - Temp Data     │
└────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Architecture

```typescript
// Core Architecture Components
interface SystemComponents {
  frontend: {
    framework: 'Next.js 15.4';
    router: 'App Router';
    rendering: 'Server Components + Client Components';
    state: 'Zustand + React Context';
  };
  
  backend: {
    runtime: 'Node.js 18+';
    serverless: 'Firebase Functions v2';
    api: 'REST + GraphQL (future)';
    realtime: 'WebSockets via Firebase';
  };
  
  ai: {
    provider: 'Google Vertex AI';
    model: 'Gemini 1.5 Pro';
    processing: 'Stream + Batch';
    memory: 'Conversation Context (50 turns)';
  };
  
  database: {
    primary: 'Cloud Firestore';
    cache: 'Redis';
    files: 'Firebase Storage';
    search: 'Algolia (future)';
  };
}
```

---

## 2. AUTHENTICATION & SECURITY

### 2.1 Authentication Flow

```typescript
// Authentication Architecture
class AuthenticationSystem {
  // Multi-layer authentication
  layers = {
    primary: 'Firebase Auth',
    mfa: 'TOTP/SMS',
    oauth: 'Wise Agent OAuth 2.0',
    session: 'JWT + Refresh Tokens'
  };
  
  // Token Management
  tokens = {
    access: {
      algorithm: 'RS256',
      expiry: '15 minutes',
      refresh: 'automatic'
    },
    refresh: {
      algorithm: 'RS256',
      expiry: '30 days',
      storage: 'httpOnly cookie'
    },
    csrf: {
      enabled: true,
      validation: 'double-submit cookie'
    }
  };
  
  // Encryption
  encryption = {
    atRest: 'AES-256-GCM',
    inTransit: 'TLS 1.3',
    tokens: 'Custom AES-256-GCM',
    pii: 'Field-level encryption'
  };
}
```

### 2.2 Security Implementation

```typescript
// Security Middleware Stack
const securityMiddleware = [
  rateLimiter({
    windowMs: 60000,
    max: 100,
    keyGenerator: (req) => req.user?.id || req.ip
  }),
  
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
    optionsSuccessStatus: 200
  }),
  
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://apis.google.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      }
    }
  }),
  
  validateInput(), // Zod schema validation
  sanitizeData(),  // XSS prevention
  checkAuth(),      // JWT verification
  checkPermissions() // RBAC
];
```

### 2.3 OAuth Token Encryption

```typescript
// Token Encryption Service
import crypto from 'crypto';

class TokenEncryption {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  
  constructor() {
    this.key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
  }
  
  encrypt(token: string): EncryptedToken {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(encryptedData: EncryptedToken): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

---

## 3. AI/ML ARCHITECTURE

### 3.1 Vertex AI Integration

```typescript
// Vertex AI Service Architecture
class VertexAIService {
  private client: VertexAI;
  private model: GenerativeModel;
  private conversationCache: Map<string, ConversationContext>;
  
  constructor() {
    this.client = new VertexAI({
      project: 'estait-1fdbe',
      location: 'us-central1'
    });
    
    this.model = this.client.getGenerativeModel({
      model: 'gemini-1.5-pro-002',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      },
      safetySettings: this.getSafetySettings(),
      systemInstruction: MASTER_PROMPT
    });
    
    this.conversationCache = new Map();
  }
  
  async processCommand(
    input: string,
    userId: string,
    sessionId: string
  ): Promise<AIResponse> {
    // Get or create conversation context
    const context = this.getContext(sessionId);
    
    // Build conversation history
    const history = this.buildHistory(context);
    
    // Process with Gemini
    const result = await this.model.generateContent({
      contents: [...history, { role: 'user', parts: [{ text: input }] }]
    });
    
    // Parse structured response
    const response = this.parseResponse(result);
    
    // Update context
    this.updateContext(context, input, response);
    
    // Execute action
    await this.executeAction(response.action, response.parameters);
    
    return response;
  }
}
```

### 3.2 NLP Processing Pipeline

```typescript
// Natural Language Processing Pipeline
interface NLPPipeline {
  stages: {
    preprocessing: {
      tokenization: 'WordPiece';
      normalization: 'Lowercase + Unicode';
      stopwords: 'Custom real estate dictionary';
    };
    
    understanding: {
      intent: 'Classification model';
      entities: 'NER for locations, prices, features';
      context: 'Conversation memory (50 turns)';
    };
    
    processing: {
      validation: 'Parameter checking';
      enrichment: 'Add context from CRM/MLS';
      confidence: 'Score calculation';
    };
    
    execution: {
      routing: 'Action dispatcher';
      parallel: 'Batch operations';
      fallback: 'Error handling';
    };
    
    response: {
      generation: 'Template + AI';
      suggestions: 'Next best actions';
      formatting: 'Markdown + Rich media';
    };
  };
}
```

### 3.3 Action Recognition System

```typescript
// AI Action Recognition and Execution
const ACTION_DEFINITIONS = {
  add_lead: {
    required: ['firstName', 'lastName', 'contact'],
    optional: ['notes', 'source', 'propertyInterest'],
    validator: (params) => {
      return z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().regex(/^\d{10}$/).optional()
      }).parse(params);
    },
    executor: async (params) => {
      return await wiseAgentAPI.createContact(params);
    }
  },
  
  search_property: {
    required: ['location'],
    optional: ['price', 'bedrooms', 'features'],
    validator: (params) => {
      return z.object({
        location: z.string(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        bedrooms: z.number().min(0).optional()
      }).parse(params);
    },
    executor: async (params) => {
      return await realEstateAPI.searchProperties(params);
    }
  }
  
  // ... other actions
};
```

---

## 4. API INTEGRATIONS

### 4.1 Wise Agent CRM Integration

```typescript
// Wise Agent API Client
class WiseAgentClient {
  private baseUrl = 'https://sync.thewiseagent.com';
  private clientId = process.env.WISEAGENT_CLIENT_ID;
  private clientSecret = process.env.WISEAGENT_CLIENT_SECRET;
  
  // OAuth 2.0 Flow
  async authenticate(code: string): Promise<TokenSet> {
    const response = await fetch(`${this.baseUrl}/WiseAuth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getBasicAuth()
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId
      })
    });
    
    const tokens = await response.json();
    
    // Encrypt and store tokens
    await this.storeTokens(tokens);
    
    return tokens;
  }
  
  // API Methods
  async getContacts(params: ContactSearchParams): Promise<Contact[]> {
    return this.request('GET', '/http/webconnect.asp', {
      requestType: 'getContacts',
      ...params
    });
  }
  
  async createContact(data: ContactData): Promise<Contact> {
    return this.request('POST', '/http/webconnect.asp', {
      requestType: 'webcontact',
      ...data
    });
  }
  
  // Token Refresh
  async refreshToken(refreshToken: string): Promise<TokenSet> {
    const response = await fetch(`${this.baseUrl}/WiseAuth/token`, {
      method: 'POST',
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });
    
    return response.json();
  }
  
  // Request Helper
  private async request(method: string, endpoint: string, data: any) {
    const token = await this.getValidToken();
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: method === 'POST' ? new URLSearchParams(data) : undefined
    });
    
    if (response.status === 401) {
      // Token expired, refresh and retry
      await this.refreshStoredToken();
      return this.request(method, endpoint, data);
    }
    
    return response.json();
  }
}
```

### 4.2 RealEstateAPI MLS Integration

```typescript
// RealEstate API Client
class RealEstateAPIClient {
  private baseUrl = 'https://api.realestateapi.com/v2';
  private apiKey = process.env.REALESTATE_API_KEY;
  private cache = new LRUCache({ max: 1000, ttl: 300000 }); // 5 min cache
  
  async searchProperties(params: PropertySearchParams): Promise<PropertySearchResult> {
    // Check cache
    const cacheKey = this.getCacheKey('search', params);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;
    
    // API Request
    const response = await this.request('/PropertySearch', {
      ...this.transformSearchParams(params),
      size: params.limit || 50
    });
    
    // Transform response
    const result = {
      properties: response.data.map(this.transformProperty),
      total: response.recordCount,
      page: response.page,
      hasMore: response.hasMore
    };
    
    // Cache result
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  async getPropertyDetails(propertyId: string): Promise<PropertyDetails> {
    // Check cache
    const cached = this.cache.get(`property:${propertyId}`);
    if (cached) return cached;
    
    const response = await this.request('/PropertyDetail', {
      property_id: propertyId,
      include_comparables: true,
      include_history: true
    });
    
    const details = this.transformPropertyDetails(response.data);
    
    // Cache for 15 minutes
    this.cache.set(`property:${propertyId}`, details);
    
    return details;
  }
  
  private async request(endpoint: string, params: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited, wait and retry
        const retryAfter = response.headers.get('Retry-After') || '5';
        await this.delay(parseInt(retryAfter) * 1000);
        return this.request(endpoint, params);
      }
      throw new APIError(response.status, await response.text());
    }
    
    return response.json();
  }
}
```

---

## 5. DATABASE ARCHITECTURE

### 5.1 Firestore Schema Design

```typescript
// Firestore Collections Structure
interface FirestoreSchema {
  // Users Collection
  users: {
    [userId: string]: {
      profile: UserProfile;
      settings: UserSettings;
      subscriptions: Subscription[];
      metadata: {
        createdAt: Timestamp;
        updatedAt: Timestamp;
        lastLoginAt: Timestamp;
      };
    };
  };
  
  // Contacts Collection (Denormalized for performance)
  contacts: {
    [contactId: string]: {
      // Basic Info
      info: ContactInfo;
      
      // Embedded sub-collections for 1:N relationships
      notes: Note[];
      tasks: Task[];
      properties: PropertyInterest[];
      communications: Communication[];
      
      // Metadata
      owner: string; // userId
      team?: string[]; // shared with team members
      tags: string[];
      score: ContactScore;
    };
  };
  
  // Properties Collection (Cached from MLS)
  properties: {
    [propertyId: string]: {
      // MLS Data
      mls: MLSData;
      
      // Local Enhancements
      insights: PropertyInsights;
      comparables: Comparable[];
      history: PriceHistory[];
      
      // Agent Notes
      notes?: AgentNotes;
      
      // Cache Control
      cachedAt: Timestamp;
      ttl: number; // seconds
    };
  };
  
  // Conversations (AI Context)
  conversations: {
    [conversationId: string]: {
      userId: string;
      sessionId: string;
      messages: Message[];
      context: ConversationContext;
      metadata: {
        startedAt: Timestamp;
        lastMessageAt: Timestamp;
        turnCount: number;
      };
    };
  };
  
  // Tasks (Denormalized for queries)
  tasks: {
    [taskId: string]: {
      details: TaskDetails;
      assignee: string;
      contact?: string;
      property?: string;
      status: TaskStatus;
      timestamps: {
        created: Timestamp;
        due: Timestamp;
        completed?: Timestamp;
      };
    };
  };
  
  // CRM Tokens (Encrypted)
  crm_tokens: {
    [tokenId: string]: { // Format: userId_provider
      encrypted: EncryptedToken;
      expiresAt: Timestamp;
      refreshToken?: string;
      metadata: {
        provider: 'wiseagent' | 'followupboss';
        scopes: string[];
      };
    };
  };
  
  // Analytics (Time-series)
  analytics: {
    [date: string]: { // Format: YYYY-MM-DD
      users: {
        active: number;
        new: number;
        churned: number;
      };
      usage: {
        searches: number;
        aiCommands: number;
        tasksCreated: number;
        contactsAdded: number;
      };
      performance: {
        apiLatency: number[];
        errorRate: number;
        successRate: number;
      };
    };
  };
}
```

### 5.2 Firestore Security Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Helper Functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isTeamMember(teamId) {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.teamId == teamId;
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }
    
    // Users - Read own, write own with restrictions
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) && 
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['settings', 'profile', 'lastLoginAt']);
      allow delete: if false; // Soft delete only
    }
    
    // Contacts - Owner and team access
    match /contacts/{contactId} {
      allow read: if isAuthenticated() && (
        resource.data.owner == request.auth.uid ||
        request.auth.uid in resource.data.team
      );
      allow create: if isAuthenticated() && 
        request.resource.data.owner == request.auth.uid;
      allow update: if isAuthenticated() && 
        resource.data.owner == request.auth.uid;
      allow delete: if isAuthenticated() && 
        resource.data.owner == request.auth.uid;
    }
    
    // Properties - Read all authenticated, write admin only
    match /properties/{propertyId} {
      allow read: if isAuthenticated();
      allow write: if hasRole('admin');
    }
    
    // Tasks - Owner access only
    match /tasks/{taskId} {
      allow read: if isAuthenticated() && 
        resource.data.assignee == request.auth.uid;
      allow create: if isAuthenticated() && 
        request.resource.data.assignee == request.auth.uid;
      allow update: if isAuthenticated() && 
        resource.data.assignee == request.auth.uid;
      allow delete: if isAuthenticated() && 
        resource.data.assignee == request.auth.uid;
    }
    
    // CRM Tokens - Strict owner only
    match /crm_tokens/{tokenId} {
      allow read: if isAuthenticated() && 
        tokenId.matches('.*_' + request.auth.uid);
      allow write: if isAuthenticated() && 
        tokenId.matches('.*_' + request.auth.uid);
    }
    
    // Conversations - Owner only
    match /conversations/{conversationId} {
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      allow delete: if false; // Preserve for ML training
    }
    
    // Analytics - Read only for authenticated
    match /analytics/{document=**} {
      allow read: if isAuthenticated();
      allow write: if false; // Server-side only
    }
  }
}
```

### 5.3 Data Access Patterns

```typescript
// Optimized Data Access Layer
class DataAccessLayer {
  // Composite Queries
  async getContactWithFullContext(contactId: string): Promise<ContactContext> {
    const [contact, notes, tasks, properties] = await Promise.all([
      this.db.collection('contacts').doc(contactId).get(),
      this.db.collection('contacts').doc(contactId)
        .collection('notes').orderBy('createdAt', 'desc').limit(10).get(),
      this.db.collection('tasks')
        .where('contactId', '==', contactId)
        .where('status', '!=', 'completed').get(),
      this.db.collection('properties')
        .where('interestedContacts', 'array-contains', contactId).get()
    ]);
    
    return this.mergeContactData(contact, notes, tasks, properties);
  }
  
  // Batch Operations
  async batchUpdateContacts(updates: ContactUpdate[]): Promise<void> {
    const batch = this.db.batch();
    
    updates.forEach(update => {
      const ref = this.db.collection('contacts').doc(update.id);
      batch.update(ref, update.data);
    });
    
    await batch.commit();
  }
  
  // Real-time Subscriptions
  subscribeToContactUpdates(userId: string, callback: (contacts: Contact[]) => void) {
    return this.db.collection('contacts')
      .where('owner', '==', userId)
      .where('status', '==', 'active')
      .onSnapshot(snapshot => {
        const contacts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(contacts);
      });
  }
  
  // Pagination
  async getContactsPaginated(userId: string, pageSize: number, lastDoc?: any) {
    let query = this.db.collection('contacts')
      .where('owner', '==', userId)
      .orderBy('updatedAt', 'desc')
      .limit(pageSize);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    
    return {
      contacts: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
      hasMore: snapshot.docs.length === pageSize
    };
  }
}
```

---

## 6. PERFORMANCE OPTIMIZATION

### 6.1 Caching Strategy

```typescript
// Multi-layer Caching Architecture
class CacheManager {
  // Browser Cache (Service Worker)
  private browserCache = {
    strategy: 'Cache-First',
    ttl: 3600, // 1 hour
    patterns: [
      '/api/properties/*',
      '/api/contacts/list',
      '/static/*'
    ]
  };
  
  // Application Cache (Memory)
  private memoryCache = new Map<string, CacheEntry>();
  
  // Redis Cache (Server)
  private redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 500)
    }
  });
  
  // CDN Cache (Cloudflare)
  private cdnCache = {
    rules: [
      { pattern: '/images/*', ttl: 86400 }, // 24 hours
      { pattern: '/api/public/*', ttl: 300 }, // 5 minutes
      { pattern: '/_next/static/*', ttl: 31536000 } // 1 year
    ]
  };
  
  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // L1: Memory Cache
    const memCached = this.memoryCache.get(key);
    if (memCached && !this.isExpired(memCached)) {
      return memCached.data;
    }
    
    // L2: Redis Cache
    const redisCached = await this.redisClient.get(key);
    if (redisCached) {
      const data = JSON.parse(redisCached);
      this.memoryCache.set(key, { data, timestamp: Date.now() });
      return data;
    }
    
    // L3: Fetch and Cache
    const fresh = await fetcher();
    await this.set(key, fresh);
    return fresh;
  }
  
  async set(key: string, data: any, ttl = 300): Promise<void> {
    // Memory Cache
    this.memoryCache.set(key, { data, timestamp: Date.now(), ttl });
    
    // Redis Cache
    await this.redisClient.setEx(key, ttl, JSON.stringify(data));
  }
  
  async invalidate(pattern: string): Promise<void> {
    // Clear Memory Cache
    for (const [key] of this.memoryCache) {
      if (key.match(pattern)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Clear Redis Cache
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(keys);
    }
  }
}
```

### 6.2 Query Optimization

```typescript
// Database Query Optimization
class QueryOptimizer {
  // Index Strategy
  indexes = {
    contacts: [
      { fields: ['owner', 'status', 'updatedAt'], order: 'DESC' },
      { fields: ['owner', 'rank'], order: 'ASC' },
      { fields: ['tags'], type: 'ARRAY_CONTAINS' }
    ],
    properties: [
      { fields: ['city', 'state', 'status'], order: 'DESC' },
      { fields: ['price'], order: 'ASC' },
      { fields: ['bedrooms', 'bathrooms'], order: 'ASC' }
    ],
    tasks: [
      { fields: ['assignee', 'status', 'dueDate'], order: 'ASC' },
      { fields: ['contactId', 'status'], order: 'DESC' }
    ]
  };
  
  // Query Batching
  async batchQueries<T>(queries: Query[]): Promise<T[]> {
    const promises = queries.map(q => this.executeQuery(q));
    return Promise.all(promises);
  }
  
  // Query Result Streaming
  async* streamLargeDataset(query: Query): AsyncGenerator<any> {
    let lastDoc = null;
    let hasMore = true;
    
    while (hasMore) {
      const batch = await this.getNextBatch(query, lastDoc);
      
      for (const doc of batch.docs) {
        yield doc.data();
      }
      
      lastDoc = batch.lastDoc;
      hasMore = batch.hasMore;
    }
  }
  
  // Aggregation Pipeline
  async aggregateData(collection: string, pipeline: AggregationStage[]) {
    // Use Firestore aggregation queries
    const aggregation = this.db.collection(collection);
    
    let query = aggregation;
    
    for (const stage of pipeline) {
      switch (stage.type) {
        case 'match':
          query = query.where(stage.field, stage.operator, stage.value);
          break;
        case 'group':
          // Firestore doesn't support GROUP BY natively
          // Implement client-side aggregation
          break;
        case 'sort':
          query = query.orderBy(stage.field, stage.direction);
          break;
        case 'limit':
          query = query.limit(stage.count);
          break;
      }
    }
    
    return query.get();
  }
}
```

### 6.3 Frontend Performance

```typescript
// Frontend Performance Optimizations
const performanceOptimizations = {
  // Code Splitting
  codeSplitting: {
    routes: 'automatic', // Next.js automatic code splitting
    components: 'dynamic', // Dynamic imports for heavy components
    libraries: 'lazy' // Lazy load large libraries
  },
  
  // Image Optimization
  images: {
    loader: 'cloudinary',
    formats: ['webp', 'avif'],
    sizes: [640, 750, 828, 1080, 1200],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true
  },
  
  // Bundle Optimization
  webpack: {
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true
          },
          lib: {
            test(module) {
              return module.size() > 160000;
            },
            name(module) {
              const hash = crypto.createHash('sha1');
              hash.update(module.identifier());
              return hash.digest('hex').substring(0, 8);
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true
          }
        }
      }
    }
  },
  
  // Prefetching Strategy
  prefetch: {
    strategy: 'viewport', // Prefetch when in viewport
    priority: {
      high: ['/dashboard', '/properties'],
      medium: ['/contacts', '/tasks'],
      low: ['/settings', '/help']
    }
  }
};
```

---

## 7. ERROR HANDLING & MONITORING

### 7.1 Error Handling Architecture

```typescript
// Comprehensive Error Handling System
class ErrorHandler {
  // Error Types
  errors = {
    ValidationError: 400,
    AuthenticationError: 401,
    AuthorizationError: 403,
    NotFoundError: 404,
    RateLimitError: 429,
    InternalError: 500,
    ServiceUnavailableError: 503
  };
  
  // Global Error Handler
  async handleError(error: Error, context: ErrorContext): Promise<ErrorResponse> {
    // Log error
    await this.logError(error, context);
    
    // Determine error type
    const errorType = this.classifyError(error);
    
    // Get user-friendly message
    const userMessage = this.getUserMessage(errorType);
    
    // Notify if critical
    if (this.isCritical(errorType)) {
      await this.notifyOncall(error, context);
    }
    
    // Return response
    return {
      error: {
        code: errorType,
        message: userMessage,
        timestamp: new Date().toISOString(),
        requestId: context.requestId
      }
    };
  }
  
  // Error Recovery
  async recover(error: Error, action: string): Promise<any> {
    const strategies = {
      retry: () => this.retryWithBackoff(action),
      fallback: () => this.useFallback(action),
      circuit_break: () => this.circuitBreaker(action),
      compensate: () => this.compensate(action)
    };
    
    const strategy = this.selectStrategy(error);
    return strategies[strategy]();
  }
  
  // Circuit Breaker
  private circuitBreaker = new CircuitBreaker({
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    rollingCountTimeout: 10000,
    rollingCountBuckets: 10,
    volumeThreshold: 10
  });
}
```

### 7.2 Monitoring & Observability

```typescript
// Monitoring System
class MonitoringService {
  // Metrics Collection
  metrics = {
    counters: {
      'api.requests': new Counter(),
      'api.errors': new Counter(),
      'ai.commands': new Counter(),
      'db.queries': new Counter()
    },
    
    histograms: {
      'api.latency': new Histogram({ buckets: [0.1, 0.5, 1, 2, 5] }),
      'db.latency': new Histogram({ buckets: [0.01, 0.05, 0.1, 0.5, 1] }),
      'ai.latency': new Histogram({ buckets: [0.5, 1, 2, 5, 10] })
    },
    
    gauges: {
      'users.active': new Gauge(),
      'memory.usage': new Gauge(),
      'connections.open': new Gauge()
    }
  };
  
  // Distributed Tracing
  tracer = new Tracer({
    serviceName: 'estait-api',
    agentHost: process.env.JAEGER_AGENT_HOST,
    agentPort: 6832,
    logSpans: true
  });
  
  // Logging
  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'error.log', level: 'error' }),
      new winston.transports.File({ filename: 'combined.log' })
    ]
  });
  
  // Health Checks
  healthChecks = {
    database: async () => {
      const start = Date.now();
      await db.collection('health').doc('check').get();
      return { healthy: true, latency: Date.now() - start };
    },
    
    redis: async () => {
      const start = Date.now();
      await redis.ping();
      return { healthy: true, latency: Date.now() - start };
    },
    
    apis: async () => {
      const checks = await Promise.allSettled([
        this.checkWiseAgent(),
        this.checkRealEstateAPI(),
        this.checkVertexAI()
      ]);
      
      return checks.map((check, i) => ({
        service: ['wiseagent', 'realestate', 'vertexai'][i],
        healthy: check.status === 'fulfilled',
        error: check.status === 'rejected' ? check.reason : null
      }));
    }
  };
}
```

---

## 8. DEPLOYMENT & DEVOPS

### 8.1 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Run linting
        run: npm run lint
      
      - name: Type checking
        run: npm run type-check
      
      - name: Security audit
        run: npm audit --audit-level=moderate

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build application
        run: npm run build
      
      - name: Build functions
        run: cd functions && npm run build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: |
            .next
            functions/lib

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Download artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts
      
      - name: Deploy to Firebase
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only hosting,functions
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
      
      - name: Notify deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment to production completed'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 8.2 Infrastructure as Code

```typescript
// infrastructure/terraform/main.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = "estait-1fdbe"
  region  = "us-central1"
}

// Firestore Database
resource "google_firestore_database" "main" {
  name        = "estait-db"
  location_id = "us-central1"
  type        = "FIRESTORE_NATIVE"
  
  concurrency_mode = "OPTIMISTIC"
  app_engine_integration_mode = "DISABLED"
}

// Cloud Functions
resource "google_cloudfunctions2_function" "api" {
  name        = "estait-api"
  location    = "us-central1"
  
  build_config {
    runtime     = "nodejs18"
    entry_point = "api"
    source {
      storage_source {
        bucket = google_storage_bucket.functions.name
        object = google_storage_bucket_object.functions_source.name
      }
    }
  }
  
  service_config {
    min_instance_count = 0
    max_instance_count = 100
    timeout_seconds    = 60
    
    environment_variables = {
      NODE_ENV = "production"
    }
    
    secret_environment_variables {
      key        = "WISEAGENT_CLIENT_SECRET"
      project_id = "estait-1fdbe"
      secret     = "wiseagent-secret"
      version    = "latest"
    }
  }
}

// Redis Instance
resource "google_redis_instance" "cache" {
  name           = "estait-cache"
  tier           = "STANDARD_HA"
  memory_size_gb = 1
  region         = "us-central1"
  
  redis_version = "REDIS_6_X"
  
  persistence_config {
    persistence_mode = "RDB"
    rdb_snapshot_period = "ONE_HOUR"
  }
}

// Load Balancer
resource "google_compute_global_address" "default" {
  name = "estait-ip"
}

resource "google_compute_global_forwarding_rule" "default" {
  name       = "estait-forwarding-rule"
  target     = google_compute_target_https_proxy.default.id
  port_range = "443"
  ip_address = google_compute_global_address.default.address
}

// Monitoring & Alerts
resource "google_monitoring_alert_policy" "api_latency" {
  display_name = "API Latency Alert"
  
  conditions {
    display_name = "API latency > 2s"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_function\" AND metric.type=\"cloudfunctions.googleapis.com/function/execution_times\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 2000
      
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email.name]
}
```

### 8.3 Scaling Strategy

```typescript
// Auto-scaling Configuration
const scalingConfig = {
  // Horizontal Pod Autoscaling
  hpa: {
    minReplicas: 2,
    maxReplicas: 100,
    targetCPU: 70,
    targetMemory: 80,
    scaleUpRate: 100, // % pods per minute
    scaleDownRate: 50 // % pods per minute
  },
  
  // Vertical Pod Autoscaling
  vpa: {
    updateMode: 'Auto',
    resourcePolicy: {
      cpu: { min: '100m', max: '2' },
      memory: { min: '128Mi', max: '4Gi' }
    }
  },
  
  // Database Scaling
  database: {
    readReplicas: {
      min: 1,
      max: 5,
      targetCPU: 60
    },
    sharding: {
      strategy: 'hash',
      shardKey: 'userId',
      shardCount: 10
    }
  },
  
  // CDN Configuration
  cdn: {
    provider: 'cloudflare',
    cacheRules: [
      { pattern: '/static/*', ttl: 31536000 },
      { pattern: '/api/public/*', ttl: 300 },
      { pattern: '/images/*', ttl: 86400 }
    ],
    edgeLocations: ['us-west', 'us-east', 'eu-west', 'ap-southeast']
  }
};
```

---

## 9. TESTING STRATEGY

### 9.1 Test Architecture

```typescript
// Test Suite Structure
const testSuite = {
  unit: {
    coverage: 90,
    framework: 'vitest',
    files: '**/*.test.ts',
    parallel: true
  },
  
  integration: {
    coverage: 80,
    framework: 'vitest',
    files: '**/*.integration.test.ts',
    parallel: false
  },
  
  e2e: {
    coverage: 70,
    framework: 'playwright',
    files: 'e2e/**/*.spec.ts',
    browsers: ['chromium', 'firefox', 'webkit']
  },
  
  performance: {
    framework: 'k6',
    thresholds: {
      http_req_duration: ['p(95)<2000'],
      http_req_failed: ['rate<0.05']
    }
  },
  
  security: {
    tools: ['snyk', 'owasp-zap', 'semgrep'],
    schedule: 'weekly'
  }
};
```

### 9.2 Test Implementation Examples

```typescript
// Unit Test Example
describe('VertexAIService', () => {
  let service: VertexAIService;
  
  beforeEach(() => {
    service = new VertexAIService();
  });
  
  describe('processCommand', () => {
    it('should recognize add_lead intent', async () => {
      const result = await service.processCommand(
        'Add John Smith 555-1234 looking for homes',
        'user123',
        'session456'
      );
      
      expect(result.action).toBe('add_lead');
      expect(result.parameters).toMatchObject({
        firstName: 'John',
        lastName: 'Smith',
        phone: '5551234'
      });
      expect(result.confidence).toBeGreaterThan(0.8);
    });
    
    it('should handle ambiguous commands', async () => {
      const result = await service.processCommand(
        'maybe something about houses',
        'user123',
        'session456'
      );
      
      expect(result.action).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.suggestedFollowUps).toContain('Search for properties');
    });
  });
});

// Integration Test Example
describe('WiseAgent Integration', () => {
  it('should complete OAuth flow', async () => {
    const code = 'test-auth-code';
    const tokens = await wiseAgentClient.authenticate(code);
    
    expect(tokens).toHaveProperty('access_token');
    expect(tokens).toHaveProperty('refresh_token');
    expect(tokens).toHaveProperty('expires_at');
  });
  
  it('should sync contacts bidirectionally', async () => {
    // Create in Wise Agent
    const created = await wiseAgentClient.createContact({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com'
    });
    
    // Verify in Firestore
    const doc = await db.collection('contacts')
      .where('email', '==', 'test@example.com')
      .get();
    
    expect(doc.empty).toBe(false);
    expect(doc.docs[0].data().wiseAgentId).toBe(created.ClientID);
  });
});

// E2E Test Example
test('complete lead capture flow', async ({ page }) => {
  // Navigate to dashboard
  await page.goto('/dashboard');
  
  // Use AI assistant
  await page.fill('[data-testid="ai-input"]', 
    'Add Sarah Johnson 555-9876 interested in condos downtown');
  await page.click('[data-testid="ai-submit"]');
  
  // Verify response
  await expect(page.locator('[data-testid="ai-response"]'))
    .toContainText('added Sarah Johnson');
  
  // Check contact list
  await page.click('[data-testid="contacts-tab"]');
  await expect(page.locator('[data-testid="contact-list"]'))
    .toContainText('Sarah Johnson');
  
  // Verify in CRM
  const contact = await wiseAgentClient.getContacts({
    email: 'sarah.johnson@example.com'
  });
  
  expect(contact).toHaveLength(1);
});
```

---

## 10. ISSUES IDENTIFIED & FIXES

### 10.1 Authentication Issues

**Issue**: Authentication was removed from some components
**Root Cause**: Incomplete migration from AuthContext to direct Firebase Auth
**Fix**:
```typescript
// Restore authentication wrapper
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 10.2 Mock Data Issues

**Issue**: Market analytics showing fake data
**Root Cause**: Placeholder implementation without real data source
**Fix**:
```typescript
// Real market analytics implementation
async function getMarketAnalytics(location: string) {
  // Use real MLS data
  const response = await realEstateAPI.getMarketStats({
    city: location.split(',')[0],
    state: location.split(',')[1]?.trim()
  });
  
  return {
    medianPrice: response.median_price,
    yoyChange: response.price_change_yoy,
    daysOnMarket: response.avg_dom,
    inventory: response.months_supply,
    saleToListRatio: response.sale_to_list_ratio
  };
}
```

### 10.3 API Credential Issues

**Issue**: Hardcoded test credentials in code
**Root Cause**: Development shortcuts
**Fix**:
```typescript
// Proper credential management
const credentials = {
  wiseAgent: {
    clientId: process.env.WISEAGENT_CLIENT_ID,
    clientSecret: process.env.WISEAGENT_CLIENT_SECRET
  },
  realEstateAPI: {
    apiKey: process.env.REALESTATE_API_KEY
  }
};

// Validate on startup
if (!credentials.wiseAgent.clientId) {
  throw new Error('WISEAGENT_CLIENT_ID is required');
}
```

---

## APPENDIX A: API CREDENTIALS

```bash
# Production Credentials (Store in environment variables)

# Wise Agent OAuth
WISEAGENT_CLIENT_ID=29afa25e-cce6-47ac-8375-2da7c361031a
WISEAGENT_CLIENT_SECRET=t48/pe1i3uYKlSqwXv70bh91SgGFf9XhE2LKDnimEwI=
WISEAGENT_REDIRECT_URI=https://estait-1fdbe.web.app/api/crm/callback/wiseagent

# RealEstateAPI.com
REALESTATE_API_KEY=STOYC-1db8-7e5d-b2ff-92045cf12576
REALESTATE_API_BASE_URL=https://api.realestateapi.com/v2

# Firebase
FIREBASE_PROJECT_ID=estait-1fdbe
FIREBASE_AUTH_DOMAIN=estait-1fdbe.firebaseapp.com

# Google Cloud / Vertex AI
GCLOUD_PROJECT=estait-1fdbe
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-1.5-pro-002

# Encryption
ENCRYPTION_KEY=[Generate with: openssl rand -hex 32]
```

---

## APPENDIX B: DEPLOYMENT CHECKLIST

- [ ] Environment variables configured
- [ ] API credentials validated
- [ ] Database indexes created
- [ ] Security rules deployed
- [ ] SSL certificates configured
- [ ] CDN cache rules set
- [ ] Monitoring alerts configured
- [ ] Backup strategy implemented
- [ ] Rate limiting configured
- [ ] Error tracking enabled
- [ ] Performance baselines established
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Team training conducted

---

**Document Status**: ACTIVE
**Version**: 1.0
**Last Updated**: December 2024
**Next Review**: January 2025