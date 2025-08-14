'use client';
import React, { useState, useEffect, useRef, CSSProperties, FormEvent, ChangeEvent } from 'react';
import { getFunctions, httpsCallable, HttpsCallable } from 'firebase/functions';
import Link from 'next/link';
import { analytics } from '../../../lib/firebase/firebase';
import { logEvent, Analytics } from 'firebase/analytics';
import Image from 'next/image';
import type { Property } from '@/types';

const functions = getFunctions();

// Property card component with typed props
interface PropertyCardProps {
  property: Property;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => (
  <div className="flex-shrink-0 w-80 bg-black rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 border border-gray-100/10">
    <Link href={`/properties/${property.id}`}>
        <div className="relative h-48">
          <Image
            src={property.images?.[0] || '/placeholder.jpg'}
            alt={`View of ${property.address}`}
            layout="fill"
            objectFit="cover"
          />
        </div>
        <div className="p-5">
          <h3 className="text-xl font-bold text-white truncate">{property.address}</h3>
          <p className="text-lg font-semibold text-white mt-1">${property.price.toLocaleString()}</p>
          <div className="mt-4 flex justify-between text-white/50 text-sm">
            <span>{property.bedrooms} beds</span>
            <span>{property.bathrooms} baths</span>
            <span>{property.squareFeet.toLocaleString()} sqft</span>
          </div>
        </div>
    </Link>
  </div>
);

const SearchResults: React.FC = () => {
  // Typed state variables
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('Austin, TX');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProperties = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      
      try {
        // Typed Firebase function call
        const searchProperties: HttpsCallable<
          { location: string }, 
          { properties: Property[] }
        > = httpsCallable(functions, 'searchPropertiesRealEstateAPI');
        
        const { data } = await searchProperties({ location: searchTerm });
        setProperties(data.properties || []);
        
        // Log analytics event
        if (analytics) {
          logEvent(analytics as Analytics, 'property_searched', { 
            search_term: searchTerm 
          });
        }
      } catch (err) {
        // Type-safe error handling
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to fetch properties. Please try again.');
        }
        console.error('Error fetching properties:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [searchTerm]);

  // Handle search form submission
  const handleSearch = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    // The useEffect will trigger the search automatically
  };

  // Handle input change
  const handleSearchTermChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
  };

  // Custom scroll style to hide scrollbar
  const scrollStyle: CSSProperties = {
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitScrollbar: { display: 'none' } as React.CSSProperties
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-4 sm:p-8">
        <h1 className="text-4xl font-extrabold mb-2">Property Search</h1>
        <p className="text-white/50 mb-8">Discover properties that match your criteria.</p>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex mb-10 max-w-lg">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchTermChange}
            className="flex-grow px-4 py-3 bg-white/5 border border-gray-100/10 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition"
            placeholder="Enter a city, state, or zip code..."
          />
          <button 
            type="submit" 
            className="px-6 py-3 text-white bg-black rounded-r-lg border border-gray-100/10 hover:bg-white/5 transition font-bold"
          >
            Search
          </button>
        </form>

        {/* Results Section */}
        {loading ? (
          <div className="text-center py-20">
            <p className="text-lg text-white/80">Loading Properties...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-red-900/50 text-red-400 p-6 rounded-lg">
            <p className="text-lg font-bold">An Error Occurred</p>
            <p>{error}</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white/80 mb-6">
              Results for &quot;{searchTerm}&quot;
            </h2>
            <div 
              ref={scrollContainerRef}
              className="flex overflow-x-auto space-x-6 pb-6"
              style={scrollStyle}
            >
              {properties.length > 0 ? (
                properties.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))
              ) : (
                <p className="text-white/50">No properties found for your search.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchResults;