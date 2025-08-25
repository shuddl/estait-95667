"use client";
import React, { useEffect, useRef, useState } from "react";

const DEBUG = typeof process !== "undefined" ? process.env.NODE_ENV !== "production" : true;
const log = (...a: any[]) => { if (DEBUG) console.log("[estait]", ...a); };

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { 
      setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch { 
      setReduce(false);
    }
  }, []);
  return reduce;
}

function DeviceFrame({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [rot, setRot] = useState({ rx: 0, ry: 0 });
  
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    setRot({ 
      rx: Math.max(-10, Math.min(10, (y / (r.height / 2)) * -10)), 
      ry: Math.max(-12, Math.min(12, (x / (r.width / 2)) * 12)) 
    });
  }
  
  const style: React.CSSProperties = reduce
    ? { willChange: "auto" }
    : { 
        transform: `perspective(1000px) rotateX(${rot.rx}deg) rotateY(${rot.ry}deg)`, 
        transition: "transform 120ms ease-out", 
        willChange: "transform" 
      };
      
  return (
    <div onMouseMove={onMove} onMouseLeave={() => setRot({ rx: 0, ry: 0 })} style={style} 
         className="relative mx-auto w-[360px] md:w-[420px] aspect-[9/19.5] rounded-[42px] p-[10px]">
      <div className="absolute inset-0 rounded-[42px] ring-1 ring-white/20" />
      <div className="absolute inset-0 rounded-[42px] bg-gradient-to-br from-white/12 to-white/4" />
      <div className="absolute inset-[2px] rounded-[40px] bg-gradient-to-br from-black/70 to-black/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_40px_140px_-40px_rgba(0,0,0,0.8)]" />
      <div className="relative h-full w-full rounded-[36px] overflow-hidden">{children}</div>
    </div>
  );
}

type Msg = { id: string; role: "user" | "ai"; content: string };
const uid = () => (typeof crypto !== "undefined" && (crypto as any).randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export default function AppPage() {
  const reduce = useReducedMotion();
  const [messages, setMessages] = useState<Msg[]>([]);
  const messagesRef = useRef<Msg[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [propsData, setPropsData] = useState<any[]>([]);
  const isStreamingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
        
        // Auto-submit on final result
        if (event.results[event.results.length - 1].isFinal) {
          setIsListening(false);
          // Trigger submit
          setTimeout(() => {
            const form = document.getElementById('chat-form') as HTMLFormElement;
            if (form) form.requestSubmit();
          }, 100);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Load initial properties
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/realestate", { 
          method: "POST", 
          headers: { "content-type": "application/json" }, 
          body: JSON.stringify({ 
            city: "Austin", 
            priceMax: 800000, 
            beds: 3, 
            size: 8 
          }) 
        });
        const j = await r.json();
        setPropsData(j?.properties ?? []);
      } catch (error) {
        log("Error loading properties:", error);
      }
    })();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    if (isStreamingRef.current && abortRef.current) { 
      abortRef.current.abort(); 
      isStreamingRef.current = false; 
    }

    const userMsg: Msg = { id: uid(), role: "user", content: text };
    const aiMsg: Msg = { id: uid(), role: "ai", content: "" };
    const next = [...messagesRef.current, userMsg, aiMsg];
    setMessages(next); 
    messagesRef.current = next; 
    setInput("");

    // Parse voice commands for properties
    const maybeBeds = text.match(/(\d+)\s*(?:bd|bed|beds|bedroom|bedrooms)/i);
    const maybeMax = text.match(/under\s*\$?\s*([0-9.,]+)\s*([mk])?/i);
    const maybeCity = text.match(/in\s+([a-zA-Z .-]+)/i);
    
    if (maybeBeds || maybeMax || maybeCity) {
      const priceMax = maybeMax 
        ? (parseFloat(maybeMax[1].replace(/,/g, "")) * 
           (maybeMax[2]?.toLowerCase() === "m" ? 1_000_000 : 
            maybeMax[2]?.toLowerCase() === "k" ? 1_000 : 1)) 
        : undefined;
        
      try {
        const r = await fetch("/api/realestate", { 
          method: "POST", 
          headers: { "content-type": "application/json" }, 
          body: JSON.stringify({ 
            city: maybeCity?.[1]?.trim(), 
            priceMax, 
            beds: maybeBeds ? parseInt(maybeBeds[1], 10) : undefined, 
            size: 12 
          }) 
        });
        const j = await r.json();
        setPropsData(j?.properties ?? []);
      } catch (error) {
        log("Error searching properties:", error);
      }
    }

    // Stream AI response
    try {
      const ac = new AbortController();
      abortRef.current = ac; 
      isStreamingRef.current = true;
      
      const res = await fetch("/app/api/chat", { 
        method: "POST", 
        headers: { "content-type": "application/json" }, 
        body: JSON.stringify({ messages: messagesRef.current }), 
        signal: ac.signal 
      });
      
      if (!res.ok || !res.body) { 
        isStreamingRef.current = false; 
        return; 
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setMessages(prev => { 
          const copy = [...prev]; 
          const last = copy[copy.length - 1]; 
          copy[copy.length - 1] = { ...last, content: last.content + chunk }; 
          return copy; 
        });
      }
    } catch (error) {
      if ((error as any)?.name !== 'AbortError') {
        log("Stream error:", error);
      }
    } finally {
      isStreamingRef.current = false;
    }
  }

  return (
    <main className="min-h-[100svh] w-full bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            estait
          </div>
          <div className="flex gap-2">
            <a className="rounded-full border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors" 
               href="/settings">
              Settings
            </a>
            <a className="rounded-full border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors" 
               href="/api/auth/logout">
              Sign Out
            </a>
          </div>
        </div>

        <DeviceFrame>
          <div className={`flex h-full w-full flex-col bg-black ${reduce ? "backdrop-blur-md" : "backdrop-blur-xl"}`} aria-live="polite">
            {/* Status Bar */}
            <div className="flex justify-between items-center px-5 py-2 text-[11px] text-white/80 border-b border-white/5">
              <span>9:41</span>
              <span className="font-medium">estait</span>
              <div className="flex gap-1">
                <span>􀙇</span>
                <span>􀛨</span>
                <span>􀋂</span>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex flex-col gap-2">
                {messages.map(m => (
                  <div key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] ${
                    m.role === "user" 
                      ? "self-end bg-blue-600 text-white" 
                      : "self-start bg-gray-800 text-white/90"
                  }`}>
                    {m.content || (m.role === "ai" ? "..." : "")}
                  </div>
                ))}
                {messages.length === 0 && (
                  <>
                    <div className="text-center text-white/40 text-xs mt-8 mb-4">
                      Tap the mic and say a command
                    </div>
                    <div className="space-y-2">
                      <div className="self-start max-w-[85%] rounded-2xl border border-white/10 bg-gray-900 px-3 py-2 text-[13px] text-white/70">
                        Try: "Find 3 bedroom homes under 800k in Austin"
                      </div>
                      <div className="self-start max-w-[85%] rounded-2xl border border-white/10 bg-gray-900 px-3 py-2 text-[13px] text-white/70">
                        Or: "Add lead Sarah Johnson, 512-555-0123"
                      </div>
                    </div>
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Property Cards */}
            {propsData.length > 0 && (
              <div className="px-3 pb-2">
                <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                  {propsData.slice(0, 5).map((node: any, i: number) => {
                    const l = node?.listing ?? node;
                    const a = l?.address ?? {};
                    const mls = l?.mlsNumber ?? l?.listing?.mlsNumber ?? l?.listingId ?? `MLS-${i}`;
                    const price = l?.listPrice ?? l?.listing?.listPrice;
                    const img = l?.media?.photosList?.[0]?.lowRes || l?.media?.photosList?.[0]?.highRes || "";
                    const beds = l?.property?.bedroomsTotal;
                    const baths = l?.property?.bathroomsTotal || l?.property?.bathrooms?.bathroomsFull;
                    const sqft = l?.property?.livingArea;

                    return (
                      <div key={mls} className="snap-start w-[240px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gray-900">
                        <div className="h-28 w-full overflow-hidden bg-gray-800">
                          {img && (
                            <img 
                              src={img} 
                              onError={(e) => { 
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }} 
                              className="h-full w-full object-cover" 
                              alt={a?.unparsedAddress || "Property"} 
                            />
                          )}
                        </div>
                        <div className="p-3 text-white/90">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">
                              ${price ? Number(price).toLocaleString() : "—"}
                            </div>
                            <div className="text-[10px] text-white/60">#{mls}</div>
                          </div>
                          <div className="mt-1 line-clamp-1 text-xs text-white/75">
                            {a?.unparsedAddress || [a?.streetNumber, a?.streetName].filter(Boolean).join(" ")}
                          </div>
                          <div className="text-[10px] text-white/60">
                            {[a?.city, a?.stateOrProvince].filter(Boolean).join(", ")}
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-white/80">
                            <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center">
                              {beds ?? "—"} bd
                            </div>
                            <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center">
                              {baths ?? "—"} ba
                            </div>
                            <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-center">
                              {sqft ? Number(sqft).toLocaleString() : "—"} sf
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input */}
            <form id="chat-form" onSubmit={handleSubmit} className="p-3 border-t border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-full bg-gray-900 border border-gray-800 px-3 py-2">
                  <input 
                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                    value={input} 
                    onChange={e => setInput(e.target.value)}
                    placeholder={isListening ? "Listening..." : "Say a command or type..."} 
                    disabled={isListening}
                  />
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={`p-2 rounded-full transition-all ${
                      isListening 
                        ? 'bg-red-500 text-white animate-pulse scale-110' 
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                </div>
                <button 
                  className="p-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50" 
                  type="submit"
                  disabled={!input.trim() && !isListening}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </DeviceFrame>

        {/* Voice command hints */}
        <div className="mt-8 grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs text-white/60 mb-1">Property Search</div>
            <div className="text-sm text-white/90">"3 beds under 900k in downtown"</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs text-white/60 mb-1">Lead Management</div>
            <div className="text-sm text-white/90">"Add lead John Doe 555-0123"</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs text-white/60 mb-1">Scheduling</div>
            <div className="text-sm text-white/90">"Schedule showing tomorrow 2pm"</div>
          </div>
        </div>
      </div>
    </main>
  );
}