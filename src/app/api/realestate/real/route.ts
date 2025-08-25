import { NextRequest, NextResponse } from "next/server";

// RealEstateAPI.com integration
const REALESTATE_API_KEY = process.env.REALESTATE_API_KEY;
const REALESTATE_API_URL = "https://api.realestateapi.com/v2/MLSSearch";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // If no API key, return demo data
    if (!REALESTATE_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "RealEstateAPI key not configured",
        properties: []
      });
    }

    // Build API payload
    const payload = {
      active: true,
      include_photos: true,
      size: Math.min(50, body.size || 10),
      city: body.city,
      state: body.state,
      zip: body.zip,
      listing_price_min: body.priceMin,
      listing_price_max: body.priceMax,
      bedrooms_min: body.beds,
      bathrooms_min: body.baths,
    };

    // Call RealEstateAPI
    const response = await fetch(REALESTATE_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": REALESTATE_API_KEY
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("RealEstateAPI error:", response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: "Failed to fetch properties" },
        { status: 502 }
      );
    }

    const data = await response.json();
    
    // Transform to our format
    const properties = (data.data || []).map((item: any) => {
      const listing = item.listing || item;
      const address = listing.address || {};
      
      return {
        id: listing.mlsNumber || listing.listingId || `MLS-${Math.random()}`,
        address: address.unparsedAddress || `${address.streetNumber} ${address.streetName}`.trim(),
        city: address.city,
        state: address.stateOrProvince,
        price: listing.listPrice,
        beds: listing.property?.bedroomsTotal,
        baths: listing.property?.bathroomsTotal || listing.property?.bathrooms?.bathroomsFull,
        sqft: listing.property?.livingArea,
        image: listing.media?.photosList?.[0]?.highRes || listing.media?.photosList?.[0]?.lowRes || "",
        description: listing.publicRemarks || "",
        mlsNumber: listing.mlsNumber,
        listingAgent: listing.listingAgent?.name,
        daysOnMarket: listing.daysOnMarket
      };
    });

    return NextResponse.json({ 
      success: true, 
      total: data.recordCount,
      properties 
    });
  } catch (error) {
    console.error("Error in RealEstateAPI proxy:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}