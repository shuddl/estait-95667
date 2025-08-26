'use client';
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative">
      {/* Organic Background */}
      <div className="organic-bg" />
      
      
      <div className="container-nexus" style={{ maxWidth: '500px' }}>
        <div className="card-nexus fade-in">
          
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="h1-pixel" style={{ fontSize: '48px' }}>ESTAIT</h1>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="h2-pixel" style={{ fontSize: '24px' }}>Sign In</h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="email" className="caption block mb-2" style={{ textAlign: 'left' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-nexus"
                placeholder="user@domain.com"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="caption block mb-2" style={{ textAlign: 'left' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-nexus"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="mb-6" style={{
                padding: '12px',
                borderRadius: 'var(--border-radius)',
                background: 'rgba(240, 241, 200, 0.1)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-primary-opacity-40)',
                fontSize: '14px',
                fontFamily: 'var(--font-pixel)'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-nexus btn-nexus-text w-full mb-4"
              style={{ padding: '16px 32px' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="text-center mb-6">
              <Link href="#" className="caption" style={{ color: 'var(--color-primary)', opacity: 0.7 }}>
                Forgot password?
              </Link>
            </div>
          </form>

          {/* Divider */}
          <div className="separator" style={{ margin: '32px auto' }} />

          {/* Alternative actions */}
          <button className="btn-nexus btn-nexus-text w-full mb-4" style={{ padding: '16px 32px' }}>
            Continue with Google
          </button>
          
          <div className="text-center">
            <p className="caption">
              Don't have an account? {' '}
              <Link href="/signup" style={{ color: 'var(--color-primary)' }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>


        {/* Footer */}
        <div className="text-center mt-8">
          <p className="caption" style={{ opacity: 0.4, fontSize: '12px' }}>
            By continuing, you agree to our{' '}
            <Link href="#" style={{ color: 'var(--color-primary)', opacity: 0.6 }}>
              Terms of Service
            </Link>
            {' '}AND{' '}
            <Link href="#" style={{ color: 'var(--color-primary)', opacity: 0.6 }}>
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}