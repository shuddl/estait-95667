# RealEstateAPI.com Integration Reference for Estait
## Complete Implementation Guide for Next.js TypeScript Application

### API Configuration
```typescript
// Environment Variables (.env.local)
REALESTATE_API_KEY=STOYC-1db8-7e5d-b2ff-92045cf12576
REALESTATE_API_BASE_URL=https://api.realestateapi.com/v2
```

### Authentication Setup
```typescript
// lib/realestate/config.ts
export const realestateConfig = {
  apiKey: process.env.REALESTATE_API_KEY!,
  baseUrl: process.env.REALESTATE_API_BASE_URL || 'https://api.realestateapi.com/v2',
  headers: {
    'x-api-key': process.env.REALESTATE_API_KEY!,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};
```

---

## Core API Endpoints Implementation

### 1. MLS Property Search
**Endpoint:** `POST /PropertySearch`

```typescript
// app/api/realestate/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { realestateConfig } from '@/lib/realestate/config';
import { z } from 'zod';

// Search parameters schema
const SearchSchema = z.object({
  // Geographic filters
  state: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  zip: z.string().optional(),
  street_address: z.string().optional(),
  
  // Status filters (MLS-specific)
  mls_active: z.boolean().optional(),
  mls_pending: z.boolean().optional(),
  mls_cancelled: z.boolean().optional(),
  mls_sold: z.boolean().optional(),
  
  // Price filters
  listing_price_min: z.number().optional(),
  listing_price_max: z.number().optional(),
  
  // Property characteristics
  bedrooms_min: z.number().optional(),
  bedrooms_max: z.number().optional(),
  bathrooms_min: z.number().optional(),
  bathrooms_max: z.number().optional(),
  living_area_min: z.number().optional(),
  living_area_max: z.number().optional(),
  lot_size_min: z.number().optional(),
  lot_size_max: z.number().optional(),
  
  // Property types
  property_type: z.enum(['Single Family', 'Condo', 'Townhouse', 'Multi-Family']).optional(),
  property_sub_type: z.string().optional(),
  
  // Features & amenities
  pool: z.boolean().optional(),
  garage: z.boolean().optional(),
  waterfront: z.boolean().optional(),
  fireplace: z.boolean().optional(),
  
  // Listing dates
  listing_date_min: z.string().optional(), // ISO date
  listing_date_max: z.string().optional(),
  
  // Agent search
  listing_agent_email: z.string().email().optional(),
  listing_office_name: z.string().optional(),
  
  // Search settings
  size: z.number().min(1).max(250).default(50),
  sort_by: z.enum(['price', 'date', 'beds', 'baths']).optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const params = SearchSchema.parse(body);
    
    const response = await fetch(`${realestateConfig.baseUrl}/PropertySearch`, {
      method: 'POST',
      headers: realestateConfig.headers,
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Search failed', details: error },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Transform response for frontend
    return NextResponse.json({
      success: true,
      total: data.recordCount || 0,
      properties: data.data || [],
      pagination: {
        page: data.page || 1,
        pageSize: params.size,
        hasMore: data.hasMore || false
      }
    });
  } catch (error) {
    console.error('Property search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. MLS Property Details
**Endpoint:** `POST /PropertyDetail`

```typescript
// app/api/realestate/detail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { realestateConfig } from '@/lib/realestate/config';
import { z } from 'zod';

