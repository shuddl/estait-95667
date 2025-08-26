'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AnimatedLogo from '../../components/AnimatedLogo';
import { functions } from '@/lib/firebase/firebase';
import { httpsCallable } from 'firebase/functions';

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
    const fetchProperties = async () => {
      try {
        setLoading(true);
        
        // Build search command based on query and filters
        let searchCommand = query || 'Show all available properties';
        
        // Add filter details to command
        const filterParts = [];
        if (filters.minPrice) filterParts.push(`minimum price $${filters.minPrice.toLocaleString()}`);
        if (filters.maxPrice) filterParts.push(`maximum price $${filters.maxPrice.toLocaleString()}`);
        if (filters.minBeds) filterParts.push(`at least ${filters.minBeds} bedrooms`);
        if (filters.propertyType) filterParts.push(`property type: ${filters.propertyType}`);
        
        if (filterParts.length > 0) {
          searchCommand += ` with ${filterParts.join(', ')}`;
        }
        
        if (filters.sortBy === 'price') {
          searchCommand += ' sorted by price low to high';
        } else if (filters.sortBy === 'sqft') {
          searchCommand += ' sorted by square footage';
        }
        
        // Call Firebase function to search properties
        const processAgentCommand = httpsCallable(functions, 'processAgentCommand');
        const result = await processAgentCommand({ 
          command: searchCommand,
          context: {
            source: 'property_search',
            filters: filters
          }
        });
        
        // Handle the response
        const response = result.data as any;
        
        if (response.success && response.data?.properties) {
          // Map the properties to our format
          const mappedProperties = response.data.properties.map((p: any, index: number) => ({
            id: p.id || `prop-${index}`,
            address: p.address || p.location || 'Address not available',
            price: p.price || 0,
            beds: p.bedrooms || p.beds || 0,
            baths: p.bathrooms || p.baths || 0,
            sqft: p.squareFootage || p.sqft || 0,
            status: p.status,
            propertyType: p.type || p.propertyType || 'Residential',
            daysOnMarket: p.daysOnMarket,
            image: p.imageUrl || p.image
          }));
          
          setProperties(mappedProperties);
        } else if (response.action === 'searchProperties' || response.action === 'search_properties') {
          // Handle alternate response format
          const searchData = response.data || {};
          if (Array.isArray(searchData)) {
            const mappedProperties = searchData.map((p: any, index: number) => ({
              id: p.id || `prop-${index}`,
              address: p.address || 'Address not available',
              price: p.price || 0,
              beds: p.bedrooms || p.beds || 0,
              baths: p.bathrooms || p.baths || 0,
              sqft: p.squareFootage || p.sqft || 0,
              status: p.status,
              propertyType: p.type || 'Residential'
            }));
            setProperties(mappedProperties);
          } else {
            setProperties([]);
          }
        } else {
          // No properties found
          setProperties([]);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperties();
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