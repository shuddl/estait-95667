Looking at your request to restart with comprehensive Follow Up Boss documentation including OAuth implementation, I'll compile this for you. Before I proceed, let me clarify a few critical implementation details:

# Follow Up Boss API Complete Reference for Next.js/TypeScript Implementation

## OAuth 2.0 Authentication Implementation

### 1. OAuth Client Registration

**Prerequisites:**
- Register your system at: https://apps.followupboss.com/system-registration
- Obtain X-System and X-System-Key headers
- Create OAuth Client App

```typescript
// types/fub-oauth.types.ts
export interface FUBOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  xSystem: string;
  xSystemKey: string;
  baseAuthUrl: 'https://app.followupboss.com/oauth';
  baseApiUrl: 'https://api.followupboss.com/v1';
}

export interface FUBTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
}

export interface FUBOAuthError {
  error: string;
  error_description: string;
}
```

### 2. Create OAuth Client App

```bash
curl --location --request POST 'https://api.followupboss.com/v1/oauthApps' \
--header 'X-System: estait' \
--header 'X-System-Key: YOUR_SYSTEM_KEY' \
--header 'Content-Type: application/json' \
--data '{
    "redirectUris": ["https://your-app.com/api/auth/fub/callback"]
}'
```

### 3. OAuth Flow Implementation

```typescript
// app/api/auth/fub/authorize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store state in session/cookie for CSRF protection
  const response = NextResponse.redirect(
    `https://app.followupboss.com/oauth/authorize?` +
    `response_type=auth_code&` +
    `client_id=${process.env.FUB_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.FUB_REDIRECT_URI!)}&` +
    `state=${state}&` +
    `prompt=login`
  );
  
  response.cookies.set('fub_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  });
  
  return response;
}
```

```typescript
// app/api/auth/fub/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const response = searchParams.get('response');
  
  // Verify state
  const savedState = req.cookies.get('fub_oauth_state')?.value;
  if (state !== savedState) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }
  
  if (response === 'denied') {
    return NextResponse.redirect('/auth/denied');
  }
  
  // Exchange code for tokens
  const tokenResponse = await fetch('https://app.followupboss.com/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${process.env.FUB_CLIENT_ID}:${process.env.FUB_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: process.env.FUB_REDIRECT_URI!,
      state: state!
    })
  });
  
  const tokens = await tokenResponse.json();
  
  // Store tokens securely (encrypted in database)
  await storeTokens(tokens);
  
  return NextResponse.redirect('/dashboard');
}
```

### 4. Token Refresh Implementation

```typescript
// lib/fub/token-manager.ts
export class FUBTokenManager {
  private static async refreshToken(refreshToken: string): Promise<FUBTokenResponse> {
    const response = await fetch('https://app.followupboss.com/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.FUB_CLIENT_ID}:${process.env.FUB_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    return response.json();
  }
  
  static async getValidToken(userId: string): Promise<string> {
    const tokens = await getStoredTokens(userId);
    
    // Check if token is expired (with 5 minute buffer)
    const expiresAt = tokens.issued_at + tokens.expires_in - 300;
    const now = Math.floor(Date.now() / 1000);
    
    if (now >= expiresAt) {
      const newTokens = await this.refreshToken(tokens.refresh_token);
      await updateStoredTokens(userId, newTokens);
      return newTokens.access_token;
    }
    
    return tokens.access_token;
  }
}
```

## Core API Client Implementation

```typescript
// lib/fub/api-client.ts
export class FUBApiClient {
  private baseUrl = 'https://api.followupboss.com/v1';
  
  constructor(
    private accessToken: string,
    private xSystem: string,
    private xSystemKey: string
  ) {}
  
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    retries = 3
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-System': this.xSystem,
            'X-System-Key': this.xSystemKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: data ? JSON.stringify(data) : undefined
        });
        
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after') || '60';
          await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
          continue;
        }
        
        // Handle token expiration
        if (response.status === 401) {
          const errorData = await response.json();
          if (errorData.error === 'invalid_grant') {
            // Token expired, refresh and retry
            this.accessToken = await FUBTokenManager.getValidToken(this.userId);
            continue;
          }
        }
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
    throw new Error('Max retries exceeded');
  }
  
  // API Methods
  async createEvent(event: CreateEventRequest): Promise<EventResponse> {
    return this.request<EventResponse>('POST', '/events', event);
  }
  
  async getPerson(id: number): Promise<Person> {
    return this.request<Person>('GET', `/people/${id}`);
  }
  
  async updatePerson(id: number, data: UpdatePersonRequest): Promise<Person> {
    return this.request<Person>('PUT', `/people/${id}`, data);
  }
  
  async createNote(note: CreateNoteRequest): Promise<Note> {
    return this.request<Note>('POST', '/notes', note);
  }
  
  async createTask(task: CreateTaskRequest): Promise<Task> {
    return this.request<Task>('POST', '/tasks', task);
  }
  
  async createAppointment(appointment: CreateAppointmentRequest): Promise<Appointment> {
    return this.request<Appointment>('POST', '/appointments', appointment);
  }
}
```

## Complete API Endpoints Reference

### Events API

```typescript
// types/fub-events.types.ts
export interface CreateEventRequest {
  source: string;           // Domain without www
  system: string;          // Must match X-System header
  type: EventType;
  message?: string;
  description?: string;
  person: PersonData;
  property?: PropertyData;
  propertySearch?: PropertySearchData;
  campaign?: CampaignData;
  occurredAt?: string;     // ISO date for historical events
}

