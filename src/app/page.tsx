"use client";
import { useRef, useState, useEffect } from "react";
import type { SpeechRecognition, SpeechRecognitionEvent } from "@/types/speech";

const SUBMIT_LIMIT = 3;

export default function Landing() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const submitsRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    submitsRef.current += 1;
    setMessages(m => [...m, `you: ${text}`, "ai: …"]);
    setInput("");

    const hasSub = document.cookie.includes("subscribed=1");
    if (!hasSub && submitsRef.current >= SUBMIT_LIMIT) {
      const r = await fetch("/api/stripe/checkout", { method: "POST" });
      const { url } = await r.json();
      window.location.href = url;
      return;
    }

    // Process with real AI
    try {
      const response = await fetch("/api/process-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: text })
      });
      
      const data = await response.json();
      setMessages(m => [...m.slice(0, -1), `ai: ${data.response || data.error || "I'm having trouble processing that request."}`]);
    } catch (error) {
      console.error("Error calling API:", error);
      setMessages(m => [...m.slice(0, -1), "ai: I'm having trouble connecting right now. Please try again."]);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl p-6">
        <header className="flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            estait
          </div>
          <div className="flex gap-2">
            <a href="/api/auth/demo-login" className="rounded-full border border-white/15 bg-white/0 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors">
              Demo Sign-in
            </a>
            <a href="#get" className="rounded-full border border-white/15 bg-white text-black px-4 py-2 text-sm hover:bg-gray-200 transition-colors">
              Get Access
            </a>
          </div>
        </header>

        <section className="mt-16 grid gap-10 md:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 px-3 py-1 text-xs mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Voice-First AI for Agents on the Go
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold leading-[1.05] bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
              Your MLS & CRM,<br />one voice command away.
            </h1>
            
            <p className="mt-6 text-lg text-white/70 leading-relaxed">
              Built for real estate agents in the field. Search properties, add leads, schedule showings - all hands-free while driving between appointments.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <a id="get" href="/app" className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 text-white font-medium hover:opacity-90 transition-opacity">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Start Voice Demo
              </a>
              <a href="#features" className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-white hover:bg-white/10 transition-colors">
                Watch Demo Video
              </a>
            </div>
            
            <div className="mt-8 flex items-center gap-6 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                3 free voice commands
              </div>
            </div>
          </div>

          <div className="relative">
            {/* iPhone Frame */}
            <div className="relative mx-auto w-[340px] md:w-[380px] aspect-[9/19.5] rounded-[42px] bg-gradient-to-br from-gray-900 to-black p-[10px] shadow-2xl">
              <div className="absolute inset-0 rounded-[42px] ring-1 ring-white/20" />
              <div className="absolute inset-0 rounded-[42px] bg-gradient-to-br from-white/12 to-white/4" />
              
              {/* Screen */}
              <div className="relative h-full w-full rounded-[32px] overflow-hidden bg-black">
                <div className="h-full flex flex-col">
                  {/* Status Bar */}
                  <div className="flex justify-between items-center px-6 py-2 text-[10px] text-white/80">
                    <span>9:41 AM</span>
                    <div className="flex gap-1">
                      <span>󰤨</span>
                      <span>󰁹</span>
                    </div>
                  </div>
                  
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto px-4 pb-2">
                    <div className="space-y-3">
                      {messages.length === 0 ? (
                        <>
                          <div className="text-center text-white/40 text-xs mt-8">
                            Try saying: "Find 3 bedroom homes under 800k in Austin"
                          </div>
                        </>
                      ) : (
                        messages.map((m, i) => (
                          <div key={i} className={`flex ${m.startsWith('you:') ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                              m.startsWith('you:') 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-800 text-white/90'
                            }`}>
                              {m.replace(/^(you|ai): /, '')}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Input Bar */}
                  <form onSubmit={onSubmit} className="p-3">
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 flex items-center gap-2 rounded-full bg-gray-900 border border-gray-800 px-3 py-2">
                        <input 
                          className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
                          value={input} 
                          onChange={e => setInput(e.target.value)} 
                          placeholder="Ask or tap mic to speak..." 
                        />
                        <button
                          type="button"
                          onClick={toggleVoice}
                          className={`p-1.5 rounded-full transition-colors ${
                            isListening 
                              ? 'bg-red-500 text-white animate-pulse' 
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </button>
                      </div>
                      <button 
                        type="submit" 
                        className="p-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            
            {/* Floating badges */}
            <div className="absolute -left-4 top-20 rounded-full bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 text-xs backdrop-blur-sm">
              🎙️ "Add lead Sarah Johnson"
            </div>
            <div className="absolute -right-4 top-40 rounded-full bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 text-xs backdrop-blur-sm">
              🏠 "Schedule showing at 2pm"
            </div>
            <div className="absolute -left-8 bottom-20 rounded-full bg-green-500/20 border border-green-500/30 px-3 py-1.5 text-xs backdrop-blur-sm">
              📍 "Properties near me"
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mt-32">
          <h2 className="text-3xl font-bold text-center mb-12">Built for agents in motion</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Voice-First Design</h3>
              <p className="text-sm text-white/60">Hands-free operation while driving. Natural language commands that just work.</p>
            </div>
            
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Live MLS Data</h3>
              <p className="text-sm text-white/60">Real-time property search across all major MLS systems. Always current.</p>
            </div>
            
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">CRM Sync</h3>
              <p className="text-sm text-white/60">Automatically log leads, notes, and activities to your existing CRM.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}