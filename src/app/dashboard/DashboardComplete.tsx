'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, functions } from '@/lib/firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import type { FirebaseFunctions, SubscriptionStatus } from '@/types/api';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  properties?: Property[];
  action?: string;
  error?: boolean;
}

interface Property {
  id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  type: string;
  imageUrl?: string;
  yearBuilt?: number;
  status?: 'active' | 'pending' | 'sold';
}

interface Reminder {
  id: string;
  message: string;
  scheduledFor: Date;
  contactName?: string;
  type: string;
}

const commandSuggestions = [
  "Search: 3BR homes under 1M in Austin",
  "Add lead: John Smith, 512-555-0100",
  "Schedule showing tomorrow 2pm",
  "Show recent contacts",
  "Find waterfront properties",
  "Update contact Sarah Chen"
];

export default function DashboardComplete() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPanel, setShowPanel] = useState<'none' | 'settings' | 'subscription' | 'connections'>('none');
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [crmConnections, setCrmConnections] = useState({
    wise_agent: false,
    follow_up_boss: false,
    real_geeks: false
  });
  
  const [firebaseFunctions, setFirebaseFunctions] = useState<Partial<FirebaseFunctions>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (functions) {
      setFirebaseFunctions({
        processAgentCommand: httpsCallable(functions, 'processAgentCommand'),
        getSubscriptionStatus: httpsCallable(functions, 'getSubscriptionStatus'),
        getUpcomingReminders: httpsCallable(functions, 'getUpcomingReminders'),
        createCheckoutSession: httpsCallable(functions, 'createCheckoutSession'),
        wiseAgentAuth: httpsCallable(functions, 'wiseAgentAuth'),
        followUpBossAuth: httpsCallable(functions, 'followUpBossAuth'),
        realGeeksAuth: httpsCallable(functions, 'realGeeksAuth')
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        
        // Load subscription status
        if (firebaseFunctions.getSubscriptionStatus) {
          try {
            const subStatus = await firebaseFunctions.getSubscriptionStatus();
            setSubscriptionStatus(subStatus.data);
          } catch (error) {
            console.error('Error loading subscription:', error);
          }
        }
        
        // Load reminders
        if (firebaseFunctions.getUpcomingReminders) {
          try {
            const remindersData = await firebaseFunctions.getUpcomingReminders({ limit: 5 });
            const data = remindersData.data as { reminders: Reminder[] };
            setReminders(data.reminders || []);
          } catch (error) {
            console.error('Error loading reminders:', error);
          }
        }
        
        // System welcome message
        if (messages.length === 0) {
          setMessages([{
            id: '1',
            type: 'system',
            content: 'SYSTEM INITIALIZED. NEURAL INTERFACE ACTIVE. READY FOR COMMANDS.',
            timestamp: new Date()
          }]);
        }
      }
    });
    
    return () => unsubscribe();
  }, [router, firebaseFunctions, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    const userInput = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (!firebaseFunctions.processAgentCommand) {
        throw new Error('Neural interface not connected');
      }
      
      const result = await firebaseFunctions.processAgentCommand({
        commandText: userInput,
        sessionId: 'default'
      });

      const response = result.data as { responseToUser?: string; data?: any };
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.responseToUser || 'COMMAND PROCESSED.',
        timestamp: new Date(),
        properties: response.data?.properties,
        action: response.data?.action
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Neural processing error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'NEURAL PROCESSING ERROR. RECALIBRATING...',
        timestamp: new Date(),
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const connectCRM = async (crmType: 'wise_agent' | 'follow_up_boss' | 'real_geeks') => {
    try {
      let authFunction;
      switch (crmType) {
        case 'wise_agent':
          authFunction = firebaseFunctions.wiseAgentAuth;
          break;
        case 'follow_up_boss':
          authFunction = firebaseFunctions.followUpBossAuth;
          break;
        case 'real_geeks':
          authFunction = firebaseFunctions.realGeeksAuth;
          break;
      }
      
      if (!authFunction) throw new Error('Protocol not initialized');
      
      const result = await authFunction();
      const { authUrl } = result.data as { authUrl: string };
      
      window.open(authUrl, '_blank', 'width=600,height=700');
      
      setTimeout(() => {
        setCrmConnections(prev => ({ ...prev, [crmType]: true }));
      }, 5000);
    } catch (error) {
      console.error(`Connection protocol failed: ${crmType}`, error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--color-base)' }}>
      {/* Organic Background */}
      <div className="organic-bg" />
      
      {/* Top Bar */}
      <nav className="nav-nexus" style={{ position: 'relative' }}>
        <div className="nav-container">
          <div className="flex items-center gap-8">
            <span className="logo-nexus">ESTAIT</span>
            <div className="caption" style={{ opacity: 0.5 }}>
              NEURAL COMMAND INTERFACE v3.0
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              className="btn-nexus btn-nexus-icon"
              onClick={() => setShowPanel(showPanel === 'connections' ? 'none' : 'connections')}
              title="CRM Connections"
            >
              ◈
            </button>
            <button 
              className="btn-nexus btn-nexus-icon"
              onClick={() => setShowPanel(showPanel === 'subscription' ? 'none' : 'subscription')}
              title="Subscription"
            >
              ◉
            </button>
            <button 
              className="btn-nexus btn-nexus-icon"
              onClick={() => setShowPanel(showPanel === 'settings' ? 'none' : 'settings')}
              title="Settings"
            >
              ⚙
            </button>
            <button 
              className="btn-nexus btn-nexus-text"
              onClick={handleLogout}
            >
              DISCONNECT
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container-nexus" style={{ paddingTop: '100px', maxWidth: '1400px' }}>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - Status & Reminders */}
          <div className="lg:col-span-1">
            {/* User Status */}
            <div className="card-nexus mb-6">
              <div className="caption mb-2">AGENT STATUS</div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '14px', lineHeight: '2' }}>
                <div>ID: {user?.email?.split('@')[0]?.toUpperCase() || 'UNKNOWN'}</div>
                <div>STATUS: <span style={{ color: 'var(--color-primary)' }}>ONLINE</span></div>
                <div>SUBSCRIPTION: {subscriptionStatus?.hasActiveSubscription ? 'ACTIVE' : 'INACTIVE'}</div>
                <div>NEURAL SYNC: 98.7%</div>
              </div>
            </div>

            {/* Reminders */}
            <div className="card-nexus mb-6">
              <div className="caption mb-4">UPCOMING PROTOCOLS</div>
              {reminders.length > 0 ? (
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '13px' }}>
                  {reminders.map((reminder, i) => (
                    <div key={reminder.id} className="mb-3" style={{ opacity: 1 - (i * 0.15) }}>
                      <div style={{ color: 'var(--color-primary)' }}>
                        → {new Date(reminder.scheduledFor).toLocaleString()}
                      </div>
                      <div style={{ opacity: 0.7, marginLeft: '16px' }}>
                        {reminder.message}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="caption" style={{ opacity: 0.5 }}>NO ACTIVE PROTOCOLS</div>
              )}
            </div>

            {/* Quick Commands */}
            <div className="card-nexus">
              <div className="caption mb-4">COMMAND TEMPLATES</div>
              <div className="space-y-2">
                {commandSuggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left p-2 rounded transition-all"
                    style={{
                      fontFamily: 'var(--font-pixel)',
                      fontSize: '12px',
                      color: 'var(--color-primary)',
                      background: 'var(--color-primary-opacity-10)',
                      border: '1px solid var(--color-primary-opacity-20)',
                      opacity: 0.8
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.background = 'var(--color-primary-opacity-20)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.8';
                      e.currentTarget.style.background = 'var(--color-primary-opacity-10)';
                    }}
                  >
                    → {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center - Main Interface */}
          <div className="lg:col-span-2">
            <div className="card-nexus" style={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
              {/* Terminal Header */}
              <div className="caption mb-4" style={{ borderBottom: '1px solid var(--color-primary-opacity-20)', paddingBottom: '12px' }}>
                NEURAL COMMAND TERMINAL | 
                USER: {user?.email?.toUpperCase() || 'ANONYMOUS'} | 
                SESSION: {new Date().toISOString().split('T')[0]}
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4" style={{ 
                background: 'var(--color-primary-opacity-10)', 
                borderRadius: 'var(--border-radius)',
                padding: '16px'
              }}>
                {messages.map((message) => (
                  <div key={message.id} className="mb-4">
                    <div style={{ 
                      fontFamily: 'var(--font-pixel)', 
                      fontSize: '14px',
                      color: message.type === 'user' 
                        ? 'var(--color-primary)' 
                        : message.type === 'system'
                        ? 'var(--color-primary-opacity-40)'
                        : 'var(--color-primary)',
                      opacity: message.error ? 0.5 : (message.type === 'user' ? 1 : 0.9)
                    }}>
                      <span style={{ opacity: 0.5 }}>
                        {message.type === 'user' ? '> USER: ' : 
                         message.type === 'system' ? '> SYSTEM: ' : 
                         '> AI: '}
                      </span>
                      {message.content}
                    </div>
                    
                    {/* Property Cards */}
                    {message.properties && message.properties.length > 0 && (
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        {message.properties.map((property) => (
                          <div key={property.id} className="card-nexus" style={{ padding: '16px' }}>
                            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: '13px' }}>
                              <div style={{ color: 'var(--color-primary)', marginBottom: '8px' }}>
                                {property.address}
                              </div>
                              <div style={{ opacity: 0.7, lineHeight: '1.6' }}>
                                PRICE: ${property.price.toLocaleString()}<br/>
                                SPECS: {property.beds}BR | {property.baths}BA | {property.sqft} SQFT<br/>
                                TYPE: {property.type.toUpperCase()}<br/>
                                STATUS: <span style={{ color: property.status === 'active' ? 'var(--color-primary)' : 'var(--color-primary-opacity-40)' }}>
                                  {property.status?.toUpperCase() || 'ACTIVE'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="caption animate-pulse">
                    PROCESSING NEURAL PATTERNS...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="flex gap-4">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter command..."
                  className="input-nexus flex-1"
                  disabled={isLoading}
                />
                <button 
                  type="submit" 
                  className="btn-nexus btn-nexus-text"
                  disabled={isLoading}
                  style={{ minWidth: '120px' }}
                >
                  {isLoading ? 'PROCESSING' : 'EXECUTE'}
                </button>
              </form>

              {/* Status Bar */}
              <div className="caption mt-4" style={{ opacity: 0.5, fontSize: '12px' }}>
                LATENCY: {'<'}20MS | 
                ENCRYPTION: AES-256 | 
                NEURAL BANDWIDTH: 98.7% | 
                {messages.length} COMMANDS PROCESSED
              </div>
            </div>
          </div>
        </div>

        {/* Panels */}
        {showPanel !== 'none' && (
          <div className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => setShowPanel('none')}>
            <div className="card-nexus" style={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: '600px',
              width: '90%',
              padding: '48px'
            }} onClick={(e) => e.stopPropagation()}>
              {showPanel === 'connections' && (
                <>
                  <div className="h2-dual mb-8">
                    <h2 className="h2-pixel" style={{ fontSize: '32px' }}>CRM PROTOCOLS</h2>
                    <span className="h2-serif" style={{ fontSize: '32px' }}>CRM Protocols</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4" style={{ 
                      background: 'var(--color-primary-opacity-10)',
                      borderRadius: 'var(--border-radius)'
                    }}>
                      <span className="caption">WISE AGENT</span>
                      {crmConnections.wise_agent ? (
                        <span style={{ color: 'var(--color-primary)' }}>CONNECTED</span>
                      ) : (
                        <button className="btn-nexus btn-nexus-text" onClick={() => connectCRM('wise_agent')}>
                          CONNECT
                        </button>
                      )}
                    </div>
                    <div className="flex justify-between items-center p-4" style={{ 
                      background: 'var(--color-primary-opacity-10)',
                      borderRadius: 'var(--border-radius)'
                    }}>
                      <span className="caption">FOLLOW UP BOSS</span>
                      {crmConnections.follow_up_boss ? (
                        <span style={{ color: 'var(--color-primary)' }}>CONNECTED</span>
                      ) : (
                        <button className="btn-nexus btn-nexus-text" onClick={() => connectCRM('follow_up_boss')}>
                          CONNECT
                        </button>
                      )}
                    </div>
                    <div className="flex justify-between items-center p-4" style={{ 
                      background: 'var(--color-primary-opacity-10)',
                      borderRadius: 'var(--border-radius)'
                    }}>
                      <span className="caption">REAL GEEKS</span>
                      {crmConnections.real_geeks ? (
                        <span style={{ color: 'var(--color-primary)' }}>CONNECTED</span>
                      ) : (
                        <button className="btn-nexus btn-nexus-text" onClick={() => connectCRM('real_geeks')}>
                          CONNECT
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {showPanel === 'subscription' && (
                <>
                  <div className="h2-dual mb-8">
                    <h2 className="h2-pixel" style={{ fontSize: '32px' }}>SUBSCRIPTION MATRIX</h2>
                    <span className="h2-serif" style={{ fontSize: '32px' }}>Subscription Matrix</span>
                  </div>
                  {subscriptionStatus?.hasActiveSubscription ? (
                    <div className="caption">
                      STATUS: ACTIVE<br/>
                      PLAN: {subscriptionStatus.subscriptionDetails?.plan?.name}<br/>
                      EXPIRES: {subscriptionStatus.subscriptionDetails?.currentPeriodEnd}
                    </div>
                  ) : (
                    <div>
                      <p className="body-text mb-6">UPGRADE TO UNLOCK FULL NEURAL CAPACITY</p>
                      <div className="flex gap-4 justify-center">
                        <button className="btn-nexus btn-nexus-text">
                          BASIC PROTOCOL
                        </button>
                        <button className="btn-nexus btn-nexus-text">
                          ADVANCED PROTOCOL
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {showPanel === 'settings' && (
                <>
                  <div className="h2-dual mb-8">
                    <h2 className="h2-pixel" style={{ fontSize: '32px' }}>SYSTEM CONFIGURATION</h2>
                    <span className="h2-serif" style={{ fontSize: '32px' }}>System Configuration</span>
                  </div>
                  <div className="caption" style={{ lineHeight: '2' }}>
                    NEURAL CALIBRATION: OPTIMAL<br/>
                    VOICE PROCESSING: ENABLED<br/>
                    ENCRYPTION: AES-256<br/>
                    DATA RETENTION: 90 DAYS<br/>
                    API VERSION: 3.0.1
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}