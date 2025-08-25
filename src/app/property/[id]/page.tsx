"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

interface Property {
  id: string;
  address: string;
  city: string;
  state: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  image: string;
  description: string;
  agent?: {
    name: string;
    phone: string;
    email: string;
    photo?: string;
    brokerage?: string;
  };
}

export default function PropertyMicrosite() {
  const params = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "I'm interested in this property. Please contact me with more information."
  });

  useEffect(() => {
    // In production, fetch from API
    // For demo, use static data
    const demoProperty: Property = {
      id: params.id as string,
      address: "123 Main Street",
      city: "San Francisco",
      state: "CA",
      price: 850000,
      beds: 3,
      baths: 2,
      sqft: 1800,
      image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&h=800&fit=crop",
      description: "Beautiful modern home in quiet neighborhood with updated kitchen, hardwood floors throughout, and a spacious backyard perfect for entertaining.",
      agent: {
        name: "Sarah Johnson",
        phone: "(415) 555-0123",
        email: "sarah@estait.com",
        photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop",
        brokerage: "Estait Realty"
      }
    };
    setProperty(demoProperty);
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In production, send to CRM
    console.log("Contact form submitted:", formData);
    alert("Thank you for your interest! The agent will contact you soon.");
    setShowContactForm(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      message: "I'm interested in this property. Please contact me with more information."
    });
  };

  if (!property) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading property...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Image */}
      <div className="relative h-[60vh] md:h-[70vh]">
        <img
          src={property.image}
          alt={property.address}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Price Badge */}
        <div className="absolute bottom-6 left-6 bg-white rounded-lg px-6 py-3 shadow-xl">
          <p className="text-3xl font-bold text-gray-900">
            ${property.price.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Property Details */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {property.address}
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              {property.city}, {property.state}
            </p>

            {/* Quick Stats */}
            <div className="flex gap-6 mb-8 pb-8 border-b">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{property.beds}</p>
                <p className="text-sm text-gray-600">Beds</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{property.baths}</p>
                <p className="text-sm text-gray-600">Baths</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {property.sqft.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">Sq Ft</p>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Property</h2>
              <p className="text-gray-700 leading-relaxed">{property.description}</p>
            </div>

            {/* Virtual Tour Button */}
            <button className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors mb-8">
              Schedule Virtual Tour
            </button>
          </div>

          {/* Agent Card */}
          <div className="md:col-span-1">
            <div className="bg-gray-50 rounded-xl p-6 sticky top-6">
              {property.agent && (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <img
                      src={property.agent.photo}
                      alt={property.agent.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-bold text-gray-900">{property.agent.name}</h3>
                      <p className="text-sm text-gray-600">{property.agent.brokerage}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <a
                      href={`tel:${property.agent.phone}`}
                      className="flex items-center gap-3 text-gray-700 hover:text-blue-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {property.agent.phone}
                    </a>
                    <a
                      href={`mailto:${property.agent.email}`}
                      className="flex items-center gap-3 text-gray-700 hover:text-blue-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {property.agent.email}
                    </a>
                  </div>
                </>
              )}

              <button
                onClick={() => setShowContactForm(true)}
                className="w-full bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                Contact Agent
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Contact Agent</h3>
              <button
                onClick={() => setShowContactForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Your Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Your Email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Your Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Message"
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="mb-2">Powered by Estait</p>
          <p className="text-sm text-gray-400">
            Smart real estate tools for modern agents
          </p>
        </div>
      </footer>
    </div>
  );
}