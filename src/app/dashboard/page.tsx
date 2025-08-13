'use client';
import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db, analytics } from '../lib/firebase/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { logEvent } from 'firebase/analytics';

const functions = getFunctions();

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [crmStatus, setCrmStatus] = useState({ followupboss: 'disconnected', wiseagent: 'disconnected' });
  const [loading, setLoading] = useState({ followupboss: false, wiseagent: false });
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sessionId, setSessionId] = useState('');
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

  const handleConnect = async (crmName) => {
    setLoading(prev => ({ ...prev, [crmName]: true }));
    try {
      const initiateOAuth = httpsCallable(functions, `initiate${crmName.charAt(0).toUpperCase() + crmName.slice(1)}OAuth`);
      const { data } = await initiateOAuth();
      window.location.href = data.authUrl;
    } catch (error) => {
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ backgroundColor: '#F5EBCD' }}>
      <div className="w-full max-w-4xl p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold" style={{ color: '#98BF64' }}>Welcome, {user.email}!</h2>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-white rounded-md"
            style={{ backgroundColor: '#FFB833' }}
          >
            Logout
          </button>
        </div>
        <div className="pt-8">
          <h3 className="text-xl font-bold text-center" style={{ color: '#98BF64' }}>Connect Your CRM</h3>
          <div className="flex justify-center space-x-4 pt-4">
            <button
              onClick={() => handleConnect('followupboss')}
              className={`px-4 py-2 text-white rounded-md ${crmStatus.followupboss === 'connected' ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              disabled={crmStatus.followupboss === 'connected' || loading.followupboss}
            >
              {loading.followupboss ? 'Connecting...' : crmStatus.followupboss === 'connected' ? 'Connected to Follow Up Boss' : 'Connect Follow Up Boss'}
            </button>
            <button
              onClick={() => handleConnect('wiseagent')}
              className={`px-4 py-2 text-white rounded-md ${crmStatus.wiseagent === 'connected' ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
              disabled={crmStatus.wiseagent === 'connected' || loading.wiseagent}
            >
              {loading.wiseagent ? 'Connecting...' : crmStatus.wiseagent === 'connected' ? 'Connected to Wise Agent' : 'Connect Wise Agent'}
            </button>
          </div>
        </div>
        <div className="pt-8 text-center">
          <button
            onClick={() => router.push('/properties/search-results')}
            className="px-4 py-2 text-white rounded-md"
            style={{ backgroundColor: '#98BF64' }}
          >
            Property Search
          </button>
        </div>
        <div className="pt-8">
          <div className="w-full h-96 border rounded-lg p-4 overflow-y-auto" ref={chatContainerRef}>
            {chatMessages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                <div className={`px-4 py-2 rounded-lg ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleChatSubmit} className="flex mt-4">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-grow px-3 py-2 border rounded-l-md focus:outline-none"
              placeholder="Type your command..."
            />
            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-r-md">
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
