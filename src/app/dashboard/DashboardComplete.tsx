'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, functions } from '@/lib/firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import AnimatedLogo from '../components/AnimatedLogo';
import type { FirebaseFunctions, SubscriptionStatus } from '@/types/api';
import styles from './dashboard.module.css';

interface Message {
  id: string;
  type: 'user' | 'assistant';
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
  garage?: number;
  lot?: string;
  description?: string;
  features?: string[];
  status?: 'active' | 'pending' | 'sold';
}

interface Reminder {
  id: string;
  message: string;
  scheduledFor: Date;
  contactName?: string;
  type: string;
}

const suggestedQueries = [
  "Show me 4-bedroom homes under $900k in Austin",
  "Add a new client named John Smith",
  "What are my upcoming reminders?",
  "Schedule a showing for tomorrow at 2pm",
  "Search for waterfront properties",
  "Show recent contacts"
];

export default function DashboardComplete() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [crmConnections, setCrmConnections] = useState({
    wise_agent: false,
    follow_up_boss: false,
    real_geeks: false
  });
  
  // Lazy initialize Firebase functions
  const [firebaseFunctions, setFirebaseFunctions] = useState<Partial<FirebaseFunctions>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Initialize Firebase functions when component mounts
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
        
        // Welcome message
        if (messages.length === 0) {
          setMessages([{
            id: '1',
            type: 'assistant',
            content: `Welcome back! I'm your AI real estate assistant. I can help you search properties, manage clients, schedule showings, and track your deals. What would you like to do today?`,
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
      // Call the real Firebase function
      if (!firebaseFunctions.processAgentCommand) {
        throw new Error('Firebase functions not initialized');
      }
      
      const result = await firebaseFunctions.processAgentCommand({
        commandText: userInput,
        sessionId: 'default'
      });

      const response = result.data as { responseToUser?: string; data?: { properties?: Property[]; action?: string; suggestedFollowUps?: string[] } };
      
      // Handle property search results
      if (response.data?.properties && response.data.properties.length > 0) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.responseToUser || `I found ${response.data.properties.length} properties matching your criteria.`,
          timestamp: new Date(),
          properties: response.data.properties,
          action: response.data?.action
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response.responseToUser || 'I processed your request.',
          timestamp: new Date(),
          action: response.data?.action
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

      // Handle suggested follow-ups
      if (response.data?.suggestedFollowUps && response.data.suggestedFollowUps.length > 0) {
        // Could add these as quick action buttons
        console.log('Suggested follow-ups:', response.data.suggestedFollowUps);
      }
    } catch (error) {
      console.error('Error processing command:', error);
      
      let errorContent = 'I encountered an error processing your request.';
      
      // Provide more specific error messages
      if (error.code === 'unauthenticated') {
        errorContent = 'Please sign in to continue.';
      } else if (error.code === 'failed-precondition') {
        errorContent = error.message || 'Please connect your CRM first to use this feature.';
      } else if (error.message?.includes('subscription')) {
        errorContent = 'Please subscribe to access this feature.';
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorContent,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as React.FormEvent<HTMLFormElement>);
    }
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
      
      if (!authFunction) {
        throw new Error('Auth function not initialized');
      }
      
      const result = await authFunction();
      const { authUrl } = result.data as { authUrl: string };
      
      // Open OAuth window
      window.open(authUrl, '_blank', 'width=600,height=700');
      
      // Update connection status (would need polling or websocket for real-time update)
      setTimeout(() => {
        setCrmConnections(prev => ({ ...prev, [crmType]: true }));
      }, 5000);
    } catch (error) {
      console.error(`Error connecting ${crmType}:`, error);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      if (!firebaseFunctions.createCheckoutSession) {
        throw new Error('Checkout function not initialized');
      }
      
      const result = await firebaseFunctions.createCheckoutSession({
        planId,
        successUrl: window.location.origin + '/dashboard?subscription=success',
        cancelUrl: window.location.origin + '/dashboard?subscription=cancelled'
      });
      
      const { url } = result.data as { url: string };
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  const PropertyCard = ({ property }: { property: Property }) => (
    <div className={styles.propertyCard}>
      <div className={styles.propertyImage}>
        <img src={property.imageUrl} alt={property.address} />
        <div className={`${styles.propertyStatus} ${
          property.status === 'active' ? styles.statusActive :
          property.status === 'pending' ? styles.statusPending :
          styles.statusSold
        }`}>
          {property.status === 'active' ? 'Active' : 
           property.status === 'pending' ? 'Pending' : 'Sold'}
        </div>
      </div>
      <div className={styles.propertyDetails}>
        <h3 className={styles.propertyAddress}>{property.address}</h3>
        <div className={styles.propertyPrice}>${property.price.toLocaleString()}</div>
        <div className={styles.propertyFeatures}>
          <span>{property.beds} beds</span>
          <span>{property.baths} baths</span>
          <span>{property.sqft.toLocaleString()} sqft</span>
        </div>
        <p className={styles.propertyDescription}>{property.description}</p>
        {property.features && (
          <div className={styles.propertyTags}>
            {property.features.map((feature, idx) => (
              <span key={idx} className={styles.propertyTag}>{feature}</span>
            ))}
          </div>
        )}
        <div className={styles.propertyActions}>
          <button className={styles.btnCardPrimary}>View Details</button>
          <button className={styles.btnCardSecondary}>Schedule Showing</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.chatContainer}>
      <header className={styles.chatHeader}>
        <div className={styles.headerContent}>
          <AnimatedLogo size="sm" />
          <div className={styles.userMenu}>
            {subscriptionStatus?.hasActiveSubscription ? (
              <span className="subscription-badge active">
                {subscriptionStatus.subscriptionDetails?.plan?.name || 'Active'}
              </span>
            ) : (
              <button onClick={() => setShowSubscription(true)} className="subscription-badge inactive">
                Subscribe
              </button>
            )}
            <button onClick={() => setShowSettings(true)} className="settings-btn">
              Settings
            </button>
            {user && <span className={styles.userEmail}>{user.email}</span>}
            <button onClick={() => auth.signOut()} className={styles.logoutButton}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className={styles.chatMain}>
        {/* Reminders Sidebar */}
        {reminders.length > 0 && (
          <div className="reminders-sidebar">
            <h3>Upcoming Reminders</h3>
            {reminders.map((reminder) => (
              <div key={reminder.id} className="reminder-item">
                <p>{reminder.message}</p>
                <span className="reminder-time">
                  {new Date(reminder.scheduledFor).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.messagesContainer}>
          {messages.map((message) => (
            <div key={message.id} className={styles.message}>
              <div className={`${styles.messageAvatar} ${
                message.type === 'user' ? styles.userAvatar : styles.assistantAvatar
              }`}>
                {message.type === 'user' ? 'U' : 'AI'}
              </div>
              <div className={styles.messageContent}>
                <div className={`${styles.messageBubble} ${
                  message.type === 'user' ? styles.userBubble : ''
                } ${message.error ? 'error-message' : ''}`}>
                  {message.content}
                </div>
                {message.properties && (
                  <div className={styles.propertiesGrid}>
                    {message.properties.map((property) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className={styles.message}>
              <div className={`${styles.messageAvatar} ${styles.assistantAvatar}`}>AI</div>
              <div className={styles.messageContent}>
                <div className={styles.loadingDots}>
                  <div className={styles.loadingDot}></div>
                  <div className={styles.loadingDot}></div>
                  <div className={styles.loadingDot}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div className={styles.suggestionsContainer}>
            {suggestedQueries.map((suggestion, idx) => (
              <button
                key={idx}
                className={styles.suggestionChip}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about real estate..."
              className={styles.chatInput}
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            className={styles.sendButton}
            disabled={!input.trim() || isLoading}
          >
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Settings</h2>
            
            <div className="settings-section">
              <h3>CRM Connections</h3>
              <div className="crm-list">
                <div className="crm-item">
                  <span>Wise Agent</span>
                  {crmConnections.wise_agent ? (
                    <span className="status connected">Connected</span>
                  ) : (
                    <button onClick={() => connectCRM('wise_agent')}>Connect</button>
                  )}
                </div>
                <div className="crm-item">
                  <span>Follow Up Boss</span>
                  {crmConnections.follow_up_boss ? (
                    <span className="status connected">Connected</span>
                  ) : (
                    <button onClick={() => connectCRM('follow_up_boss')}>Connect</button>
                  )}
                </div>
                <div className="crm-item">
                  <span>Real Geeks</span>
                  {crmConnections.real_geeks ? (
                    <span className="status connected">Connected</span>
                  ) : (
                    <button onClick={() => connectCRM('real_geeks')}>Connect</button>
                  )}
                </div>
              </div>
            </div>

            <div className="settings-section">
              <h3>Notification Preferences</h3>
              <label>
                <input type="checkbox" defaultChecked /> Email notifications
              </label>
              <label>
                <input type="checkbox" /> SMS notifications
              </label>
              <label>
                <input type="checkbox" defaultChecked /> In-app notifications
              </label>
            </div>

            <button onClick={() => setShowSettings(false)} className="close-btn">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {showSubscription && (
        <div className="modal-overlay" onClick={() => setShowSubscription(false)}>
          <div className="modal-content subscription-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Choose Your Plan</h2>
            
            <div className="plans-grid">
              <div className="plan-card">
                <h3>Basic</h3>
                <div className="price">$99/mo</div>
                <ul>
                  <li>100 contacts</li>
                  <li>500 AI requests/month</li>
                  <li>Basic CRM integration</li>
                  <li>Email support</li>
                </ul>
                <button onClick={() => handleSubscribe('basic')}>
                  Get Started
                </button>
              </div>
              
              <div className="plan-card featured">
                <div className="badge">Most Popular</div>
                <h3>Professional</h3>
                <div className="price">$199/mo</div>
                <ul>
                  <li>Unlimited contacts</li>
                  <li>2000 AI requests/month</li>
                  <li>All CRM integrations</li>
                  <li>Smart reminders</li>
                  <li>Priority support</li>
                </ul>
                <button onClick={() => handleSubscribe('professional')}>
                  Get Started
                </button>
              </div>
              
              <div className="plan-card">
                <h3>Enterprise</h3>
                <div className="price">$499/mo</div>
                <ul>
                  <li>Everything in Pro</li>
                  <li>Unlimited AI requests</li>
                  <li>Custom integrations</li>
                  <li>Dedicated manager</li>
                  <li>API access</li>
                </ul>
                <button onClick={() => handleSubscribe('enterprise')}>
                  Contact Sales
                </button>
              </div>
            </div>

            <button onClick={() => setShowSubscription(false)} className="close-btn">
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .subscription-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .subscription-badge.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }
        
        .subscription-badge.inactive {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
        }
        
        .settings-btn {
          padding: 8px 16px;
          background: transparent;
          color: #667eea;
          border: 1px solid #667eea;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .reminders-sidebar {
          position: fixed;
          right: 20px;
          top: 100px;
          width: 300px;
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .reminder-item {
          padding: 12px;
          margin-bottom: 12px;
          background: rgba(102, 126, 234, 0.05);
          border-radius: 8px;
          border-left: 3px solid #667eea;
        }
        
        .reminder-time {
          font-size: 12px;
          color: #999;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          border-radius: 24px;
          padding: 32px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .subscription-modal {
          max-width: 900px;
        }
        
        .settings-section {
          margin-bottom: 24px;
        }
        
        .settings-section h3 {
          margin-bottom: 16px;
          color: #333;
        }
        
        .crm-list {
          space-y: 12px;
        }
        
        .crm-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f5f5f5;
          border-radius: 8px;
          margin-bottom: 8px;
        }
        
        .status.connected {
          color: #10b981;
          font-weight: 600;
        }
        
        .plans-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin: 32px 0;
        }
        
        .plan-card {
          padding: 24px;
          border: 2px solid #e5e5e5;
          border-radius: 16px;
          text-align: center;
          position: relative;
        }
        
        .plan-card.featured {
          border-color: #667eea;
          transform: scale(1.05);
        }
        
        .badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #667eea;
          color: white;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 12px;
        }
        
        .price {
          font-size: 36px;
          font-weight: 700;
          color: #667eea;
          margin: 16px 0;
        }
        
        .plan-card ul {
          list-style: none;
          padding: 0;
          margin: 24px 0;
        }
        
        .plan-card li {
          padding: 8px 0;
          color: #666;
        }
        
        .plan-card button {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .plan-card button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .close-btn {
          margin-top: 24px;
          padding: 12px 24px;
          background: #f5f5f5;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        
        .error-message {
          background: #fee2e2 !important;
          color: #dc2626 !important;
        }
        
        label {
          display: block;
          padding: 8px 0;
          cursor: pointer;
        }
        
        label input {
          margin-right: 8px;
        }
        
        @media (max-width: 768px) {
          .plans-grid {
            grid-template-columns: 1fr;
          }
          
          .plan-card.featured {
            transform: none;
          }
          
          .reminders-sidebar {
            position: static;
            width: 100%;
            margin-bottom: 20px;
          }
        }
      `}</style>
    </div>
  );
}