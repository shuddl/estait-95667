import { NextRequest, NextResponse } from "next/server";

// Real properties will be fetched from RealEstateAPI
const DEMO_PROPERTIES = process.env.NODE_ENV === "development" ? [
  {
    id: "1",
    address: "123 Main St",
    city: "San Francisco",
    state: "CA",
    price: 850000,
    beds: 3,
    baths: 2,
    sqft: 1800,
    image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=300&fit=crop",
    description: "Beautiful modern home in quiet neighborhood"
  },
  {
    id: "2",
    address: "456 Oak Ave",
    city: "San Francisco",
    state: "CA",
    price: 1200000,
    beds: 4,
    baths: 3,
    sqft: 2400,
    image: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=400&h=300&fit=crop",
    description: "Stunning Victorian with original details"
  },
  {
    id: "3",
    address: "789 Pine Street",
    city: "San Francisco",
    state: "CA",
    price: 695000,
    beds: 2,
    baths: 2,
    sqft: 1200,
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop",
    description: "Contemporary condo with city views"
  },
  {
    id: "4",
    address: "321 Elm Court",
    city: "San Francisco",
    state: "CA",
    price: 1500000,
    beds: 5,
    baths: 4,
    sqft: 3200,
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop",
    description: "Luxury estate with pool and gardens"
  }
] : [];

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    // In production, this would call the actual RealEstateAPI
    // For MVP, return demo properties based on query keywords
    
    let results = [...DEMO_PROPERTIES];
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      
      // Filter based on common search terms
      if (lowerQuery.includes("cheap") || lowerQuery.includes("affordable") || lowerQuery.includes("under")) {
        results = results.filter(p => p.price < 900000);
      }
      if (lowerQuery.includes("luxury") || lowerQuery.includes("expensive") || lowerQuery.includes("over")) {
        results = results.filter(p => p.price > 1000000);
      }
      if (lowerQuery.includes("condo")) {
        results = results.filter(p => p.sqft < 1500);
      }
      if (lowerQuery.includes("house") || lowerQuery.includes("family")) {
        results = results.filter(p => p.beds >= 3);
      }
      if (lowerQuery.includes("bedroom") || lowerQuery.includes("bed")) {
        const match = lowerQuery.match(/(\d+)\s*(bedroom|bed)/);
        if (match) {
          const beds = parseInt(match[1]);
          results = results.filter(p => p.beds === beds);
        }
      }
      if (lowerQuery.includes("bath")) {
        const match = lowerQuery.match(/(\d+)\s*bath/);
        if (match) {
          const baths = parseInt(match[1]);
          results = results.filter(p => p.baths === baths);
        }
      }
    }

    return NextResponse.json({ properties: results });
  } catch (error) {
    console.error("Error in RealEstateAPI proxy:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}