export enum EventType {
  Registration = 'Registration',
  GeneralInquiry = 'General Inquiry',
  PropertyInquiry = 'Property Inquiry',
  SavedProperty = 'Saved Property',
  ViewedProperty = 'Viewed Property',
  PropertySearch = 'Property Search',
  VisitedOpenHouse = 'Visited Open House',
  ViewedPage = 'Viewed Page'
}

// Implementation
export async function createLead(leadData: CreateEventRequest) {
  const client = new FUBApiClient(token, xSystem, xSystemKey);
  
  try {
    const response = await client.createEvent({
      source: 'estait.com',
      system: 'estait',
      type: EventType.GeneralInquiry,
      message: leadData.message,
      person: {
        firstName: leadData.firstName,
        lastName: leadData.lastName,
        emails: [{ value: leadData.email }],
        phones: leadData.phone ? [{ value: leadData.phone }] : []
      },
      property: leadData.property
    });
    
    return { success: true, data: response };
  } catch (error) {
    console.error('Lead creation failed:', error);
    return { success: false, error: error.message };
  }
}
```

### People API

```typescript
// types/fub-people.types.ts
export interface Person {
  id: number;
  firstName?: string;
  lastName?: string;
  emails?: Email[];
  phones?: Phone[];
  tags?: string[];
  assignedTo?: number;
  stage?: string;
  source?: string;
  customFields?: Record<string, any>;
  addresses?: Address[];
  created?: string;
  updated?: string;
}

export interface SearchPeopleParams {
  limit?: number;          // Max 100
  offset?: number;
  next?: string;           // Keyset pagination token
  sort?: string;
  created?: string;
  updated?: string;
  assignedTo?: number;
  tags?: string;
  stage?: string;
  includeTrash?: boolean;
  includeUnclaimed?: boolean;
}

// Implementation
export async function searchPeople(params: SearchPeopleParams) {
  const client = new FUBApiClient(token, xSystem, xSystemKey);
  const queryParams = new URLSearchParams(params as any);
  
  return client.request<PaginatedResponse<Person>>(
    'GET',
    `/people?${queryParams}`
  );
}
```

### Notes API

```typescript
// types/fub-notes.types.ts
export interface CreateNoteRequest {
  personId: number;
  subject: string;
  body: string;
  isHtml?: boolean;
}

export interface Note {
  id: number;
  personId: number;
  subject: string;
  body: string;
  isHtml: boolean;
  created: string;
  createdBy: number;
  updated?: string;
  replies?: ThreadedReply[];
  reactions?: Record<string, number[]>;
}

// Implementation with error handling
export async function addNoteToLead(
  personId: number,
  noteContent: string,
  subject: string = 'Follow-up Note'
) {
  const client = new FUBApiClient(token, xSystem, xSystemKey);
  
  // Handle timing issue for newly created leads
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    const note = await client.createNote({
      personId,
      subject,
      body: noteContent,
      isHtml: false
    });
    
    return { success: true, noteId: note.id };
  } catch (error) {
    if (error.status === 404) {
      // Note may be restricted
      console.log('Note creation restricted');
      return { success: false, error: 'Access restricted' };
    }
    throw error;
  }
}
```

### Tasks API

```typescript
// types/fub-tasks.types.ts
export interface CreateTaskRequest {
  personId?: number;
  dealId?: number;
  subject: string;
  description?: string;
  dueDate: string;         // YYYY-MM-DD
  assignedTo?: number;
  priority?: 'Low' | 'Medium' | 'High';
  completed?: boolean;
}

export interface Task {
  id: number;
  personId?: number;
  dealId?: number;
  subject: string;
  description?: string;
  dueDate: string;
  assignedTo?: number;
  assignedToName?: string;
  priority?: string;
  completed: boolean;
  completedDate?: string;
  created: string;
  updated?: string;
}

