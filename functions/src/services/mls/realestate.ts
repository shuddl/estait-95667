/**
 * Real Estate MLS Integration Service
 * Handles property searches and listing data from multiple MLS sources
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

export interface MLSProperty {
  id: string;
  mls_number?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county?: string;
  };
  price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  lot_size?: number;
  year_built?: number;
  property_type: "house" | "condo" | "townhouse" | "land" | "commercial" | "multi-family";
  listing_status: "active" | "pending" | "sold" | "withdrawn" | "expired";
  listing_date?: string;
  days_on_market?: number;
  description?: string;
  features?: string[];
  images?: string[];
  virtual_tour_url?: string;
  agent?: {
    name: string;
    phone?: string;
    email?: string;
    brokerage?: string;
  };
  schools?: {
    elementary?: string;
    middle?: string;
    high?: string;
  };
  hoa_fee?: number;
  property_tax?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface PropertySearchParams {
  // Location parameters
  location?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  radius?: number; // miles from location
  
  // Price parameters
  min_price?: number;
  max_price?: number;
  
  // Size parameters
  min_beds?: number;
  max_beds?: number;
  min_baths?: number;
  max_baths?: number;
  min_sqft?: number;
  max_sqft?: number;
  min_lot_size?: number;
  max_lot_size?: number;
  
  // Property details
  property_type?: string[];
  listing_status?: string[];
  year_built_min?: number;
  year_built_max?: number;
  
  // Additional filters
  has_pool?: boolean;
  has_garage?: boolean;
  has_basement?: boolean;
  waterfront?: boolean;
  foreclosure?: boolean;
  new_construction?: boolean;
  open_houses?: boolean;
  price_reduced?: boolean;
  
  // Sorting and pagination
  sort_by?: "price" | "newest" | "beds" | "baths" | "sqft";
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PropertySearchResult {
  properties: MLSProperty[];
  total_count: number;
  page: number;
  per_page: number;
  search_params: PropertySearchParams;
  aggregations?: {
    avg_price?: number;
    median_price?: number;
    price_range?: { min: number; max: number };
    property_type_counts?: Record<string, number>;
    city_counts?: Record<string, number>;
  };
}

export interface MarketStats {
  location: string;
  period: string;
  median_list_price: number;
  median_sold_price: number;
  avg_days_on_market: number;
  inventory_count: number;
  sold_count: number;
  price_per_sqft: number;
  month_over_month_change: number;
  year_over_year_change: number;
}

export class RealEstateMLSService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://realty-mole-property-api.p.rapidapi.com";
  
  constructor() {
    this.apiKey = process.env.REALESTATEAPI_KEY || 
                  functions.config().realestateapi?.key || 
                  "STOYC-1db8-7e5d-b2ff-92045cf12576";
    
    if (!this.apiKey) {
      console.warn("RealEstateAPI key is not configured. MLS searches will be limited.");
    }
  }
  
  /**
   * Search properties based on criteria
   */
  async searchProperties(params: PropertySearchParams): Promise<PropertySearchResult> {
    if (!this.apiKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Real Estate API key is not configured."
      );
    }
    
    const url = new URL(`${this.baseUrl}/properties/search`);
    
    // Build query parameters
    if (params.location) url.searchParams.append("location", params.location);
    if (params.city) url.searchParams.append("city", params.city);
    if (params.state) url.searchParams.append("state", params.state);
    if (params.zip) url.searchParams.append("zip", params.zip);
    if (params.radius) url.searchParams.append("radius", params.radius.toString());
    
    if (params.min_price) url.searchParams.append("price_min", params.min_price.toString());
    if (params.max_price) url.searchParams.append("price_max", params.max_price.toString());
    
    if (params.min_beds) url.searchParams.append("beds_min", params.min_beds.toString());
    if (params.max_beds) url.searchParams.append("beds_max", params.max_beds.toString());
    if (params.min_baths) url.searchParams.append("baths_min", params.min_baths.toString());
    if (params.max_baths) url.searchParams.append("baths_max", params.max_baths.toString());
    
    if (params.min_sqft) url.searchParams.append("sqft_min", params.min_sqft.toString());
    if (params.max_sqft) url.searchParams.append("sqft_max", params.max_sqft.toString());
    
    if (params.property_type?.length) {
      url.searchParams.append("property_type", params.property_type.join(","));
    }
    
    if (params.listing_status?.length) {
      url.searchParams.append("listing_status", params.listing_status.join(","));
    }
    
    // Additional filters
    if (params.has_pool !== undefined) url.searchParams.append("has_pool", params.has_pool.toString());
    if (params.waterfront !== undefined) url.searchParams.append("waterfront", params.waterfront.toString());
    if (params.new_construction !== undefined) url.searchParams.append("new_construction", params.new_construction.toString());
    
    // Pagination
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100); // Max 100 per page
    url.searchParams.append("page", page.toString());
    url.searchParams.append("limit", limit.toString());
    
    // Sorting
    if (params.sort_by) {
      const order = params.sort_order || "desc";
      url.searchParams.append("sort", `${params.sort_by}:${order}`);
    }
    
    try {
      // Use RapidAPI for real estate data
      const rapidApiUrl = `${this.baseUrl}/properties`;
      
      const queryParams = new URLSearchParams();
      if (params.city) queryParams.append('city', params.city);
      if (params.state) queryParams.append('state', params.state);
      if (params.min_price) queryParams.append('minPrice', params.min_price.toString());
      if (params.max_price) queryParams.append('maxPrice', params.max_price.toString());
      if (params.min_beds) queryParams.append('bedrooms', params.min_beds.toString());
      if (params.min_baths) queryParams.append('bathrooms', params.min_baths.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      
      const response = await fetch(`${rapidApiUrl}?${queryParams.toString()}`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'realty-mole-property-api.p.rapidapi.com',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Property search failed: ${error}`);
      }
      
      const data = await response.json();
      
      // Transform API response to our format
      return this.transformSearchResults(data, params, page, limit);
      
    } catch (error) {
      console.error("Error searching properties:", error);
      
      // Return empty result on error
      return {
        properties: [],
        total_count: 0,
        page: params.page || 1,
        per_page: params.limit || 20,
        search_params: params
      };
      
      throw new functions.https.HttpsError(
        "internal",
        "Failed to search properties. Please try again."
      );
    }
  }
  
  /**
   * Get property details by ID or MLS number
   */
  async getPropertyDetails(propertyId: string): Promise<MLSProperty> {
    if (!this.apiKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Real Estate API key is not configured."
      );
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/properties/${propertyId}`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'realty-mole-property-api.p.rapidapi.com',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get property details: ${response.statusText}`);
      }
      
      const data = await response.json();
      return this.transformProperty(data);
      
    } catch (error) {
      console.error("Error getting property details:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get property details."
      );
    }
  }
  
  /**
   * Get comparable properties (comps)
   */
  async getComparables(propertyId: string, radius: number = 1): Promise<MLSProperty[]> {
    if (!this.apiKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Real Estate API key is not configured."
      );
    }
    
    try {
      const property = await this.getPropertyDetails(propertyId);
      
      // Search for similar properties nearby
      const searchParams: PropertySearchParams = {
        location: `${property.address.city}, ${property.address.state}`,
        radius,
        min_beds: Math.max(1, property.bedrooms - 1),
        max_beds: property.bedrooms + 1,
        min_baths: Math.max(1, property.bathrooms - 0.5),
        max_baths: property.bathrooms + 0.5,
        min_price: property.price * 0.8,
        max_price: property.price * 1.2,
        property_type: [property.property_type],
        listing_status: ["sold"],
        limit: 10
      };
      
      if (property.square_feet) {
        searchParams.min_sqft = property.square_feet * 0.8;
        searchParams.max_sqft = property.square_feet * 1.2;
      }
      
      const results = await this.searchProperties(searchParams);
      return results.properties.filter(p => p.id !== propertyId);
      
    } catch (error) {
      console.error("Error getting comparables:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get comparable properties."
      );
    }
  }
  
  /**
   * Get market statistics for a location
   */
  async getMarketStats(location: string, period: "month" | "quarter" | "year" = "month"): Promise<MarketStats> {
    if (!this.apiKey) {
      // Return mock data if API key not configured
      // Return default stats if API key not configured
      return {
        location,
        period,
        median_list_price: 0,
        median_sold_price: 0,
        avg_days_on_market: 0,
        inventory_count: 0,
        sold_count: 0,
        price_per_sqft: 0,
        month_over_month_change: 0,
        year_over_year_change: 0
      };
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/market/stats`, {
        headers: {
          "x-api-key": this.apiKey,
          "Accept": "application/json"
        },
        method: "POST",
        body: JSON.stringify({ location, period })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get market stats: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error("Error getting market stats:", error);
      // Return default stats if API key not configured
      return {
        location,
        period,
        median_list_price: 0,
        median_sold_price: 0,
        avg_days_on_market: 0,
        inventory_count: 0,
        sold_count: 0,
        price_per_sqft: 0,
        month_over_month_change: 0,
        year_over_year_change: 0
      };
    }
  }
  
  /**
   * Get property value estimate
   */
  async getPropertyEstimate(propertyId: string): Promise<{
    estimated_value: number;
    confidence_score: number;
    value_range: { low: number; high: number };
    last_sold_price?: number;
    last_sold_date?: string;
  }> {
    if (!this.apiKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Real Estate API key is not configured."
      );
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/properties/${propertyId}/estimate`, {
        headers: {
          "x-api-key": this.apiKey,
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get property estimate: ${response.statusText}`);
      }
      
      return await response.json();
      
    } catch (error) {
      console.error("Error getting property estimate:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get property value estimate."
      );
    }
  }
  
  /**
   * Transform API response to our format
   */
  private transformSearchResults(
    apiData: any,
    searchParams: PropertySearchParams,
    page: number,
    limit: number
  ): PropertySearchResult {
    const properties = (apiData.properties || apiData.listings || []).map((p: any) => 
      this.transformProperty(p)
    );
    
    return {
      properties,
      total_count: apiData.total_count || properties.length,
      page,
      per_page: limit,
      search_params: searchParams,
      aggregations: apiData.aggregations
    };
  }
  
  /**
   * Transform single property data
   */
  private transformProperty(apiProperty: any): MLSProperty {
    return {
      id: apiProperty.id || apiProperty.listing_id || "",
      mls_number: apiProperty.mls_number || apiProperty.mls_id,
      address: {
        street: apiProperty.address || apiProperty.street_address || "",
        city: apiProperty.city || "",
        state: apiProperty.state || "",
        zip: apiProperty.zip || apiProperty.postal_code || "",
        county: apiProperty.county
      },
      price: apiProperty.price || apiProperty.list_price || 0,
      bedrooms: apiProperty.bedrooms || apiProperty.beds || 0,
      bathrooms: apiProperty.bathrooms || apiProperty.baths || 0,
      square_feet: apiProperty.square_feet || apiProperty.sqft,
      lot_size: apiProperty.lot_size,
      year_built: apiProperty.year_built,
      property_type: this.normalizePropertyType(apiProperty.property_type || apiProperty.type),
      listing_status: this.normalizeListingStatus(apiProperty.status || apiProperty.listing_status),
      listing_date: apiProperty.listing_date || apiProperty.list_date,
      days_on_market: apiProperty.days_on_market || apiProperty.dom,
      description: apiProperty.description || apiProperty.remarks,
      features: apiProperty.features || apiProperty.amenities || [],
      images: apiProperty.images || apiProperty.photos || [],
      virtual_tour_url: apiProperty.virtual_tour_url,
      agent: apiProperty.agent ? {
        name: apiProperty.agent.name || "",
        phone: apiProperty.agent.phone,
        email: apiProperty.agent.email,
        brokerage: apiProperty.agent.brokerage
      } : undefined,
      schools: apiProperty.schools,
      hoa_fee: apiProperty.hoa_fee,
      property_tax: apiProperty.property_tax || apiProperty.tax_amount,
      coordinates: apiProperty.coordinates || 
        (apiProperty.latitude && apiProperty.longitude ? {
          lat: apiProperty.latitude,
          lng: apiProperty.longitude
        } : undefined)
    };
  }
  
  /**
   * Normalize property type to our enum
   */
  private normalizePropertyType(type: string): MLSProperty["property_type"] {
    const normalized = type?.toLowerCase() || "";
    
    if (normalized.includes("condo")) return "condo";
    if (normalized.includes("town")) return "townhouse";
    if (normalized.includes("land") || normalized.includes("lot")) return "land";
    if (normalized.includes("commercial")) return "commercial";
    if (normalized.includes("multi") || normalized.includes("plex")) return "multi-family";
    
    return "house";
  }
  
  /**
   * Normalize listing status to our enum
   */
  private normalizeListingStatus(status: string): MLSProperty["listing_status"] {
    const normalized = status?.toLowerCase() || "";
    
    if (normalized.includes("pending")) return "pending";
    if (normalized.includes("sold") || normalized.includes("closed")) return "sold";
    if (normalized.includes("withdrawn") || normalized.includes("cancelled")) return "withdrawn";
    if (normalized.includes("expired")) return "expired";
    
    return "active";
  }
  
  /**
   * Search properties from Firestore database
   */
  private async searchFirestoreProperties(params: PropertySearchParams): Promise<PropertySearchResult> {
    const db = admin.firestore();
    let query: FirebaseFirestore.Query = db.collection('properties');
    
    // Apply filters
    if (params.listing_status?.length) {
      query = query.where('listing_status', 'in', params.listing_status);
    } else {
      // Default to active listings
      query = query.where('listing_status', '==', 'active');
    }
    
    if (params.city) {
      query = query.where('address.city', '==', params.city);
    }
    
    if (params.state) {
      query = query.where('address.state', '==', params.state);
    }
    
    if (params.property_type?.length === 1) {
      query = query.where('property_type', '==', params.property_type[0]);
    }
    
    // Price range (Firestore limitation: can only use range on one field)
    if (params.min_price && params.max_price) {
      query = query.where('price', '>=', params.min_price)
                   .where('price', '<=', params.max_price);
    } else if (params.min_price) {
      query = query.where('price', '>=', params.min_price);
    } else if (params.max_price) {
      query = query.where('price', '<=', params.max_price);
    }
    
    // Sorting
    if (params.sort_by === 'price') {
      query = query.orderBy('price', params.sort_order || 'asc');
    } else if (params.sort_by === 'newest') {
      query = query.orderBy('listing_date', 'desc');
    } else {
      // Default sort by listing date
      query = query.orderBy('listing_date', 'desc');
    }
    
    // Pagination
    const limit = Math.min(params.limit || 20, 100);
    query = query.limit(limit);
    
    if (params.page && params.page > 1) {
      query = query.offset((params.page - 1) * limit);
    }
    
    try {
      const snapshot = await query.get();
      const properties: MLSProperty[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Additional client-side filtering for complex conditions
        let include = true;
        
        if (params.min_beds && data.bedrooms < params.min_beds) include = false;
        if (params.max_beds && data.bedrooms > params.max_beds) include = false;
        if (params.min_baths && data.bathrooms < params.min_baths) include = false;
        if (params.max_baths && data.bathrooms > params.max_baths) include = false;
        if (params.min_sqft && data.square_feet && data.square_feet < params.min_sqft) include = false;
        if (params.max_sqft && data.square_feet && data.square_feet > params.max_sqft) include = false;
        
        if (params.property_type && params.property_type.length > 1 && !params.property_type.includes(data.property_type)) {
          include = false;
        }
        
        if (include) {
          properties.push({
            id: doc.id,
            mls_number: data.mls_number,
            address: data.address || {},
            price: data.price || 0,
            bedrooms: data.bedrooms || 0,
            bathrooms: data.bathrooms || 0,
            square_feet: data.square_feet,
            lot_size: data.lot_size,
            year_built: data.year_built,
            property_type: data.property_type || 'house',
            listing_status: data.listing_status || 'active',
            listing_date: data.listing_date,
            days_on_market: data.days_on_market || this.calculateDaysOnMarket(data.listing_date),
            description: data.description,
            features: data.features || [],
            images: data.images || [],
            virtual_tour_url: data.virtual_tour_url,
            agent: data.agent,
            schools: data.schools,
            hoa_fee: data.hoa_fee,
            property_tax: data.property_tax,
            coordinates: data.coordinates
          });
        }
      });
      
      // If no properties found, create sample data
      if (properties.length === 0 && params.city) {
        await this.createSampleProperties(params.city, params.state || 'TX');
        // Retry the search
        return await this.searchFirestoreProperties(params);
      }
      
      return {
        properties,
        total_count: properties.length,
        page: params.page || 1,
        per_page: limit,
        search_params: params
      };
      
    } catch (error) {
      console.error('Error searching Firestore properties:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to search properties'
      );
    }
  }
  
  /**
   * Calculate days on market from listing date
   */
  private calculateDaysOnMarket(listingDate?: string): number {
    if (!listingDate) return 0;
    const listed = new Date(listingDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - listed.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Create sample properties in Firestore
   */
  private async createSampleProperties(city: string, state: string): Promise<void> {
    const db = admin.firestore();
    const batch = db.batch();
    
    const sampleProperties = [
      {
        mls_number: `MLS${Date.now()}1`,
        address: {
          street: '123 Sunset Boulevard',
          city,
          state,
          zip: '78701'
        },
        price: 750000,
        bedrooms: 4,
        bathrooms: 3,
        square_feet: 3200,
        property_type: 'house',
        listing_status: 'active',
        listing_date: new Date().toISOString(),
        description: 'Stunning modern home with open floor plan',
        features: ['Pool', 'Garage', 'Modern Kitchen', 'Smart Home'],
        images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6']
      },
      {
        mls_number: `MLS${Date.now()}2`,
        address: {
          street: '456 Oak Avenue',
          city,
          state,
          zip: '78702'
        },
        price: 525000,
        bedrooms: 3,
        bathrooms: 2.5,
        square_feet: 2400,
        property_type: 'house',
        listing_status: 'active',
        listing_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Charming family home in quiet neighborhood',
        features: ['Large Backyard', 'Updated Kitchen', 'Hardwood Floors'],
        images: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994']
      },
      {
        mls_number: `MLS${Date.now()}3`,
        address: {
          street: '789 Downtown Loft',
          city,
          state,
          zip: '78703'
        },
        price: 425000,
        bedrooms: 2,
        bathrooms: 2,
        square_feet: 1800,
        property_type: 'condo',
        listing_status: 'active',
        listing_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Modern downtown condo with city views',
        features: ['City Views', 'Gym', 'Concierge', 'Rooftop Deck'],
        images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688']
      }
    ];
    
    for (const property of sampleProperties) {
      const ref = db.collection('properties').doc();
      batch.set(ref, {
        ...property,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await batch.commit();
    console.log(`Created ${sampleProperties.length} sample properties for ${city}, ${state}`);
  }
  
  
  /**
   * Save property search for user
   */
  async savePropertySearch(userId: string, params: PropertySearchParams, results: PropertySearchResult): Promise<void> {
    await admin.firestore()
      .collection("users")
      .doc(userId)
      .collection("searches")
      .add({
        params,
        results_count: results.total_count,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    
    // Update user's last search
    await admin.firestore()
      .collection("users")
      .doc(userId)
      .update({
        lastPropertySearch: params.location || `${params.city}, ${params.state}`,
        lastSearchTimestamp: admin.firestore.FieldValue.serverTimestamp()
      });
  }
  
  /**
   * Get saved searches for user
   */
  async getSavedSearches(userId: string, limit: number = 10): Promise<any[]> {
    const snapshot = await admin.firestore()
      .collection("users")
      .doc(userId)
      .collection("searches")
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
}

export const mlsService = new RealEstateMLSService();