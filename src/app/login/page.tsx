'use client';
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AnimatedLogo from '../components/AnimatedLogo';

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
      router.push('/');
    } catch (err) {
      setError((err as Error).message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="w-full" style={{ maxWidth: '400px', padding: '0 16px' }}>
        <div className="card animate-fadeIn">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <AnimatedLogo size="lg" />
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="mb-2">Welcome back</h1>
            <p className="caption">Sign in to continue to Estait</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div className="mb-4" style={{
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 82, 119, 0.1)',
                color: 'var(--error)',
                border: '1px solid rgba(255, 82, 119, 0.2)',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mb-3"
            >
              {loading ? (
                <div className="loading-indicator" style={{ width: '24px', margin: '0 auto' }} />
              ) : (
                'Sign in'
              )}
            </button>

            <div className="text-center mb-4">
              <Link href="#" className="caption" style={{ color: 'var(--text-secondary)' }}>
                Forgot your password?
              </Link>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1" style={{ height: '1px', background: 'var(--border)' }} />
            <span className="caption">or</span>
            <div className="flex-1" style={{ height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Alternative actions */}
          <button className="btn btn-secondary w-full mb-4">
            Continue with Google
          </button>
          
          <div className="text-center">
            <p className="caption">
              Don&apos;t have an account?{' '}
              <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="caption">
            By continuing, you agree to our{' '}
            <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}