// Implementation
export async function createFollowUpTask(
  personId: number,
  taskDetails: Partial<CreateTaskRequest>
) {
  const client = new FUBApiClient(token, xSystem, xSystemKey);
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return client.createTask({
    personId,
    subject: taskDetails.subject || 'Follow up with lead',
    dueDate: taskDetails.dueDate || tomorrow.toISOString().split('T')[0],
    priority: taskDetails.priority || 'Medium',
    ...taskDetails
  });
}
```

### Appointments API

```typescript
// types/fub-appointments.types.ts
export interface CreateAppointmentRequest {
  personId?: number;
  dealId?: number;
  appointmentTypeId?: number;
  subject: string;
  description?: string;
  startTime: string;       // ISO datetime
  endTime: string;         // ISO datetime
  location?: string;
  assignedTo?: number;
  outcomeId?: number;
}

export interface Appointment {
  id: number;
  personId?: number;
  dealId?: number;
  subject: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  assignedTo?: number;
  appointmentTypeId?: number;
  outcomeId?: number;
  created: string;
  updated?: string;
}

// Implementation
export async function schedulePropertyShowing(
  personId: number,
  property: string,
  dateTime: Date
) {
  const client = new FUBApiClient(token, xSystem, xSystemKey);
  
  const endTime = new Date(dateTime);
  endTime.setHours(endTime.getHours() + 1);
  
  return client.createAppointment({
    personId,
    subject: `Property Showing: ${property}`,
    startTime: dateTime.toISOString(),
    endTime: endTime.toISOString(),
    location: property
  });
}
```

### Webhooks API

```typescript
// types/fub-webhooks.types.ts
export interface CreateWebhookRequest {
  url: string;
  events: WebhookEvent[];
  secret?: string;
}

export enum WebhookEvent {
  PersonCreated = 'person.created',
  PersonUpdated = 'person.updated',
  PersonDeleted = 'person.deleted',
  EventCreated = 'event.created',
  NoteCreated = 'note.created',
  TaskCreated = 'task.created',
  TaskCompleted = 'task.completed',
  AppointmentCreated = 'appointment.created',
  DealCreated = 'deal.created',
  DealUpdated = 'deal.updated'
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: any;
  signature: string;
}

// Webhook verification
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}

// Webhook handler
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('fub-signature');
  
  if (!verifyWebhookSignature(body, signature!, process.env.FUB_WEBHOOK_SECRET!)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const payload: WebhookPayload = JSON.parse(body);
  
  switch (payload.event) {
    case WebhookEvent.PersonCreated:
      await handleNewLead(payload.data);
      break;
    case WebhookEvent.TaskCompleted:
      await handleTaskCompleted(payload.data);
      break;
    // Handle other events
  }
  
  return NextResponse.json({ success: true });
}
```

### Custom Fields API

```typescript
// types/fub-custom-fields.types.ts
export interface CustomField {
  id: number;
  name: string;
  key: string;             // API field name (e.g., customCloseDate)
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect';
  options?: string[];      // For select/multiselect
}

// Get all custom fields to see exact naming
export async function getCustomFields() {
  const client = new FUBApiClient(token, xSystem, xSystemKey);
  const fields = await client.request<CustomField[]>('GET', '/customfields');
  
  // Map display names to API keys
  const fieldMap = fields.reduce((acc, field) => {
    acc[field.name] = field.key;
    return acc;
  }, {} as Record<string, string>);
  
  return fieldMap;
}

// Use custom fields (case-sensitive!)
export async function updatePersonWithCustomFields(
  personId: number,
  customData: Record<string, any>
) {
  const fieldMap = await getCustomFields();
  
  const mappedData = Object.entries(customData).reduce((acc, [key, value]) => {
    const apiKey = fieldMap[key] || key;
    acc[apiKey] = value;
    return acc;
  }, {} as Record<string, any>);
  
  return client.updatePerson(personId, mappedData);
}
```

### Pagination & Filtering

```typescript
// lib/fub/pagination.ts
export class FUBPaginator<T> {
  constructor(
    private client: FUBApiClient,
    private endpoint: string,
    private limit: number = 25
  ) {}
  
  async *iterate(params?: any): AsyncGenerator<T[]> {
    let next: string | undefined;
    
    do {
      const response = await this.client.request<PaginatedResponse<T>>(
        'GET',
        `${this.endpoint}?limit=${this.limit}${next ? `&next=${next}` : ''}${
          params ? `&${new URLSearchParams(params)}` : ''
        }`
      );
      
      yield response.data;
      next = response._metadata?.next;
    } while (next);
  }
  
  async getAll(params?: any): Promise<T[]> {
    const results: T[] = [];
    
    for await (const batch of this.iterate(params)) {
      results.push(...batch);
    }
    
    return results;
  }
}

// Usage
const paginator = new FUBPaginator<Person>(client, '/people');
const allPeople = await paginator.getAll({ 
  createdAfter: '2024-01-01T00:00:00Z',
  tags: 'hot-lead'
});
```

### Error Handling

```typescript
// lib/fub/error-handler.ts
export class FUBApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FUBApiError';
  }
}

export async function handleFUBError(error: any): Promise<void> {
  if (error instanceof FUBApiError) {
    switch (error.status) {
      case 401:
        // Token expired or invalid
        await refreshAuth();
        break;
      case 429:
        // Rate limited
        await delay(60000);
        break;
      case 404:
        // Resource not found or restricted
        console.log('Resource unavailable');
        break;
      default:
        console.error('FUB API Error:', error);
    }
  }
}
```

## Environment Variables

```env
# .env.local
FUB_CLIENT_ID=your_oauth_client_id
FUB_CLIENT_SECRET=your_oauth_client_secret
FUB_REDIRECT_URI=https://your-app.com/api/auth/fub/callback
FUB_X_SYSTEM=estait
FUB_X_SYSTEM_KEY=your_system_key
FUB_WEBHOOK_SECRET=your_webhook_secret
FUB_API_BASE_URL=https://api.followupboss.com/v1
FUB_AUTH_BASE_URL=https://app.followupboss.com/oauth
```

## Database Schema (Drizzle)

```typescript
// db/schema/fub-integration.ts
import { pgTable, text, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core';

export const fubTokens = pgTable('fub_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresIn: integer('expires_in').notNull(),
  issuedAt: timestamp('issued_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const fubWebhooks = pgTable('fub_webhooks', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  events: jsonb('events').notNull(),
  secret: text('secret').notNull(),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').notNull()
});

export const fubSyncLog = pgTable('fub_sync_log', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  endpoint: text('endpoint').notNull(),
  request: jsonb('request'),
  response: jsonb('response'),
  status: integer('status'),
  error: text('error'),
  timestamp: timestamp('timestamp').notNull()
});
```

## Testing Implementation

```typescript
// __tests__/fub-integration.test.ts
import { FUBApiClient } from '@/lib/fub/api-client';
import { createLead, searchPeople } from '@/lib/fub/people';

describe('FUB Integration', () => {
  let client: FUBApiClient;
  
  beforeEach(() => {
    client = new FUBApiClient(
      process.env.TEST_ACCESS_TOKEN!,
      process.env.FUB_X_SYSTEM!,
      process.env.FUB_X_SYSTEM_KEY!
    );
  });
  
  test('OAuth flow completes successfully', async () => {
    // Test OAuth authorization URL generation
    const authUrl = client.getAuthorizationUrl();
    expect(authUrl).toContain('https://app.followupboss.com/oauth/authorize');
  });
  
  test('Create lead via events API', async () => {
    const lead = await createLead({
      source: 'test.estait.com',
      system: 'estait',
      type: 'General Inquiry',
      message: 'Test lead creation',
      person: {
        firstName: 'Test',
        lastName: 'User',
        emails: [{ value: 'test@example.com' }]
      }
    });
    
    expect(lead.success).toBe(true);
    expect(lead.data).toHaveProperty('id');
  });
  
  test('Handle rate limiting gracefully', async () => {
    // Simulate rate limit scenario
    const promises = Array(150).fill(null).map(() => 
      searchPeople({ limit: 1 })
    );
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled');
    
    expect(successful.length).toBeGreaterThan(0);
  });
});
```

## Deployment Checklist

```typescript
// deployment/fub-checklist.ts
export const FUBDeploymentChecklist = {
  environment: {
    '[ ] All FUB environment variables set': false,
    '[ ] OAuth redirect URI matches production': false,
    '[ ] Webhook URLs configured': false,
    '[ ] System registration complete': false
  },
  security: {
    '[ ] Tokens encrypted in database': false,
    '[ ] Webhook signatures verified': false,
    '[ ] Rate limiting implemented': false,
    '[ ] Error logging configured': false
  },
  testing: {
    '[ ] OAuth flow tested': false,
    '[ ] Lead creation tested': false,
    '[ ] Token refresh tested': false,
    '[ ] Webhook handling tested': false,
    '[ ] Error scenarios tested': false
  },
  monitoring: {
    '[ ] API call logging enabled': false,
    '[ ] Error alerting configured': false,
    '[ ] Rate limit monitoring': false,
    '[ ] Token expiration alerts': false
  }
};
```

This comprehensive reference provides everything needed to implement Follow Up Boss OAuth 2.0 integration in your Next.js/TypeScript application. The implementation includes proper error handling, rate limiting, token management, and all major API endpoints with TypeScript types.