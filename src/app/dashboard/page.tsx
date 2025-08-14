'use client';
import React, { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db, analytics } from '../../lib/firebase/firebase';
import { getFunctions, httpsCallable, HttpsCallable } from 'firebase/functions';
import { doc, onSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { logEvent, Analytics } from 'firebase/analytics';
import Logo from '../components/Logo';
import type { ChatMessage, Contact, ProcessAgentCommandResponse, Property } from '@/types';
import type { User } from 'firebase/auth';
import Image from 'next/image';

const functions = getFunctions();

// CRM status interface
interface CRMStatus {
  followupboss: 'connected' | 'disconnected';
  wiseagent: 'connected' | 'disconnected';
}

// Loading state interface
interface LoadingState {
  followupboss: boolean;
  wiseagent: boolean;
}

// Market Analytics Component
const MarketAnalytics: React.FC<{ location?: string }> = ({ location = 'Austin, TX' }) => {
  return (
    <div className="bg-white/5 p-6 rounded-2xl border border-gray-100/10 mb-6">
      <h3 className="text-xl font-bold mb-4">Market Analytics - {location}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-green-400">↑ 5.2%</p>
          <p className="text-sm text-white/70">Median Price YoY</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-400">28</p>
          <p className="text-sm text-white/70">Days on Market</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-yellow-400">1.2</p>
          <p className="text-sm text-white/70">Months Supply</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-purple-400">98.5%</p>
          <p className="text-sm text-white/70">Sale/List Ratio</p>
        </div>
      </div>
      <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
        <p className="text-sm text-blue-400">
          💡 Seller&apos;s Market: Low inventory and quick sales indicate strong demand
        </p>
      </div>
    </div>
  );
};

// Property Card with Insights
const PropertyCardWithInsights: React.FC<{ property: Property }> = ({ property }) => {
  return (
    <div className="flex-shrink-0 w-80 bg-black rounded-2xl shadow-lg overflow-hidden border border-gray-100/10">
      <div className="relative h-48">
        <Image
          src={property.images?.[0] || '/placeholder.jpg'}
          alt={property.address}
          fill
          style={{ objectFit: 'cover' }}
          sizes="320px"
        />
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
          HOT DEAL
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-white truncate">{property.address}</h3>
        <p className="text-xl font-semibold text-green-400">${property.price.toLocaleString()}</p>
        <div className="mt-2 flex justify-between text-white/70 text-sm">
          <span>{property.bedrooms} beds</span>
          <span>{property.bathrooms} baths</span>
          <span>{property.squareFeet.toLocaleString()} sqft</span>
        </div>
        <div className="mt-3 p-2 bg-blue-500/10 rounded text-xs text-blue-400">
          📊 Priced 8% below market avg • High demand area
        </div>
      </div>
    </div>
  );
};

// AI Suggestion Buttons Component
const AISuggestions: React.FC<{ 
  suggestions?: string[];
  onSuggestionClick: (suggestion: string) => void;
}> = ({ suggestions = [], onSuggestionClick }) => {
  if (suggestions.length === 0) return null;
  
  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm text-white/70">Suggested next actions:</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-all transform hover:scale-105"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  // Typed state variables
  const [user, setUser] = useState<User | null>(null);
  const [crmStatus, setCrmStatus] = useState<CRMStatus>({ 
    followupboss: 'disconnected', 
    wiseagent: 'disconnected' 
  });
  const [loading, setLoading] = useState<LoadingState>({ 
    followupboss: false, 
    wiseagent: false 
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [suggestedProperties, setSuggestedProperties] = useState<Property[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Auth state listener
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser as User);
        
        // Firestore listener for Wise Agent connection status
        const unsubWa = onSnapshot(
          doc(db, 'crm_tokens', `${firebaseUser.uid}_wiseagent`), 
          (docSnapshot: DocumentSnapshot) => {
            const isConnected = docSnapshot.exists();
            
            // Log analytics event when CRM is connected
            if (isConnected && crmStatus.wiseagent === 'disconnected') {
              if (analytics) {
                logEvent(analytics as Analytics, 'crm_connected', { 
                  crm_name: 'wiseagent' 
                });
              }
              fetchWiseAgentContacts();
            }
            
            setCrmStatus(prev => ({ 
              ...prev, 
              wiseagent: isConnected ? 'connected' : 'disconnected' 
            }));
          }
        );
        
        return () => unsubWa();
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribeAuth();
  }, [router, crmStatus.wiseagent]);
  
  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Fetch contacts from Wise Agent
  const fetchWiseAgentContacts = async (): Promise<void> => {
    try {
      const getWiseAgentContacts: HttpsCallable<unknown, { contacts: Contact[] }> = 
        httpsCallable(functions, 'getWiseAgentContacts');
      const { data } = await getWiseAgentContacts();
      setRecentContacts(data.contacts || []);
    } catch (error) {
      console.error('Error fetching Wise Agent contacts:', error);
    }
  };

  // Handle CRM OAuth connection
  const handleConnect = async (crmName: keyof CRMStatus): Promise<void> => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, [crmName]: true }));
    
    try {
      const functionName = crmName === 'wiseagent' ? 'wiseAgentAuth' : 
                          `initiate${crmName.charAt(0).toUpperCase() + crmName.slice(1)}OAuth`;
      const initiateOAuth: HttpsCallable<unknown, { authUrl: string }> = 
        httpsCallable(functions, functionName);
      const { data } = await initiateOAuth({});
      
      // Open OAuth URL in new window
      const authWindow = window.open(data.authUrl, '_blank', 'width=600,height=600');
      
      // Poll for window closure
      const pollTimer = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollTimer);
          setLoading(prev => ({ ...prev, [crmName]: false }));
          // Refresh CRM status
          window.location.reload();
        }
      }, 1000);
    } catch (error) {
      console.error(`Error initiating ${crmName} OAuth:`, error);
      setLoading(prev => ({ ...prev, [crmName]: false }));
    }
  };

  // Handle user logout
  const handleLogout = async (): Promise<void> => {
    await signOut(auth);
    router.push('/login');
  };
  
  // Handle AI suggestion click
  const handleSuggestionClick = (suggestion: string): void => {
    setChatInput(suggestion);
  };
  
  // Handle chat form submission
  const handleChatSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: uuidv4(),
      sender: 'user',
      text: chatInput,
      timestamp: Date.now()
    };
    
    const newMessages: ChatMessage[] = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    
    const currentChatInput = chatInput;
    setChatInput('');
    setAiSuggestions([]); // Clear previous suggestions

    try {
      // Call the process agent command function
      const processAgentCommand: HttpsCallable<
        { commandText: string; sessionId: string }, 
        ProcessAgentCommandResponse
      > = httpsCallable(functions, 'processAgentCommand');
      
      const sessionId = uuidv4(); // Generate session ID for this conversation
      const { data } = await processAgentCommand({ 
        commandText: currentChatInput,
        sessionId
      });
      
      // Add AI response to chat
      const aiMessage: ChatMessage = {
        id: uuidv4(),
        sender: 'ai',
        text: data.responseToUser,
        timestamp: Date.now(),
        data: data.data
      };
      
      setChatMessages([...newMessages, aiMessage]);
      
      // Update AI suggestions if provided
      if (data.data?.suggestedFollowUps) {
        setAiSuggestions(data.data.suggestedFollowUps);
      }
      
      // If property search results, update suggested properties
      if (data.data?.properties) {
        setSuggestedProperties(data.data.properties);
      }
      
      // Log analytics event
      if (analytics) {
        logEvent(analytics as Analytics, 'command_processed', { 
          command_text: currentChatInput,
          confidence: data.data?.confidence
        });
      }
    } catch (error) {
      console.error('Error processing command:', error);
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        sender: 'ai',
        text: 'Sorry, I had trouble processing that request. Please ensure your CRM is connected and try again.',
        timestamp: Date.now()
      };
      
      setChatMessages([...newMessages, errorMessage]);
    }
  };

  // Handle chat input change
  const handleChatInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setChatInput(e.target.value);
  };

  // Loading state
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="w-72 bg-black flex flex-col border-r border-gray-100/10">
        <div className="p-6">
          <Logo />
        </div>
        <nav className="flex-grow p-4">
          <ul className="space-y-2">
            <li>
              <span className="flex items-center p-3 text-lg font-medium rounded-lg bg-white/10">
                Dashboard
              </span>
            </li>
            <li>
              <span 
                onClick={() => router.push('/properties/search-results')} 
                className="flex items-center p-3 text-lg font-medium rounded-lg hover:bg-white/5 cursor-pointer"
              >
                Property Search
              </span>
            </li>
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-100/10">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-white/10 rounded-lg hover:bg-white/20 font-bold transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-black overflow-hidden">
        <header className="bg-black p-6 border-b border-gray-100/10">
          <h2 className="text-3xl font-bold">Welcome, {user.email}</h2>
          <p className="text-white/50">Your AI-powered real estate command center</p>
        </header>
        
        <div className="flex-1 p-8 overflow-y-auto">
          {/* Market Analytics */}
          <MarketAnalytics location="Austin, TX" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* CRM Connection Panel */}
            <div className="lg:col-span-1 bg-white/5 p-6 rounded-2xl border border-gray-100/10">
              <h3 className="text-2xl font-bold text-center mb-6">CRM Integration</h3>
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => handleConnect('wiseagent')}
                  className={`px-4 py-3 font-bold rounded-lg transition transform hover:scale-105 ${
                    crmStatus.wiseagent === 'connected' 
                      ? 'bg-green-600 cursor-not-allowed' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                  disabled={crmStatus.wiseagent === 'connected' || loading.wiseagent}
                >
                  {loading.wiseagent 
                    ? 'Connecting...' 
                    : crmStatus.wiseagent === 'connected' 
                      ? '✓ Wise Agent Connected' 
                      : 'Connect Wise Agent'}
                </button>
                
                {/* Show warning if not connected */}
                {crmStatus.wiseagent !== 'connected' && (
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <p className="text-sm text-yellow-400">
                      ⚠️ Connect your CRM to enable contact management
                    </p>
                  </div>
                )}
              </div>
              
              {/* Recent Contacts */}
              {crmStatus.wiseagent === 'connected' && recentContacts.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-bold mb-2">Recent Contacts</h4>
                  <ul className="space-y-2 text-white/70">
                    {recentContacts.slice(0, 5).map(contact => (
                      <li key={contact.id || `${contact.firstName}-${contact.lastName}`} 
                          className="p-2 bg-white/5 rounded hover:bg-white/10 cursor-pointer">
                        {contact.firstName} {contact.lastName}
                        {contact.phone && <span className="text-xs ml-2 text-white/50">{contact.phone}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {/* Chat Interface */}
            <div 
              className="lg:col-span-2 bg-black p-6 rounded-2xl border border-gray-100/10 flex flex-col" 
              style={{ height: '65vh' }}
            >
              <h3 className="text-2xl font-bold mb-4">AI Assistant</h3>
              
              {/* Chat Messages */}
              <div 
                className="flex-1 overflow-y-auto p-4 bg-black rounded-lg mb-4" 
                ref={chatContainerRef}
              >
                {chatMessages.length === 0 ? (
                  <div className="text-center text-white/50 py-8">
                    <p>👋 Hi! I&apos;m your AI assistant. Try asking me to:</p>
                    <ul className="mt-4 space-y-2 text-sm">
                      <li>&quot;Search for 3 bedroom homes in Austin under 500k&quot;</li>
                      <li>&quot;Add John Smith 555-1234 as a new lead&quot;</li>
                      <li>&quot;Create a follow-up task for tomorrow&quot;</li>
                    </ul>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${
                        msg.sender === 'user' ? 'justify-end' : 'justify-start'
                      } mb-4`}
                    >
                      <div 
                        className={`px-5 py-3 rounded-2xl shadow-md max-w-lg ${
                          msg.sender === 'user' 
                            ? 'bg-white text-black' 
                            : 'bg-white/10'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* AI Suggestions */}
              <AISuggestions 
                suggestions={aiSuggestions}
                onSuggestionClick={handleSuggestionClick}
              />
              
              {/* Chat Input Form */}
              <form onSubmit={handleChatSubmit} className="flex mt-4">
                <input
                  type="text"
                  value={chatInput}
                  onChange={handleChatInputChange}
                  className="flex-grow px-4 py-3 bg-white/5 border border-gray-100/10 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition"
                  placeholder="Ask me anything..."
                />
                <button 
                  type="submit" 
                  className="px-6 py-3 text-white bg-black rounded-r-lg border border-gray-100/10 hover:bg-white/5 transition font-bold"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
          
          {/* Suggested Properties Carousel */}
          {suggestedProperties.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-4">Suggested Properties</h3>
              <div className="flex overflow-x-auto space-x-4 pb-4" style={{ scrollbarWidth: 'none' }}>
                {suggestedProperties.map(property => (
                  <PropertyCardWithInsights key={property.id} property={property} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;