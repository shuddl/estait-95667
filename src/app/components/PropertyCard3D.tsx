'use client';
import React, { useState, useRef } from 'react';
import styles from './PropertyCard3D.module.css';

interface PropertyCard3DProps {
  property: {
    id: string;
    address: string;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    imageUrl?: string;
    yearBuilt?: number;
    description?: string;
    features?: string[];
    status?: 'active' | 'pending' | 'sold';
    virtualTourUrl?: string;
    monthlyPayment?: number;
    propertyTax?: number;
    hoaFees?: number;
  };
  onScheduleShowing?: () => void;
  onViewDetails?: () => void;
  onShare?: () => void;
}

export default function PropertyCard3D({ 
  property, 
  onScheduleShowing,
  onViewDetails,
  onShare 
}: PropertyCard3DProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [downPayment, setDownPayment] = useState(20);
  const [interestRate, setInterestRate] = useState(6.5);
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D parallax effect on mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isExpanded) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  // Calculate monthly payment
  const calculateMonthlyPayment = () => {
    const principal = property.price * (1 - downPayment / 100);
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = 30 * 12;
    
    const monthly = principal * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    return Math.round(monthly);
  };

  // Haptic feedback for interactions
  const triggerHaptic = (intensity: 'light' | 'medium') => {
    if ('vibrate' in navigator) {
      navigator.vibrate(intensity === 'light' ? [5] : [10]);
    }
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    triggerHaptic('medium');
  };

  const statusColors = {
    active: '#10b981',
    pending: '#f59e0b',
    sold: '#ef4444'
  };

  return (
    <div 
      ref={cardRef}
      className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
      }}
    >
      {/* Card inner with preserve-3d */}
      <div className={styles.cardInner}>
        {/* Image section with parallax layers */}
        <div className={styles.imageSection}>
          <div className={styles.imageContainer}>
            <img 
              src={property.imageUrl || '/placeholder-property.jpg'} 
              alt={property.address}
              className={styles.propertyImage}
              loading="lazy"
            />
            
            {/* Parallax overlay elements */}
            <div className={styles.parallaxOverlay}>
              <div 
                className={styles.priceTag}
                style={{ transform: `translateZ(20px)` }}
              >
                <span className={styles.priceAmount}>
                  ${property.price.toLocaleString()}
                </span>
                <span className={styles.pricePerSqft}>
                  ${Math.round(property.price / property.sqft)}/sqft
                </span>
              </div>
              
              <div 
                className={styles.statusBadge}
                style={{ 
                  backgroundColor: statusColors[property.status || 'active'],
                  transform: `translateZ(25px)`
                }}
              >
                {property.status || 'active'}
              </div>
              
              {property.virtualTourUrl && (
                <button 
                  className={styles.vrButton}
                  style={{ transform: `translateZ(30px)` }}
                  onClick={() => window.open(property.virtualTourUrl, '_blank')}
                >
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17v2a1 1 0 001 1h12a1 1 0 001-1v-2" 
                          stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  360° Tour
                </button>
              )}
            </div>
          </div>
          
          {/* Quick stats overlay */}
          <div className={styles.quickStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{property.beds}</span>
              <span className={styles.statLabel}>Beds</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{property.baths}</span>
              <span className={styles.statLabel}>Baths</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{property.sqft.toLocaleString()}</span>
              <span className={styles.statLabel}>Sqft</span>
            </div>
            {property.yearBuilt && (
              <div className={styles.stat}>
                <span className={styles.statValue}>{property.yearBuilt}</span>
                <span className={styles.statLabel}>Built</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Content section */}
        <div className={styles.content}>
          <h3 className={styles.address}>{property.address}</h3>
          
          {property.description && (
            <p className={styles.description}>{property.description}</p>
          )}
          
          {/* Features tags */}
          {property.features && property.features.length > 0 && (
            <div className={styles.features}>
              {property.features.slice(0, isExpanded ? undefined : 3).map((feature, idx) => (
                <span key={idx} className={styles.featureTag}>
                  {feature}
                </span>
              ))}
              {!isExpanded && property.features.length > 3 && (
                <span className={styles.moreFeatures}>
                  +{property.features.length - 3} more
                </span>
              )}
            </div>
          )}
          
          {/* Mortgage calculator (expanded view) */}
          {isExpanded && (
            <div className={styles.expandedContent}>
              <button 
                className={styles.calculatorToggle}
                onClick={() => setShowCalculator(!showCalculator)}
              >
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M9 7H7a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2V9a2 2 0 00-2-2zM14 7h2a2 2 0 012 2v2a2 2 0 01-2 2h-2V7zM14 17v-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2z" 
                        stroke="currentColor" strokeWidth="2"/>
                </svg>
                Mortgage Calculator
              </button>
              
              {showCalculator && (
                <div className={styles.calculator}>
                  <div className={styles.calculatorRow}>
                    <label>Down Payment</label>
                    <div className={styles.sliderContainer}>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="5"
                        value={downPayment}
                        onChange={(e) => setDownPayment(Number(e.target.value))}
                        className={styles.slider}
                      />
                      <span>{downPayment}%</span>
                    </div>
                  </div>
                  
                  <div className={styles.calculatorRow}>
                    <label>Interest Rate</label>
                    <div className={styles.sliderContainer}>
                      <input
                        type="range"
                        min="3"
                        max="8"
                        step="0.1"
                        value={interestRate}
                        onChange={(e) => setInterestRate(Number(e.target.value))}
                        className={styles.slider}
                      />
                      <span>{interestRate}%</span>
                    </div>
                  </div>
                  
                  <div className={styles.paymentResult}>
                    <span className={styles.paymentLabel}>Est. Monthly Payment</span>
                    <span className={styles.paymentAmount}>
                      ${calculateMonthlyPayment().toLocaleString()}/mo
                    </span>
                  </div>
                  
                  <div className={styles.additionalCosts}>
                    {property.propertyTax && (
                      <div>Property Tax: ${property.propertyTax}/mo</div>
                    )}
                    {property.hoaFees && (
                      <div>HOA Fees: ${property.hoaFees}/mo</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Action buttons */}
          <div className={styles.actions}>
            <button 
              className={styles.primaryAction}
              onClick={() => {
                triggerHaptic('light');
                onScheduleShowing?.();
              }}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                      stroke="currentColor" strokeWidth="2"/>
              </svg>
              Schedule Showing
            </button>
            
            <button 
              className={styles.secondaryAction}
              onClick={() => {
                triggerHaptic('light');
                onViewDetails?.();
              }}
            >
              View Details
            </button>
            
            <button 
              className={styles.iconAction}
              onClick={() => {
                triggerHaptic('light');
                onShare?.();
              }}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-4.732 2.684m4.732-2.684a3 3 0 00-4.732-2.684M8.684 10.658a3 3 0 10-4.732-2.684" 
                      stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
            
            <button 
              className={styles.expandButton}
              onClick={handleExpand}
            >
              <svg viewBox="0 0 24 24" fill="none">
                <path d={isExpanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} 
                      stroke="currentColor" strokeWidth="2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}