'use client';
import React, { useState, useEffect, CSSProperties } from 'react';
import Link from 'next/link';
import Logo from './components/Logo';
import Image from 'next/image';
import AuthStatus from './components/AuthStatus';

// Mock property type for landing page demo
interface MockProperty {
  id: string;
  thumbnailUrl?: string;
  address: { streetAddress: string };
  price: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: { value: number };
}

// Property card component with typed props
interface PropertyCardProps {
  property: MockProperty;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => (
  <div className="flex-shrink-0 w-80 bg-black rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 border border-gray-100/10">
    <Link href={`/properties/${property.id}`}>
      <div className="relative h-48">
        <Image
          src={property.thumbnailUrl || '/placeholder.jpg'}
          alt={`View of ${property.address.streetAddress}`}
          layout="fill"
          objectFit="cover"
        />
      </div>
      <div className="p-5">
        <h3 className="text-xl font-bold text-white truncate">{property.address.streetAddress}</h3>
        <p className="text-lg font-semibold text-white mt-1">${property.price.toLocaleString()}</p>
        <div className="mt-4 flex justify-between text-white/50 text-sm">
          <span>{property.bedrooms} beds</span>
          <span>{property.bathrooms} baths</span>
          <span>{property.livingArea.value.toLocaleString()} sqft</span>
        </div>
      </div>
    </Link>
  </div>
);

const Home: React.FC = () => {
  // Typed state variables
  const [typedText, setTypedText] = useState<string>('');
  const [properties, setProperties] = useState<MockProperty[]>([]);
  const textToType = 'Search for properties in Austin, TX';
  const typingSpeed = 100;

  // Typing animation effect
  useEffect(() => {
    const typingTimeout = setTimeout(() => {
      if (typedText.length < textToType.length) {
        setTypedText(textToType.slice(0, typedText.length + 1));
      }
    }, typingSpeed);

    return () => clearTimeout(typingTimeout);
  }, [typedText, textToType.length]);

  // Load mock properties for demo
  useEffect(() => {
    const fetchProperties = async (): Promise<void> => {
      const mockProperties: MockProperty[] = [
        { 
          id: '1', 
          thumbnailUrl: '/placeholder.jpg', 
          address: { streetAddress: '123 Main St' }, 
          price: 500000, 
          bedrooms: 3, 
          bathrooms: 2, 
          livingArea: { value: 2000 } 
        },
        { 
          id: '2', 
          thumbnailUrl: '/placeholder.jpg', 
          address: { streetAddress: '456 Oak Ave' }, 
          price: 750000, 
          bedrooms: 4, 
          bathrooms: 3, 
          livingArea: { value: 2500 } 
        },
        { 
          id: '3', 
          thumbnailUrl: '/placeholder.jpg', 
          address: { streetAddress: '789 Pine Ln' }, 
          price: 625000, 
          bedrooms: 3, 
          bathrooms: 2.5, 
          livingArea: { value: 2200 } 
        },
        { 
          id: '4', 
          thumbnailUrl: '/placeholder.jpg', 
          address: { streetAddress: '101 Maple Dr' }, 
          price: 850000, 
          bedrooms: 5, 
          bathrooms: 4, 
          livingArea: { value: 3000 } 
        },
        { 
          id: '5', 
          thumbnailUrl: '/placeholder.jpg', 
          address: { streetAddress: '212 Birch Rd' }, 
          price: 450000, 
          bedrooms: 2, 
          bathrooms: 2, 
          livingArea: { value: 1800 } 
        },
      ];
      setProperties(mockProperties);
    };

    fetchProperties();
  }, []);

  // Custom scroll style to hide scrollbar
  const scrollStyle: CSSProperties = {
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitScrollbar: { display: 'none' } as React.CSSProperties
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-8">
      {/* Header */}
      <header className="w-full">
        <div className="container mx-auto flex items-center justify-between h-20">
          <Logo />
          <nav className="flex items-center gap-4">
            <AuthStatus />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center text-center">
        <div className="w-full max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={typedText}
              readOnly
              className="w-full px-6 py-4 bg-black border border-gray-100/10 rounded-full text-center text-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition"
              placeholder="Search for properties..."
            />
            <button 
              className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black rounded-full flex items-center justify-center border border-gray-100/10 hover:bg-white/5 transition-transform transform hover:scale-110"
              aria-label="Search"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-white"
              >
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </main>

      {/* Footer with Property Carousel */}
      <footer className="w-full">
        <div className="container mx-auto">
          <div className="flex overflow-x-auto space-x-6 pb-6" style={scrollStyle}>
            {properties.map(prop => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;