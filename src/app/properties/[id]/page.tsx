
import React from 'react';
import type { PropertyDetailsProps } from '@/types';

// Server component with typed params
const PropertyDetailsPlaceholder: React.FC<PropertyDetailsProps> = ({ params }) => {
  // params.id is available here for future use when implementing actual property details
  const propertyId = params.id;
  
  return (
    <div className="container mx-auto p-4 text-center">
      <p>Property details for ID {propertyId} are temporarily unavailable. We are working on it!</p>
    </div>
  );
};

export default PropertyDetailsPlaceholder;