const DetailSchema = z.object({
  property_id: z.string(),
  mls_number: z.string().optional(),
  include_comparables: z.boolean().default(false),
  include_history: z.boolean().default(true)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const params = DetailSchema.parse(body);
    
    const response = await fetch(`${realestateConfig.baseUrl}/PropertyDetail`, {
      method: 'POST',
      headers: realestateConfig.headers,
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Enrich with photo URLs
    const property = {
      ...data.data,
      photos: data.data.photos?.map((photo: any) => ({
        url: photo.href,
        caption: photo.caption,
        order: photo.order
      })) || []
    };
    
    return NextResponse.json({
      success: true,
      property
    });
  } catch (error) {
    console.error('Property detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch property details' },
      { status: 500 }
    );
  }
}
```

### 3. Agent Listings Search
**Endpoint:** `POST /PropertySearch` with agent filters

```typescript
// app/api/realestate/agent-listings/route.ts
export async function POST(request: NextRequest) {
  try {
    const { agent_email, office_name, active_only = true } = await request.json();
    
    const searchParams = {
      listing_agent_email: agent_email,
      listing_office_name: office_name,
      mls_active: active_only,
      size: 100
    };
    
    const response = await fetch(`${realestateConfig.baseUrl}/PropertySearch`, {
      method: 'POST',
      headers: realestateConfig.headers,
      body: JSON.stringify(searchParams)
    });
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      agent: agent_email || office_name,
      total_listings: data.recordCount || 0,
      listings: data.data || []
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch agent listings' },
      { status: 500 }
    );
  }
}
```

### 4. MLS Data Updates & New Listings
**Endpoint:** `POST /PropertySearch` with date filters

```typescript
// app/api/realestate/updates/route.ts
export async function POST(request: NextRequest) {
  try {
    const { since_date, markets = [], status = 'active' } = await request.json();
    
    // Get listings updated since specified date
    const searchParams = {
      modified_date_min: since_date,
      mls_active: status === 'active',
      mls_pending: status === 'pending',
      mls_sold: status === 'sold',
      size: 250
    };
    
    // Add market filters if specified
    if (markets.length > 0) {
      Object.assign(searchParams, {
        city: markets[0].city,
        state: markets[0].state
      });
    }
    
    const response = await fetch(`${realestateConfig.baseUrl}/PropertySearch`, {
      method: 'POST',
      headers: realestateConfig.headers,
      body: JSON.stringify(searchParams)
    });
    
    const data = await response.json();
    
    // Categorize updates
    const updates = {
      new_listings: [],
      price_changes: [],
      status_changes: [],
      total: data.recordCount || 0
    };
    
    // Process listings to categorize changes
    data.data?.forEach((listing: any) => {
      if (listing.is_new_listing) {
        updates.new_listings.push(listing);
      } else if (listing.price_change_amount) {
        updates.price_changes.push(listing);
      } else {
        updates.status_changes.push(listing);
      }
    });
    
    return NextResponse.json({
      success: true,
      updates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch MLS updates' },
      { status: 500 }
    );
  }
}
```

---

## TypeScript Types & Interfaces

```typescript
// types/realestate.ts
export interface MLSProperty {
  property_id: string;
  mls_number: string;
  status: 'Active' | 'Pending' | 'Sold' | 'Cancelled';
  listing_price: number;
  original_listing_price?: number;
  
  // Address
  street_address: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
  latitude?: number;
  longitude?: number;
  
  // Property details
  bedrooms: number;
  bathrooms: number;
  half_bathrooms?: number;
  living_area: number;
  lot_size?: number;
  year_built?: number;
  property_type: string;
  property_sub_type?: string;
  
  // Features
  garage_spaces?: number;
  pool?: boolean;
  waterfront?: boolean;
  fireplace?: boolean;
  hoa_fee?: number;
  
  // Listing info
  listing_date: string;
  days_on_market: number;
  price_per_sqft?: number;
  
  // Agent/Office
  listing_agent_name?: string;
  listing_agent_email?: string;
  listing_agent_phone?: string;
  listing_office_name?: string;
  listing_office_phone?: string;
  
  // Media
  photos?: MLSPhoto[];
  virtual_tour_url?: string;
  
  // Remarks
  public_remarks?: string;
  agent_remarks?: string;
}

export interface MLSPhoto {
  url: string;
  caption?: string;
  order: number;
  width?: number;
  height?: number;
}

export interface PropertySearchParams {
  // Location
  state?: string;
  city?: string;
  county?: string;
  zip?: string;
  
  // Status
  mls_active?: boolean;
  mls_pending?: boolean;
  mls_sold?: boolean;
  
  // Price
  listing_price_min?: number;
  listing_price_max?: number;
  
  // Size
  bedrooms_min?: number;
  bathrooms_min?: number;
  living_area_min?: number;
  
  // Pagination
  size?: number;
  page?: number;
}
```

---

## React Components Implementation

### Property Search Component
```tsx
// components/property-search.tsx
import { useState } from 'react';
import { Search, Filter, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export function PropertySearch({ onSearch }: { onSearch: (params: any) => void }) {
  const [searchParams, setSearchParams] = useState({
    city: '',
    state: '',
    priceMin: '',
    priceMax: '',
    bedsMin: '',
    bathsMin: '',
    propertyType: 'all',
    status: 'active'
  });
  
  const handleSearch = async () => {
    const params: any = {
      mls_active: searchParams.status === 'active',
      mls_pending: searchParams.status === 'pending',
      size: 50
    };
    
    if (searchParams.city) params.city = searchParams.city;
    if (searchParams.state) params.state = searchParams.state;
    if (searchParams.priceMin) params.listing_price_min = parseInt(searchParams.priceMin);
    if (searchParams.priceMax) params.listing_price_max = parseInt(searchParams.priceMax);
    if (searchParams.bedsMin) params.bedrooms_min = parseInt(searchParams.bedsMin);
    if (searchParams.bathsMin) params.bathrooms_min = parseInt(searchParams.bathsMin);
    if (searchParams.propertyType !== 'all') params.property_type = searchParams.propertyType;
    
    onSearch(params);
  };
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          <div className="flex gap-2">
            <Input
              placeholder="City"
              value={searchParams.city}
              onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
            />
            <Input
              placeholder="State"
              value={searchParams.state}
              onChange={(e) => setSearchParams({ ...searchParams, state: e.target.value })}
              className="w-20"
            />
          </div>
        </div>
        
        {/* Price Range */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Price Range</label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={searchParams.priceMin}
              onChange={(e) => setSearchParams({ ...searchParams, priceMin: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Max"
              value={searchParams.priceMax}
              onChange={(e) => setSearchParams({ ...searchParams, priceMax: e.target.value })}
            />
          </div>
        </div>
        
        {/* Beds & Baths */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Beds & Baths</label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Beds"
              value={searchParams.bedsMin}
              onChange={(e) => setSearchParams({ ...searchParams, bedsMin: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Baths"
              value={searchParams.bathsMin}
              onChange={(e) => setSearchParams({ ...searchParams, bathsMin: e.target.value })}
            />
          </div>
        </div>
        
        {/* Property Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Property Type</label>
          <Select
            value={searchParams.propertyType}
            onValueChange={(value) => setSearchParams({ ...searchParams, propertyType: value })}
          >
            <option value="all">All Types</option>
            <option value="Single Family">Single Family</option>
            <option value="Condo">Condo</option>
            <option value="Townhouse">Townhouse</option>
            <option value="Multi-Family">Multi-Family</option>
          </Select>
        </div>
        
        {/* Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select
            value={searchParams.status}
            onValueChange={(value) => setSearchParams({ ...searchParams, status: value })}
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
          </Select>
        </div>
        
        {/* Search Button */}
        <div className="flex items-end">
          <Button onClick={handleSearch} className="w-full">
            <Search className="w-4 h-4 mr-2" />
            Search Properties
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Property Card Component
```tsx
// components/property-card.tsx
import Image from 'next/image';
import { Bed, Bath, Ruler, Calendar } from 'lucide-react';
import { MLSProperty } from '@/types/realestate';

export function PropertyCard({ property }: { property: MLSProperty }) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative h-48 bg-gray-200">
        {property.photos?.[0] && (
          <Image
            src={property.photos[0].url}
            alt={property.street_address}
            fill
            className="object-cover"
          />
        )}
        <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
          {property.status}
        </div>
      </div>
      
      {/* Details */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold">{formatPrice(property.listing_price)}</h3>
          <span className="text-sm text-gray-500">${property.price_per_sqft}/sqft</span>
        </div>
        
        <p className="text-gray-600 mb-3">
          {property.street_address}<br />
          {property.city}, {property.state} {property.zip}
        </p>
        
        <div className="flex gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Bed className="w-4 h-4" />
            {property.bedrooms} beds
          </div>
          <div className="flex items-center gap-1">
            <Bath className="w-4 h-4" />
            {property.bathrooms} baths
          </div>
          <div className="flex items-center gap-1">
            <Ruler className="w-4 h-4" />
            {property.living_area.toLocaleString()} sqft
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t flex justify-between text-sm">
          <span className="text-gray-500">
            <Calendar className="w-4 h-4 inline mr-1" />
            {property.days_on_market} days
          </span>
          <span className="text-gray-500">MLS# {property.mls_number}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## Service Layer Implementation

```typescript
// lib/realestate/service.ts
import { MLSProperty, PropertySearchParams } from '@/types/realestate';

export class RealEstateService {
  private apiKey: string;
  private baseUrl: string;
  
  constructor() {
    this.apiKey = process.env.REALESTATE_API_KEY!;
    this.baseUrl = process.env.REALESTATE_API_BASE_URL!;
  }
  
  async searchProperties(params: PropertySearchParams): Promise<{
    properties: MLSProperty[];
    total: number;
  }> {
    const response = await fetch('/api/realestate/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      throw new Error('Property search failed');
    }
    
    return response.json();
  }
  
  async getPropertyDetail(propertyId: string): Promise<MLSProperty> {
    const response = await fetch('/api/realestate/detail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: propertyId })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch property details');
    }
    
    const data = await response.json();
    return data.property;
  }
  
  async getAgentListings(agentEmail: string): Promise<MLSProperty[]> {
    const response = await fetch('/api/realestate/agent-listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_email: agentEmail })
    });
    
    const data = await response.json();
    return data.listings;
  }
  
  async getMarketUpdates(sinceDate: string, markets: any[]): Promise<any> {
    const response = await fetch('/api/realestate/updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ since_date: sinceDate, markets })
    });
    
    return response.json();
  }
}

// Singleton instance
export const realEstateService = new RealEstateService();
```

---

## Error Handling & Retry Logic

```typescript
// lib/realestate/client.ts
export class RealEstateAPIClient {
  private maxRetries = 3;
  private retryDelay = 1000;
  
  async request<T>(
    endpoint: string,
    params: any,
    retries = this.maxRetries
  ): Promise<T> {
    try {
      const response = await fetch(`${realestateConfig.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: realestateConfig.headers,
        body: JSON.stringify(params)
      });
      
      // Rate limit handling
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '5';
        await this.delay(parseInt(retryAfter) * 1000);
        return this.request(endpoint, params, retries - 1);
      }
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      if (retries > 0) {
        await this.delay(this.retryDelay);
        return this.request(endpoint, params, retries - 1);
      }
      throw error;
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## Caching Strategy

```typescript
// lib/realestate/cache.ts
import { LRUCache } from 'lru-cache';

class PropertyCache {
  private searchCache: LRUCache<string, any>;
  private detailCache: LRUCache<string, any>;
  
  constructor() {
    // Cache search results for 5 minutes
    this.searchCache = new LRUCache({
      max: 100,
      ttl: 1000 * 60 * 5
    });
    
    // Cache property details for 15 minutes
    this.detailCache = new LRUCache({
      max: 500,
      ttl: 1000 * 60 * 15
    });
  }
  
  getCachedSearch(key: string): any | null {
    return this.searchCache.get(key);
  }
  
  setCachedSearch(key: string, data: any): void {
    this.searchCache.set(key, data);
  }
  
  getCachedDetail(propertyId: string): any | null {
    return this.detailCache.get(propertyId);
  }
  
  setCachedDetail(propertyId: string, data: any): void {
    this.detailCache.set(propertyId, data);
  }
  
  clearCache(): void {
    this.searchCache.clear();
    this.detailCache.clear();
  }
}

export const propertyCache = new PropertyCache();
```

---

## Image Handling & CDN Configuration

```typescript
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'imagecdn.realty.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'photos.zillowstatic.com',
        pathname: '/**',
      }
    ],
  },
};

// components/property-image.tsx
import Image from 'next/image';
import { useState } from 'react';

export function PropertyImage({ 
  src, 
  alt, 
  className = '',
  fallbackSrc = '/images/no-property-image.jpg' 
}) {
  const [imgSrc, setImgSrc] = useState(src);
  
  return (
    <Image
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => setImgSrc(fallbackSrc)}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}
```

---

## Testing Suite

```typescript
// __tests__/realestate-api.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { RealEstateService } from '@/lib/realestate/service';

describe('RealEstate API Integration', () => {
  let service: RealEstateService;
  
  beforeAll(() => {
    service = new RealEstateService();
  });
  
  describe('Property Search', () => {
    it('should search properties by city', async () => {
      const results = await service.searchProperties({
        city: 'Austin',
        state: 'TX',
        mls_active: true
      });
      
      expect(results.properties).toBeDefined();
      expect(Array.isArray(results.properties)).toBe(true);
      expect(results.total).toBeGreaterThanOrEqual(0);
    });
    
    it('should filter by price range', async () => {
      const results = await service.searchProperties({
        city: 'Houston',
        state: 'TX',
        listing_price_min: 200000,
        listing_price_max: 500000,
        mls_active: true
      });
      
      results.properties.forEach(property => {
        expect(property.listing_price).toBeGreaterThanOrEqual(200000);
        expect(property.listing_price).toBeLessThanOrEqual(500000);
      });
    });
    
    it('should handle no results gracefully', async () => {
      const results = await service.searchProperties({
        city: 'NonexistentCity',
        state: 'XX',
        mls_active: true
      });
      
      expect(results.properties).toEqual([]);
      expect(results.total).toBe(0);
    });
  });
  
  describe('Property Details', () => {
    it('should fetch complete property details', async () => {
      const property = await service.getPropertyDetail('test-property-id');
      
      expect(property).toBeDefined();
      expect(property.property_id).toBe('test-property-id');
      expect(property.street_address).toBeDefined();
      expect(property.photos).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    it('should retry on network failure', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], recordCount: 0 })
      } as Response);
      
      const results = await service.searchProperties({ city: 'Austin' });
      
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(results).toBeDefined();
    });
    
    it('should handle rate limiting', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '1' })
      } as Response);
      
      await expect(service.searchProperties({ city: 'Austin' }))
        .rejects.toThrow();
    });
  });
});
```

---

## Production Deployment Checklist

### Environment Variables
```bash
# .env.production
REALESTATE_API_KEY=STOYC-1db8-7e5d-b2ff-92045cf12576
REALESTATE_API_BASE_URL=https://api.realestateapi.com/v2
NEXT_PUBLIC_APP_URL=https://estait.vercel.app
```

### Security Headers
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // API key protection
  if (request.nextUrl.pathname.startsWith('/api/realestate')) {
    // Ensure API key is never exposed in response
    response.headers.delete('x-api-key');
  }
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

### Monitoring & Analytics
```typescript
// lib/realestate/monitoring.ts
export function trackAPICall(
  endpoint: string,
  params: any,
  response: any,
  duration: number
) {
  // Send to analytics service
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'api_call', {
      event_category: 'RealEstateAPI',
      event_label: endpoint,
      value: duration,
      custom_map: {
        dimension1: params.city,
        dimension2: params.state,
        metric1: response.total
      }
    });
  }
  
  // Log for debugging
  console.log('[RealEstateAPI]', {
    endpoint,
    duration: `${duration}ms`,
    results: response.total || 0,
    timestamp: new Date().toISOString()
  });
}
```

---

## Claude Code Prompt Template

```markdown
ROLE: Senior Next.js Developer specializing in Real Estate APIs
CONTEXT: Building Estait AI - mobile-first real estate CRM layer

