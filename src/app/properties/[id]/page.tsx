'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AnimatedLogo from '../../components/AnimatedLogo';

interface PropertyDetails {
  id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number;
  lotSize: string;
  propertyType: string;
  description: string;
  features: string[];
  images: string[];
  agent: {
    name: string;
    phone: string;
    email: string;
  };
}

const PropertyDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    // Simulate fetching property data
    setTimeout(() => {
      setProperty({
        id: params.id as string,
        address: '1234 Sunset Boulevard, Austin TX 78704',
        price: 850000,
        beds: 4,
        baths: 3,
        sqft: 3200,
        yearBuilt: 2018,
        lotSize: '0.25 acres',
        propertyType: 'Single Family Home',
        description: 'This stunning modern home features an open floor plan with high ceilings, designer finishes throughout, and a gorgeous backyard oasis. Located in one of Austin\'s most desirable neighborhoods, this property offers the perfect blend of luxury and comfort.',
        features: [
          'Hardwood floors',
          'Granite countertops',
          'Stainless steel appliances',
          'Master suite with walk-in closet',
          'Home office',
          'Two-car garage',
          'Swimming pool',
          'Smart home features'
        ],
        images: [
          '/property1.jpg',
          '/property2.jpg',
          '/property3.jpg'
        ],
        agent: {
          name: 'Sarah Johnson',
          phone: '512-555-0101',
          email: 'sarah@estait.com'
        }
      });
      setLoading(false);
    }, 1000);
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background-hex)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
            borderColor: 'var(--primary-hex)',
            borderTopColor: 'transparent'
          }} />
          <p className="text-caption">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background-hex)' }}>
        <div className="text-center">
          <h1 className="text-h2 mb-4">Property not found</h1>
          <Link href="/" className="btn btn-primary">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background-hex)' }}>
      {/* Header */}
      <header className="bg-white shadow-md border-b" style={{ borderColor: 'var(--neutral-light-hex)' }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <AnimatedLogo size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="btn btn-secondary">
              Back
            </button>
            <Link href="/" className="btn btn-primary">
              New Search
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Images and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="card p-0 overflow-hidden">
              <div className="relative h-96 bg-gradient-to-br" style={{
                background: `linear-gradient(135deg, var(--primary-hex), var(--secondary-hex))`
              }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white text-lg">Property Image {activeImage + 1}</p>
                </div>
              </div>
              <div className="p-4 flex gap-2 overflow-x-auto">
                {[1, 2, 3, 4].map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImage(index)}
                    className="w-20 h-20 rounded-lg flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, var(--primary-hex), var(--secondary-hex))`,
                      outline: activeImage === index ? '2px solid var(--accent-green-hex)' : 'none',
                      outlineOffset: '2px'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Property Details */}
            <div className="card">
              <h1 className="text-h1 mb-2">${property.price.toLocaleString()}</h1>
              <p className="text-body mb-4">{property.address}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 rounded-lg" style={{ background: 'var(--neutral-light-hex)' }}>
                  <div className="text-h2" style={{ color: 'var(--primary-hex)' }}>{property.beds}</div>
                  <div className="text-caption">Bedrooms</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ background: 'var(--neutral-light-hex)' }}>
                  <div className="text-h2" style={{ color: 'var(--primary-hex)' }}>{property.baths}</div>
                  <div className="text-caption">Bathrooms</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ background: 'var(--neutral-light-hex)' }}>
                  <div className="text-h2" style={{ color: 'var(--primary-hex)' }}>{property.sqft.toLocaleString()}</div>
                  <div className="text-caption">Sq Ft</div>
                </div>
                <div className="text-center p-3 rounded-lg" style={{ background: 'var(--neutral-light-hex)' }}>
                  <div className="text-h2" style={{ color: 'var(--primary-hex)' }}>{property.yearBuilt}</div>
                  <div className="text-caption">Year Built</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h2 className="text-h2 mb-2">Description</h2>
                  <p className="text-body">{property.description}</p>
                </div>

                <div>
                  <h2 className="text-h2 mb-2">Features</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {property.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-green-hex)' }} />
                        <span className="text-body">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'var(--neutral-light-hex)' }}>
                  <div>
                    <span className="text-caption">Property Type</span>
                    <p className="text-body font-semibold">{property.propertyType}</p>
                  </div>
                  <div>
                    <span className="text-caption">Lot Size</span>
                    <p className="text-body font-semibold">{property.lotSize}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Contact Form */}
          <div className="space-y-6">
            {/* Agent Card */}
            <div className="card">
              <h3 className="text-h2 mb-4">Contact Agent</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{
                    background: 'var(--primary-hex)'
                  }}>
                    {property.agent.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{property.agent.name}</p>
                    <p className="text-caption">Listing Agent</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <a href={`tel:${property.agent.phone}`} className="btn btn-primary w-full">
                    Call {property.agent.phone}
                  </a>
                  <a href={`mailto:${property.agent.email}`} className="btn btn-secondary w-full">
                    Email Agent
                  </a>
                </div>
              </div>
            </div>

            {/* Schedule Tour */}
            <div className="card">
              <h3 className="font-semibold mb-3">Schedule a Tour</h3>
              <form className="space-y-3">
                <input
                  type="text"
                  className="input"
                  placeholder="Your name"
                />
                <input
                  type="email"
                  className="input"
                  placeholder="Your email"
                />
                <input
                  type="tel"
                  className="input"
                  placeholder="Phone number"
                />
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Message (optional)"
                />
                <button type="submit" className="btn btn-accent w-full">
                  Request Tour
                </button>
              </form>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="btn btn-secondary w-full">
                  Save Property
                </button>
                <button className="btn btn-secondary w-full">
                  Share Listing
                </button>
                <button className="btn btn-secondary w-full">
                  Print Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailsPage;