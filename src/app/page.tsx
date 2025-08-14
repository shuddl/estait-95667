
import Link from 'next/link';
import Logo from './components/Logo';
import React from 'react';

const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
    <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-lg border border-white/20 text-center">
        <div className="text-5xl mb-4">{icon}</div>
        <h3 className="text-2xl font-bold mb-3">{title}</h3>
        <p className="text-white/80">{children}</p>
    </div>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#98BF64] to-[#FFB833] text-white">
      <header className="sticky top-0 z-50 w-full bg-transparent backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Logo />
            <nav className="flex items-center gap-4">
              <Link href="/login" legacyBehavior>
                <a className="font-medium hover:text-black transition-colors">Login</a>
              </Link>
              <Link href="/signup" legacyBehavior>
                <a className="bg-white text-[#98BF64] px-6 py-2 rounded-full hover:bg-black hover:text-white font-bold transition-all transform hover:scale-105">
                  Sign Up
                </a>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main>
        <section className="py-24 sm:py-32 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
              Your Real Estate Workflow,
              <br />
              <span className="text-black">Supercharged.</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl text-white/90">
              Estait is the conversational AI assistant that unifies your CRM, MLS, and communications. Close deals faster. Work smarter.
            </p>
            <div className="mt-10">
              <Link href="/signup" legacyBehavior>
                <a className="inline-block bg-white text-black px-10 py-4 rounded-full hover:bg-black hover:text-white font-bold text-lg transition-all transform hover:scale-105 shadow-2xl">
                  Get Started for Free
                </a>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <FeatureCard icon="🤝" title="Unified CRM">
                Connect seamlessly with Wise Agent and Follow Up Boss. Your contacts, your tasks, all in one place.
              </FeatureCard>
              <FeatureCard icon="🏠" title="Intelligent Search">
                Find the perfect properties for your clients with our advanced, AI-powered MLS search.
              </FeatureCard>
              <FeatureCard icon="🤖" title="Voice-Powered">
                Use natural language to manage your day. Add contacts, create tasks, and get market insights on the go.
              </FeatureCard>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-transparent text-center py-8">
        <div className="container mx-auto px-4">
          <p>&copy; {new Date().getFullYear()} Estait. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
