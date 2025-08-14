
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Link from 'next/link';
import { analytics } from '../../../lib/firebase/firebase';
import { logEvent } from 'firebase/analytics';
import Image from 'next/image';

const functions = getFunctions();

const PropertyCard = ({ property }) => (
    <div className="flex-shrink-0 w-80 bg-white rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300">
        <Link href={`/properties/${property.id}`} passHref legacyBehavior>
            <div className="cursor-pointer">
                <div className="relative h-48">
                    <Image
                        src={property.thumbnailUrl || '/placeholder.jpg'}
                        alt={`View of ${property.address.streetAddress}`}
                        layout="fill"
                        objectFit="cover"
                    />
                </div>
                <div className="p-5">
                    <h3 className="text-xl font-bold text-gray-800 truncate">{property.address.streetAddress}</h3>
                    <p className="text-lg font-semibold text-[#98BF64] mt-1">${property.price.toLocaleString()}</p>
                    <div className="mt-4 flex justify-between text-gray-600 text-sm">
                        <span>{property.bedrooms} beds</span>
                        <span>{property.bathrooms} baths</span>
                        <span>{property.livingArea.value.toLocaleString()} sqft</span>
                    </div>
                </div>
            </div>
        </Link>
    </div>
);

const SearchResults = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('Austin, TX');
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchProperties = httpsCallable(functions, 'searchPropertiesRealEstateAPI');
        const { data } = await searchProperties({ location: searchTerm });
        setProperties(data.properties || []);
        logEvent(analytics, 'property_searched', { search_term: searchTerm });
      } catch (err) {
        setError('Failed to fetch properties. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    // The useEffect will trigger the search
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4 sm:p-8">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-2">Property Search</h1>
        <p className="text-gray-500 mb-8">Discover properties that match your criteria.</p>
        
        <form onSubmit={handleSearch} className="flex mb-10 max-w-lg">
            <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow px-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-[#98BF64] transition"
            placeholder="Enter a city, state, or zip code..."
            />
            <button type="submit" className="px-6 py-3 text-white bg-[#FFB833] rounded-r-lg hover:bg-[#E6A01A] transition font-bold">
                Search
            </button>
        </form>

        {loading ? (
            <div className="text-center py-20">
                <p className="text-lg text-gray-600">Loading Properties...</p>
            </div>
        ) : error ? (
            <div className="text-center py-20 bg-red-100 text-red-700 p-6 rounded-lg">
                <p className="text-lg font-bold">An Error Occurred</p>
                <p>{error}</p>
            </div>
        ) : (
            <>
                <h2 className="text-2xl font-bold text-gray-700 mb-6">Results for &quot;{searchTerm}&quot;</h2>
                <div 
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto space-x-6 pb-6"
                    style={{ scrollbarWidth: 'none', '-ms-overflow-style': 'none' }}
                >
                    {properties.map(property => (
                        <PropertyCard key={property.id} property={property} />
                    ))}
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
