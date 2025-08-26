"use client";
import { useRef, useState, useEffect } from "react";
import type { SpeechRecognition, SpeechRecognitionEvent } from "@/types/speech";

export default function Landing() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
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

    setMessages(m => [...m, `you: ${text}`, "ai: Processing..."]);
    setInput("");

    // Process with AI
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_FUNCTIONS_URL || 'https://us-central1-estait-1fdbe.cloudfunctions.net'}/processAgentCommand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandText: text })
      });
      
      const data = await response.json();
      setMessages(m => [...m.slice(0, -1), `ai: ${data.responseToUser || "I understand. Let me process that for you."}`]);
    } catch (error) {
      console.error("Error calling API:", error);
      setMessages(m => [...m.slice(0, -1), "ai: System processing. Please try again."]);
    }
  }

  return (
    <main className="min-h-screen">
      {/* Organic Background */}
      <div className="organic-bg" />
      
      {/* Navigation */}
      <nav className="nav-nexus">
        <div className="nav-container">
          <a href="/" className="logo-nexus">ESTAIT</a>
          <div className="flex gap-4">
            <a href="/login" className="btn-nexus btn-nexus-text">
              Access Portal
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-nexus">
        <div className="hero-background" />
        <div className="container-nexus">
          <div className="text-center fade-in">
            <h1 className="h1-pixel">ESTAIT</h1>
            
            <p className="body-text mt-8 fade-in-delay">
              AI-powered real estate assistant. Natural language CRM and MLS integration.
            </p>
            
            <div className="flex justify-center gap-4 mt-12">
              <a href="/login" className="btn-nexus btn-nexus-text">
                Sign In
              </a>
              <a href="/signup" className="btn-nexus btn-nexus-text">
                Get Started
              </a>
            </div>
          </div>

        </div>
      </section>

      <div className="separator" />

      {/* Value Propositions */}
      <section className="section-nexus">
        <div className="container-nexus">
          <div className="feature-grid">
            <div className="card-nexus hover-glow">
              <h3 className="h2-pixel" style={{ fontSize: '24px', marginBottom: '16px' }}>
                Voice Input
              </h3>
              <p className="body-text" style={{ fontSize: '16px', textAlign: 'left' }}>
                Speak naturally to manage leads and search properties.
              </p>
            </div>
            
            <div className="card-nexus hover-glow">
              <h3 className="h2-pixel" style={{ fontSize: '24px', marginBottom: '16px' }}>
                Smart Context
              </h3>
              <p className="body-text" style={{ fontSize: '16px', textAlign: 'left' }}>
                AI understands your workflow and provides relevant suggestions.
              </p>
            </div>
            
            <div className="card-nexus hover-glow">
              <h3 className="h2-pixel" style={{ fontSize: '24px', marginBottom: '16px' }}>
                Integrations
              </h3>
              <p className="body-text" style={{ fontSize: '16px', textAlign: 'left' }}>
                Works with your existing CRM and MLS systems.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="separator" />

      {/* Interactive Demo */}
      <section id="interface" className="section-nexus">
        <div className="container-nexus">
          <h2 className="h2-pixel mb-12">Try It</h2>
          
          <div className="element-3d">
            <div className="element-3d-item">
              {/* Terminal Interface */}
              <div className="card-nexus" style={{ maxWidth: '800px', margin: '0 auto', padding: '32px' }}>
                
                {/* Message Display */}
                <div style={{ 
                  minHeight: '300px', 
                  maxHeight: '400px', 
                  overflowY: 'auto',
                  marginBottom: '24px',
                  padding: '16px',
                  background: 'var(--color-primary-opacity-10)',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--color-primary-opacity-20)'
                }}>
                  {messages.length === 0 ? (
                    <div className="body-text" style={{ opacity: 0.5, fontSize: '14px' }}>
                      Try these examples:
                      <br />• "Find luxury homes in Austin under 2M"
                      <br />• "Add lead: Sarah Chen, interested in downtown condos"
                      <br />• "Schedule showing tomorrow at 3pm"
                      <br />• "Show my recent contacts"
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((m, i) => (
                        <div key={i} style={{ 
                          fontFamily: 'var(--font-pixel)', 
                          fontSize: '14px',
                          color: m.startsWith('you:') ? 'var(--color-primary)' : 'var(--color-primary-opacity-40)',
                          marginBottom: '8px'
                        }}>
                          <span style={{ opacity: 0.5 }}>
                            {m.startsWith('you:') ? 'You: ' : 'AI: '}
                          </span>
                          {m.replace(/^(you|ai): /, '')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input Form */}
                <form onSubmit={onSubmit} className="flex gap-4">
                  <input 
                    className="input-nexus flex-1"
                    value={input} 
                    onChange={e => setInput(e.target.value)} 
                    placeholder="Enter command or use voice input..." 
                  />
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className={`btn-nexus btn-nexus-icon ${isListening ? 'animate-pulse' : ''}`}
                    style={{ 
                      background: isListening ? 'var(--color-primary-opacity-20)' : 'transparent',
                      minWidth: '48px',
                      height: '48px'
                    }}
                  >
                    {isListening ? '◉' : '○'}
                  </button>
                  <button 
                    type="submit" 
                    className="btn-nexus btn-nexus-text"
                    style={{ padding: '12px 32px' }}
                  >
                    Send
                  </button>
                </form>

              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="separator" />

      {/* Technical Specifications */}
      <section className="section-nexus">
        <div className="container-nexus">
          <h2 className="h2-pixel mb-12">Features</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="card-nexus">
              <div className="caption mb-4">CRM Support</div>
              <ul style={{ fontFamily: 'var(--font-pixel)', fontSize: '14px', lineHeight: '2' }}>
                <li>• Wise Agent</li>
                <li>• Follow Up Boss</li>
                <li>• Real Geeks</li>
                <li>• Custom integrations</li>
              </ul>
            </div>

            <div className="card-nexus">
              <div className="caption mb-4">MLS Features</div>
              <ul style={{ fontFamily: 'var(--font-pixel)', fontSize: '14px', lineHeight: '2' }}>
                <li>• Property search</li>
                <li>• Market analysis</li>
                <li>• Comparable properties</li>
                <li>• Listing updates</li>
              </ul>
            </div>

            <div className="card-nexus">
              <div className="caption mb-4">Voice Features</div>
              <ul style={{ fontFamily: 'var(--font-pixel)', fontSize: '14px', lineHeight: '2' }}>
                <li>• Natural language input</li>
                <li>• Context awareness</li>
                <li>• Multiple languages</li>
                <li>• Noise reduction</li>
              </ul>
            </div>

            <div className="card-nexus">
              <div className="caption mb-4">Security</div>
              <ul style={{ fontFamily: 'var(--font-pixel)', fontSize: '14px', lineHeight: '2' }}>
                <li>• End-to-end encryption</li>
                <li>• OAuth 2.0</li>
                <li>• SOC 2 compliant</li>
                <li>• Secure data storage</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="separator" />

      {/* CTA Section */}
      <section className="section-nexus" style={{ paddingBottom: '128px' }}>
        <div className="container-nexus text-center">
          <h2 className="h2-pixel mb-8">Get Started</h2>
          
          <p className="body-text mb-12">
            Streamline your real estate workflow with AI.
          </p>
          
          <div className="flex justify-center gap-4">
            <a href="/login" className="btn-nexus btn-nexus-text">
              Sign In
            </a>
            <a href="/signup" className="btn-nexus btn-nexus-text">
              Sign Up
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        borderTop: '1px solid var(--color-primary-opacity-20)',
        padding: '48px 0',
        textAlign: 'center'
      }}>
        <div className="container-nexus">
          <div className="caption">
            © 2025 Estait. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}