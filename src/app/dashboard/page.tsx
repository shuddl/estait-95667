
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db, analytics } from '../../lib/firebase/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { logEvent } from 'firebase/analytics';
import Logo from '../components/Logo';

const functions = getFunctions();

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [crmStatus, setCrmStatus] = useState({ followupboss: 'disconnected', wiseagent: 'disconnected' });
  const [loading, setLoading] = useState({ followupboss: false, wiseagent: false });
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [recentContacts, setRecentContacts] = useState([]);
  const chatContainerRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    setSessionId(uuidv4());
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        const unsubFub = onSnapshot(doc(db, 'crm_tokens', `${user.uid}_followupboss`), (doc) => {
          const isConnected = doc.exists();
          if (isConnected && crmStatus.followupboss === 'disconnected') {
            logEvent(analytics, 'crm_connected', { crm_name: 'followupboss' });
          }
          setCrmStatus(prev => ({ ...prev, followupboss: isConnected ? 'connected' : 'disconnected' }));
        });
        const unsubWa = onSnapshot(doc(db, 'crm_tokens', `${user.uid}_wiseagent`), (doc) => {
          const isConnected = doc.exists();
          if (isConnected && crmStatus.wiseagent === 'disconnected') {
            logEvent(analytics, 'crm_connected', { crm_name: 'wiseagent' });
            fetchWiseAgentContacts();
          }
          setCrmStatus(prev => ({ ...prev, wiseagent: isConnected ? 'connected' : 'disconnected' }));
        });
        return () => {
          unsubFub();
          unsubWa();
        };
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribeAuth();
  }, [router, crmStatus]);
  
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const fetchWiseAgentContacts = async () => {
    try {
        const getWiseAgentContacts = httpsCallable(functions, 'getWiseAgentContacts');
        const { data } = await getWiseAgentContacts();
        setRecentContacts(data.contacts || []);
    } catch (error) {
        console.error('Error fetching Wise Agent contacts:', error);
    }
  };

  const handleConnect = async (crmName) => {
    setLoading(prev => ({ ...prev, [crmName]: true }));
    try {
      const initiateOAuth = httpsCallable(functions, `initiate${crmName.charAt(0).toUpperCase() + crmName.slice(1)}OAuth`);
      const { data } = await initiateOAuth();
      window.location.href = data.authUrl;
    } catch (error) {
      console.error(`Error initiating ${crmName} OAuth:`, error);
      setLoading(prev => ({ ...prev, [crmName]: false }));
    }
  };

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      if (code && state) {
        const crmName = state.includes('wiseagent') ? 'wiseagent' : 'followupboss';
        setLoading(prev => ({ ...prev, [crmName]: true }));
        try {
          const handleCallback = httpsCallable(functions, `handle${crmName.charAt(0).toUpperCase() + crmName.slice(1)}OAuthCallback`);
          await handleCallback({ code });
        } catch (error) {
          console.error(`Error handling ${crmName} OAuth callback:`, error);
        } finally {
          setLoading(prev => ({ ...prev, [crmName]: false }));
          router.replace('/dashboard', undefined);
        }
      }
    };
    handleCallback();
  }, [router]);


  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessages = [...chatMessages, { sender: 'user', text: chatInput }];
    setChatMessages(newMessages);
    setChatInput('');

    try {
      const processCommand = httpsCallable(functions, 'processAgentCommand');
      const { data } = await processCommand({ commandText: chatInput, sessionId });
      setChatMessages([...newMessages, { sender: 'agent', text: data.fulfillmentText }]);
      logEvent(analytics, 'command_processed', { command_text: chatInput });
    } catch (error) {
      console.error('Error processing command:', error);
      setChatMessages([...newMessages, { sender: 'agent', text: 'Sorry, I had trouble understanding that.' }]);
    }
  };

  if (!user) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#98BF64] to-[#FFB833]">
            <p className="text-white">Loading...</p>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
        <aside className="w-72 bg-white shadow-lg flex flex-col">
            <div className="p-6">
                <Logo />
            </div>
            <nav className="flex-grow p-4">
                <ul className="space-y-2">
                    <li>
                        <a href="#" className="flex items-center p-3 text-lg font-medium rounded-lg bg-[#98BF64] text-white">Dashboard</a>
                    </li>
                    <li>
                        <a href="#" onClick={() => router.push('/properties/search-results')} className="flex items-center p-3 text-lg font-medium rounded-lg text-gray-700 hover:bg-gray-200">Property Search</a>
                    </li>
                </ul>
            </nav>
            <div className="p-4 border-t border-gray-200">
                <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-white bg-red-500 rounded-lg hover:bg-red-600 font-bold transition"
                >
                    Logout
                </button>
            </div>
        </aside>

        <main className="flex-1 flex flex-col bg-gray-50">
            <header className="bg-white shadow-sm p-6 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-800">Welcome, {user.email}!</h2>
                <p className="text-gray-500">Here&apos;s your real estate command center.</p>
            </header>
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-md border">
                        <h3 className="text-2xl font-bold text-center text-gray-800 mb-6">Connect Your CRM</h3>
                        <div className="flex flex-col space-y-4">
                            <button
                                onClick={() => handleConnect('followupboss')}
                                className={`px-4 py-3 text-white font-bold rounded-lg transition transform hover:scale-105 ${crmStatus.followupboss === 'connected' ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                disabled={crmStatus.followupboss === 'connected' || loading.followupboss}
                            >
                                {loading.followupboss ? 'Connecting...' : crmStatus.followupboss === 'connected' ? 'Connected to Follow Up Boss' : 'Connect Follow Up Boss'}
                            </button>
                            <button
                                onClick={() => handleConnect('wiseagent')}
                                className={`px-4 py-3 text-white font-bold rounded-lg transition transform hover:scale-105 ${crmStatus.wiseagent === 'connected' ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                                disabled={crmStatus.wiseagent === 'connected' || loading.wiseagent}
                            >
                                {loading.wiseagent ? 'Connecting...' : crmStatus.wiseagent === 'connected' ? 'Connected to Wise Agent' : 'Connect Wise Agent'}
                            </button>
                        </div>
                        {crmStatus.wiseagent === 'connected' && (
                            <div className="mt-6">
                                <h4 className="text-lg font-bold text-gray-800 mb-2">Recent Contacts</h4>
                                <ul className="space-y-2">
                                    {recentContacts.map(contact => (
                                        <li key={contact.id} className="text-gray-600">{contact.first_name} {contact.last_name}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-md border flex flex-col" style={{height: '65vh'}}>
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">Chat with Estait</h3>
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-100 rounded-lg mb-4" ref={chatContainerRef}>
                            {chatMessages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                                    <div className={`px-5 py-3 rounded-2xl shadow-md max-w-lg ${msg.sender === 'user' ? 'bg-[#98BF64] text-white' : 'bg-white text-gray-800'}`}>
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
                                className="flex-grow px-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-[#98BF64] transition"
                                placeholder="Type your command..."
                            />
                            <button type="submit" className="px-6 py-3 text-white bg-[#FFB833] rounded-r-lg hover:bg-[#E6A01A] transition font-bold">
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
