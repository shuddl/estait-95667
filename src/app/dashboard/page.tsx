
'use client';
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, db, analytics } from '../../lib/firebase/firebase';
import { getFunctions, httpsCallable, HttpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { logEvent, Analytics } from 'firebase/analytics';
import Logo from '../components/Logo';

const functions = getFunctions();

interface ChatMessage {
    sender: 'user' | 'agent';
    text: string;
}

interface CrmContact {
    id: string;
    first_name: string;
    last_name: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [crmStatus, setCrmStatus] = useState({ followupboss: 'disconnected', wiseagent: 'disconnected' });
  const [loading, setLoading] = useState({ followupboss: false, wiseagent: false });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [recentContacts, setRecentContacts] = useState<CrmContact[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setSessionId(uuidv4());
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        const unsubWa = onSnapshot(doc(db, 'crm_tokens', `${user.uid}_wiseagent`), (doc) => {
          const isConnected = doc.exists();
          if (isConnected && crmStatus.wiseagent === 'disconnected') {
            if (analytics) {
                logEvent(analytics as Analytics, 'crm_connected', { crm_name: 'wiseagent' });
            }
            fetchWiseAgentContacts();
          }
          setCrmStatus(prev => ({ ...prev, wiseagent: isConnected ? 'connected' : 'disconnected' }));
        });
        return () => unsubWa();
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribeAuth();
  }, [router, crmStatus.wiseagent]);
  
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const fetchWiseAgentContacts = async () => {
    try {
        const getWiseAgentContacts: HttpsCallable<unknown, { contacts: CrmContact[] }> = httpsCallable(functions, 'getWiseAgentContacts');
        const { data } = await getWiseAgentContacts();
        setRecentContacts(data.contacts || []);
    } catch (error) {
        console.error('Error fetching Wise Agent contacts:', error);
    }
  };

  const handleConnect = async (crmName: string) => {
    if (!user) return;
    setLoading(prev => ({ ...prev, [crmName]: true }));
    try {
      const initiateOAuth: HttpsCallable<{ userId: string }, { authUrl: string }> = httpsCallable(functions, `initiate${crmName.charAt(0).toUpperCase() + crmName.slice(1)}OAuth`);
      const { data } = await initiateOAuth({ userId: user.uid });
      window.location.href = data.authUrl;
    } catch (error) {
      console.error(`Error initiating ${crmName} OAuth:`, error);
      setLoading(prev => ({ ...prev, [crmName]: false }));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const handleChatSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;

    const newMessages: ChatMessage[] = [...chatMessages, { sender: 'user', text: chatInput }];
    setChatMessages(newMessages);
    const currentChatInput = chatInput;
    setChatInput('');

    try {
      const processAgentCommand: HttpsCallable<{ commandText: string, sessionId: string, auth: { uid: string } }, { fulfillmentText: string }> = httpsCallable(functions, 'processAgentCommand');
      const { data } = await processAgentCommand({ commandText: currentChatInput, sessionId, auth: { uid: user.uid } });
      setChatMessages([...newMessages, { sender: 'agent', text: data.fulfillmentText }]);
      if (analytics) {
          logEvent(analytics as Analytics, 'command_processed', { command_text: currentChatInput });
      }
    } catch (error) {
      console.error('Error processing command:', error);
      setChatMessages([...newMessages, { sender: 'agent', text: 'Sorry, I had trouble understanding that.' }]);
    }
  };

  if (!user) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <p className="text-white">Loading...</p>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-white">
        <aside className="w-72 bg-black flex flex-col border-r border-gray-100/10">
            <div className="p-6">
                <Logo />
            </div>
            <nav className="flex-grow p-4">
                <ul className="space-y-2">
                    <li>
                        <span className="flex items-center p-3 text-lg font-medium rounded-lg bg-white/10">Dashboard</span>
                    </li>
                    <li>
                        <span onClick={() => router.push('/properties/search-results')} className="flex items-center p-3 text-lg font-medium rounded-lg hover:bg-white/5 cursor-pointer">Property Search</span>
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

        <main className="flex-1 flex flex-col bg-black">
            <header className="bg-black p-6 border-b border-gray-100/10">
                <h2 className="text-3xl font-bold">Welcome, {user.email}</h2>
                <p className="text-white/50">Here&apos;s your real estate command center.</p>
            </header>
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    <div className="lg:col-span-1 bg-white/5 p-6 rounded-2xl border border-gray-100/10">
                        <h3 className="text-2xl font-bold text-center mb-6">Connect Your CRM</h3>
                        <div className="flex flex-col space-y-4">
                            <button
                                onClick={() => handleConnect('wiseagent')}
                                className={`px-4 py-3 font-bold rounded-lg transition transform hover:scale-105 ${crmStatus.wiseagent === 'connected' ? 'bg-gray-600 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'}`}
                                disabled={crmStatus.wiseagent === 'connected' || loading.wiseagent}
                            >
                                {loading.wiseagent ? 'Connecting...' : crmStatus.wiseagent === 'connected' ? 'Wise Agent Connected' : 'Connect Wise Agent'}
                            </button>
                        </div>
                        {crmStatus.wiseagent === 'connected' && (
                            <div className="mt-6">
                                <h4 className="text-lg font-bold mb-2">Recent Contacts</h4>
                                <ul className="space-y-2 text-white/50">
                                    {recentContacts.map(contact => (
                                        <li key={contact.id}>{contact.first_name} {contact.last_name}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-2 bg-black p-6 rounded-2xl border border-gray-100/10 flex flex-col" style={{height: '65vh'}}>
                        <h3 className="text-2xl font-bold mb-4">Chat with Estait</h3>
                        <div className="flex-1 overflow-y-auto p-4 bg-black rounded-lg mb-4" ref={chatContainerRef}>
                            {chatMessages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                                    <div className={`px-5 py-3 rounded-2xl shadow-md max-w-lg ${msg.sender === 'user' ? 'bg-white text-black' : 'bg-white/10'}`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleChatSubmit} className="flex">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                className="flex-grow px-4 py-3 bg-white/5 border border-gray-100/10 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition"
                                placeholder="Type your command..."
                            />
                            <button type="submit" className="px-6 py-3 text-white bg-black rounded-r-lg border border-gray-100/10 hover:bg-white/5 transition font-bold">
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
