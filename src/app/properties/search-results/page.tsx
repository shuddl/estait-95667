'use client';
import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Link from 'next/link';
import { analytics } from '../lib/firebase/firebase';
import { logEvent } from 'firebase/analytics';

const functions = getFunctions();

const SearchResults = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('Austin, TX');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const searchProperties = httpsCallable(functions, 'searchPropertiesRealEstateAPI');
        const { data } = await searchProperties({ location: searchTerm });
        setProperties(data.properties || []);
        logEvent(analytics, 'property_searched', { search_term: searchTerm });
      } catch (err) {
        setError('Failed to fetch properties.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    // The useEffect will trigger the search
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Property Search Results</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Property Search Results</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Property Search Results</h1>
      <form onSubmit={handleSearch} className="flex mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow px-3 py-2 border rounded-l-md focus:outline-none"
          placeholder="Enter a location..."
        />
        <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-r-md">
          Search
        </button>
      </form>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map(property => (
          <Link key={property.id} href={`/properties/${property.id}`} passHref>
            <div className="bg-white rounded-lg shadow-md p-4 cursor-pointer">
              <div className="bg-gray-200 h-48 rounded-md mb-4">
                {property.thumbnailUrl && <img src={property.thumbnailUrl} alt={property.address.streetAddress} className="w-full h-full object-cover rounded-md" />}
              </div>
              <h2 className="text-xl font-bold mb-2">{property.address.streetAddress}</h2>
              <p className="text-gray-700 mb-2">${property.price.toLocaleString()}</p>
              <p className="text-gray-600">{property.bedrooms} beds, {property.bathrooms} baths, {property.livingArea.value.toLocaleString()} sqft</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
