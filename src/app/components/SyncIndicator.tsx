'use client';
import React, { useState, useEffect } from 'react';
import styles from './SyncIndicator.module.css';

interface SyncStatus {
  crm: 'idle' | 'syncing' | 'success' | 'error';
  mls: 'idle' | 'syncing' | 'success' | 'error';
  ai: 'idle' | 'processing' | 'ready' | 'error';
  lastSync?: Date;
  pendingChanges?: number;
}

interface SyncIndicatorProps {
  status: SyncStatus;
  onManualSync?: () => void;
  compact?: boolean;
}

export default function SyncIndicator({ status, onManualSync, compact = false }: SyncIndicatorProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  // Generate particles for syncing animation
  useEffect(() => {
    if (status.crm === 'syncing' || status.mls === 'syncing') {
      const interval = setInterval(() => {
        setParticles(prev => [
          ...prev.slice(-10),
          {
            id: Date.now(),
            x: Math.random() * 100,
            y: Math.random() * 100
          }
        ]);
      }, 200);
      
      setPulseAnimation(true);
      return () => {
        clearInterval(interval);
        setPulseAnimation(false);
      };
    }
  }, [status.crm, status.mls]);

  // Show success celebration
  useEffect(() => {
    if (status.crm === 'success' || status.mls === 'success') {
      setShowSuccess(true);
      triggerHaptic('success');
      
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [status.crm, status.mls]);

  const triggerHaptic = (type: 'light' | 'success' | 'error') => {
    if (!('vibrate' in navigator)) return;
    
    const patterns = {
      light: [5],
      success: [10, 20, 10],
      error: [30, 10, 30]
    };
    
    navigator.vibrate(patterns[type]);
  };

  const getConnectionHealth = () => {
    const errorCount = [status.crm, status.mls, status.ai].filter(s => s === 'error').length;
    const syncingCount = [status.crm, status.mls].filter(s => s === 'syncing').length;
    
    if (errorCount > 0) return { level: 'poor', color: '#ef4444', percentage: 30 };
    if (syncingCount > 0) return { level: 'syncing', color: '#f59e0b', percentage: 70 };
    if (status.ai === 'processing') return { level: 'processing', color: '#667eea', percentage: 85 };
    return { level: 'excellent', color: '#10b981', percentage: 100 };
  };

  const health = getConnectionHealth();

  if (compact) {
    return (
      <div className={styles.compactIndicator}>
        <div 
          className={`${styles.healthDot} ${pulseAnimation ? styles.pulse : ''}`}
          style={{ backgroundColor: health.color }}
        />
        <span className={styles.healthLabel}>{health.level}</span>
        {status.pendingChanges && status.pendingChanges > 0 && (
          <span className={styles.pendingBadge}>{status.pendingChanges}</span>
        )}
      </div>
    );
  }

  return (
    <div className={styles.syncIndicator}>
      {/* Particle effects */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className={styles.particle}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${Math.random()}s`
          }}
        />
      ))}
      
      {/* Success celebration */}
      {showSuccess && (
        <div className={styles.successOverlay}>
          <div className={styles.successIcon}>✨</div>
          <div className={styles.successText}>Sync Complete!</div>
          <div className={styles.confetti}>
            {[...Array(10)].map((_, i) => (
              <span key={i} className={styles.confettiPiece} />
            ))}
          </div>
        </div>
      )}
      
      {/* Connection health meter */}
      <div className={styles.healthMeter}>
        <div className={styles.healthHeader}>
          <span className={styles.healthTitle}>Connection Health</span>
          <span className={styles.healthPercentage}>{health.percentage}%</span>
        </div>
        <div className={styles.healthBar}>
          <div 
            className={styles.healthFill}
            style={{ 
              width: `${health.percentage}%`,
              backgroundColor: health.color
            }}
          >
            <div className={styles.healthGlow} />
          </div>
        </div>
      </div>
      
      {/* Service status grid */}
      <div className={styles.services}>
        <div className={styles.serviceCard}>
          <div className={styles.serviceHeader}>
            <span className={styles.serviceName}>CRM</span>
            <StatusIcon status={status.crm} />
          </div>
          <div className={styles.serviceStatus}>
            {status.crm === 'syncing' ? (
              <span className={styles.syncing}>Syncing contacts...</span>
            ) : status.crm === 'success' ? (
              <span className={styles.success}>Up to date</span>
            ) : status.crm === 'error' ? (
              <span className={styles.error}>Connection failed</span>
            ) : (
              <span className={styles.idle}>Ready</span>
            )}
          </div>
        </div>
        
        <div className={styles.serviceCard}>
          <div className={styles.serviceHeader}>
            <span className={styles.serviceName}>MLS</span>
            <StatusIcon status={status.mls} />
          </div>
          <div className={styles.serviceStatus}>
            {status.mls === 'syncing' ? (
              <span className={styles.syncing}>Updating listings...</span>
            ) : status.mls === 'success' ? (
              <span className={styles.success}>Live data</span>
            ) : status.mls === 'error' ? (
              <span className={styles.error}>Offline</span>
            ) : (
              <span className={styles.idle}>Connected</span>
            )}
          </div>
        </div>
        
        <div className={styles.serviceCard}>
          <div className={styles.serviceHeader}>
            <span className={styles.serviceName}>AI Assistant</span>
            <StatusIcon status={status.ai} />
          </div>
          <div className={styles.serviceStatus}>
            {status.ai === 'processing' ? (
              <span className={styles.processing}>Processing...</span>
            ) : status.ai === 'ready' ? (
              <span className={styles.ready}>Ready to help</span>
            ) : status.ai === 'error' ? (
              <span className={styles.error}>Unavailable</span>
            ) : (
              <span className={styles.idle}>Standing by</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Last sync info */}
      {status.lastSync && (
        <div className={styles.lastSync}>
          Last synced: {formatTime(status.lastSync)}
        </div>
      )}
      
      {/* Pending changes indicator */}
      {status.pendingChanges && status.pendingChanges > 0 && (
        <div className={styles.pendingChanges}>
          <div className={styles.pendingIcon}>
            <span className={styles.pendingCount}>{status.pendingChanges}</span>
          </div>
          <span className={styles.pendingText}>
            {status.pendingChanges === 1 ? 'change' : 'changes'} pending
          </span>
          {onManualSync && (
            <button className={styles.syncButton} onClick={onManualSync}>
              Sync Now
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'syncing':
    case 'processing':
      return (
        <div className={styles.statusIcon}>
          <div className={styles.spinner} />
        </div>
      );
    case 'success':
    case 'ready':
      return (
        <div className={`${styles.statusIcon} ${styles.success}`}>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      );
    case 'error':
      return (
        <div className={`${styles.statusIcon} ${styles.error}`}>
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      );
    default:
      return (
        <div className={`${styles.statusIcon} ${styles.idle}`}>
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" fill="currentColor"/>
          </svg>
        </div>
      );
  }
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}