TASK: Implement RealEstateAPI.com integration for MLS property search and details

REQUIREMENTS:
- Next.js 15.3 with App Router
- TypeScript with strict types
- Tailwind CSS for styling
- Mobile-first responsive design
- Error handling with retry logic
- Secure API key management
- Image optimization with Next/Image
- Caching strategy for performance
- Comprehensive test coverage

IMPLEMENTATION:
1. Create API routes in app/api/realestate/
2. Build TypeScript interfaces for all data models
3. Implement service layer with error handling
4. Create React components for search and display
5. Add caching layer for optimization
6. Write unit and integration tests
7. Configure environment variables
8. Set up monitoring and analytics

API KEY: STOYC-1db8-7e5d-b2ff-92045cf12576
BASE URL: https://api.realestateapi.com/v2

SUCCESS METRICS:
- API response time < 2 seconds
- Image load time < 1 second
- Mobile Lighthouse score > 90
- Test coverage > 90%
- Zero security vulnerabilities

DELIVERABLES:
- Complete API integration layer
- Property search UI components
- Property detail modal
- Agent listings view
- Market updates dashboard
- Full documentation
- Test suite
```

---

## Notes for Gemini/Claude Code Implementation

1. **API Key Security**: Never expose the API key in client-side code. Always use server-side API routes.

2. **Rate Limiting**: RealEstateAPI has rate limits. Implement retry logic with exponential backoff.

3. **Image Optimization**: Property photos can be large. Use Next.js Image component with proper sizing.

4. **Caching**: Cache search results for 5 minutes, property details for 15 minutes to reduce API calls.

5. **Error States**: Always show user-friendly error messages with actionable next steps.

6. **Mobile Performance**: Lazy load images, use skeleton loaders, implement virtual scrolling for large result sets.

7. **Testing**: Mock API responses in tests to avoid hitting production API during CI/CD.

8. **Monitoring**: Track API performance, error rates, and user search patterns for optimization.

This comprehensive reference provides everything needed to implement the RealEstateAPI integration in your Estait application.
