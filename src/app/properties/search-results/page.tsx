'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AnimatedLogo from '../../components/AnimatedLogo';

interface Property {
  id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  image?: string;
  status?: string;
  daysOnMarket?: number;
  propertyType?: string;
}

interface FilterOptions {
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  propertyType?: string;
  sortBy?: 'price' | 'newest' | 'sqft';
}

const PropertyCard: React.FC<{ property: Property }> = ({ property }) => (
  <Link href={`/properties/${property.id}`}>
    <div className="card group cursor-pointer hover:shadow-lg transition-all duration-300">
      {/* Image placeholder */}
      <div className="-mx-8 -mt-8 mb-4 h-48 relative overflow-hidden" style={{
        background: `linear-gradient(135deg, var(--primary-hex), var(--secondary-hex))`
      }}>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
          <div className="text-white">
            <div className="text-xl font-bold">${property.price.toLocaleString()}</div>
            <div className="text-sm opacity-90">{property.address}</div>
          </div>
        </div>
        {property.status === 'new' && (
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1 text-xs font-bold" style={{
              background: 'var(--accent-green-hex)',
              color: 'var(--primary-hex)',
              borderRadius: 'var(--radius-xl)'
            }}>
              NEW
            </span>
          </div>
        )}
      </div>
      
      {/* Details */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4 text-sm">
          <span><strong>{property.beds}</strong> beds</span>
          <span><strong>{property.baths}</strong> baths</span>
          <span><strong>{property.sqft.toLocaleString()}</strong> sqft</span>
        </div>
      </div>
      
      {property.propertyType && (
        <div className="mt-2 text-caption">{property.propertyType}</div>
      )}
    </div>
  </Link>
);

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);
  
  const query = searchParams.get('q') || '';

  useEffect(() => {
    // Simulate fetching properties based on search
    setTimeout(() => {
      const mockProperties: Property[] = [
        { id: '1', address: '1234 Sunset Boulevard, Austin TX', price: 850000, beds: 4, baths: 3, sqft: 3200, status: 'new', propertyType: 'Single Family' },
        { id: '2', address: '567 Riverside Drive, Austin TX', price: 720000, beds: 3, baths: 2.5, sqft: 2800, propertyType: 'Single Family' },
        { id: '3', address: '890 Hilltop Avenue, Austin TX', price: 950000, beds: 5, baths: 4, sqft: 3800, propertyType: 'Single Family' },
        { id: '4', address: '321 Downtown Loft, Austin TX', price: 480000, beds: 2, baths: 2, sqft: 1800, status: 'new', propertyType: 'Condo' },
        { id: '5', address: '456 Oak Street, Austin TX', price: 625000, beds: 3, baths: 2, sqft: 2400, propertyType: 'Townhouse' },
        { id: '6', address: '789 Pine Lane, Austin TX', price: 1200000, beds: 6, baths: 5, sqft: 4500, propertyType: 'Single Family' },
        { id: '7', address: '101 Main Street #4B, Austin TX', price: 350000, beds: 1, baths: 1, sqft: 900, propertyType: 'Condo' },
        { id: '8', address: '202 Park Avenue, Austin TX', price: 575000, beds: 3, baths: 2, sqft: 2100, propertyType: 'Townhouse' },
      ];
      
      // Apply filters
      let filtered = [...mockProperties];
      if (filters.minPrice) filtered = filtered.filter(p => p.price >= filters.minPrice!);
      if (filters.maxPrice) filtered = filtered.filter(p => p.price <= filters.maxPrice!);
      if (filters.minBeds) filtered = filtered.filter(p => p.beds >= filters.minBeds!);
      if (filters.propertyType) filtered = filtered.filter(p => p.propertyType === filters.propertyType);
      
      // Apply sorting
      if (filters.sortBy === 'price') {
        filtered.sort((a, b) => a.price - b.price);
      } else if (filters.sortBy === 'sqft') {
        filtered.sort((a, b) => b.sqft - a.sqft);
      }
      
      setProperties(filtered);
      setLoading(false);
    }, 1000);
  }, [query, filters]);

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background-hex)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
            borderColor: 'var(--primary-hex)',
            borderTopColor: 'transparent'
          }} />
          <p className="text-caption">Searching properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background-hex)' }}>
      {/* Header */}
      <header className="bg-white shadow-md border-b sticky top-0 z-10" style={{ borderColor: 'var(--neutral-light-hex)' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <AnimatedLogo size="md" />
            </Link>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="btn btn-secondary"
              >
                Filters {showFilters ? '▲' : '▼'}
              </button>
              <Link href="/" className="btn btn-primary">
                New Search
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border-b" style={{ borderColor: 'var(--neutral-light-hex)' }}>
          <div className="container mx-auto px-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <select 
                className="input"
                onChange={(e) => handleFilterChange({ ...filters, sortBy: e.target.value as FilterOptions['sortBy'] })}
              >
                <option value="">Sort by</option>
                <option value="price">Price (Low to High)</option>
                <option value="newest">Newest</option>
                <option value="sqft">Square Feet</option>
              </select>
              
              <select 
                className="input"
                onChange={(e) => handleFilterChange({ ...filters, propertyType: e.target.value })}
              >
                <option value="">All Types</option>
                <option value="Single Family">Single Family</option>
                <option value="Condo">Condo</option>
                <option value="Townhouse">Townhouse</option>
              </select>
              
              <input
                type="number"
                className="input"
                placeholder="Min Price"
                onChange={(e) => handleFilterChange({ ...filters, minPrice: Number(e.target.value) })}
              />
              
              <input
                type="number"
                className="input"
                placeholder="Max Price"
                onChange={(e) => handleFilterChange({ ...filters, maxPrice: Number(e.target.value) })}
              />
              
              <select 
                className="input"
                onChange={(e) => handleFilterChange({ ...filters, minBeds: Number(e.target.value) })}
              >
                <option value="">Any Beds</option>
                <option value="1">1+ Beds</option>
                <option value="2">2+ Beds</option>
                <option value="3">3+ Beds</option>
                <option value="4">4+ Beds</option>
              </select>
              
              <button 
                onClick={() => {
                  setFilters({});
                  handleFilterChange({});
                }}
                className="btn btn-text"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-h1">Search Results</h1>
          <p className="text-caption mt-2">
            {query && `Showing properties for "${query}" - `}
            {properties.length} properties found
          </p>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-h2 mb-4">No properties found</h2>
            <p className="text-body mb-6">Try adjusting your filters or search criteria</p>
            <Link href="/" className="btn btn-primary">
              Start New Search
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {properties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchResults() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background-hex)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
            borderColor: 'var(--primary-hex)',
            borderTopColor: 'transparent'
          }} />
          <p className="text-caption">Loading...</p>
        </div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}