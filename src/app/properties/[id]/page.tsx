
'use client';
import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Image from 'next/image';

const functions = getFunctions();

// Define the structure of the Property data we expect
interface Property {
    photos: { href: string }[];
    address: { streetAddress: string };
    price: number;
    bedrooms: number;
    bathrooms: number;
    livingArea: { value: number };
    description: string;
}

// Define the correct props for a dynamic client page in Next.js
interface PageProps {
  params: { id: string };
}

// THIS IS THE CRUCIAL FUNCTION TO UNBLOCK THE STATIC EXPORT
// It tells Next.js which pages to pre-render at build time.
export async function generateStaticParams() {
  // For now, we will return a placeholder array to allow the build to succeed.
  // In a production scenario, this function would fetch all property IDs from Firestore.
  const propertyIds = ['1', '2', '3']; // Placeholder IDs
  
  return propertyIds.map((id) => ({
    id: id,
  }));
}

const PropertyDetails = ({ params }: PageProps) => {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (!params || !params.id) return;
      try {
        const getPropertyDetails = httpsCallable(functions, 'getPropertyDetailsRealEstateAPI');
        const { data } = await getPropertyDetails({ propertyId: params.id });
        setProperty(data as Property);
      } catch (err) {
        setError('Failed to fetch property details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [params]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Loading Property...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Property not found for ID: {params.id}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="relative h-96 bg-gray-200 rounded-md mb-4">
          <Image
            src={property.photos && property.photos.length > 0 ? property.photos[0].href : '/placeholder.jpg'}
            alt={property.address.streetAddress}
            layout="fill"
            objectFit="cover"
            className="rounded-md"
          />
        </div>
        <h1 className="text-3xl font-bold mb-2">{property.address.streetAddress}</h1>
        <p className="text-gray-700 mb-2">${property.price.toLocaleString()}</p>
        <p className="text-gray-600 mb-4">{property.bedrooms} beds, {property.bathrooms} baths, {property.livingArea.value.toLocaleString()} sqft</p>
        <p className="text-gray-800">{property.description}</p>
        <div className="mt-4">
          <button className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Share to Client
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
