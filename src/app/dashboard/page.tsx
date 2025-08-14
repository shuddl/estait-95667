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
import type { ChatMessage, Contact, ProcessAgentCommandResponse } from '@/types';
import type { User } from 'firebase/auth';

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
      const functionName = `initiate${crmName.charAt(0).toUpperCase() + crmName.slice(1)}OAuth`;
      const initiateOAuth: HttpsCallable<{ userId: string }, { authUrl: string }> = 
        httpsCallable(functions, functionName);
      const { data } = await initiateOAuth({ userId: user.uid });
      window.location.href = data.authUrl;
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
      
      // Log analytics event
      if (analytics) {
        logEvent(analytics as Analytics, 'command_processed', { 
          command_text: currentChatInput 
        });
      }
    } catch (error) {
      console.error('Error processing command:', error);
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        sender: 'ai',
        text: 'Sorry, I had trouble understanding that.',
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
      <main className="flex-1 flex flex-col bg-black">
        <header className="bg-black p-6 border-b border-gray-100/10">
          <h2 className="text-3xl font-bold">Welcome, {user.email}</h2>
          <p className="text-white/50">Here&apos;s your real estate command center.</p>
        </header>
        
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* CRM Connection Panel */}
            <div className="lg:col-span-1 bg-white/5 p-6 rounded-2xl border border-gray-100/10">
              <h3 className="text-2xl font-bold text-center mb-6">Connect Your CRM</h3>
              <div className="flex flex-col space-y-4">
                <button
                  onClick={() => handleConnect('wiseagent')}
                  className={`px-4 py-3 font-bold rounded-lg transition transform hover:scale-105 ${
                    crmStatus.wiseagent === 'connected' 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                  disabled={crmStatus.wiseagent === 'connected' || loading.wiseagent}
                >
                  {loading.wiseagent 
                    ? 'Connecting...' 
                    : crmStatus.wiseagent === 'connected' 
                      ? 'Wise Agent Connected' 
                      : 'Connect Wise Agent'}
                </button>
              </div>
              
              {/* Recent Contacts */}
              {crmStatus.wiseagent === 'connected' && (
                <div className="mt-6">
                  <h4 className="text-lg font-bold mb-2">Recent Contacts</h4>
                  <ul className="space-y-2 text-white/50">
                    {recentContacts.map(contact => (
                      <li key={contact.id || `${contact.firstName}-${contact.lastName}`}>
                        {contact.firstName} {contact.lastName}
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
              <h3 className="text-2xl font-bold mb-4">Chat with Estait</h3>
              
              {/* Chat Messages */}
              <div 
                className="flex-1 overflow-y-auto p-4 bg-black rounded-lg mb-4" 
                ref={chatContainerRef}
              >
                {chatMessages.map((msg) => (
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
                ))}
              </div>
              
              {/* Chat Input Form */}
              <form onSubmit={handleChatSubmit} className="flex">
                <input
                  type="text"
                  value={chatInput}
                  onChange={handleChatInputChange}
                  className="flex-grow px-4 py-3 bg-white/5 border border-gray-100/10 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition"
                  placeholder="Type your command..."
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
        </div>
      </main>
    </div>
  );
};

export default Dashboard;