'use client';
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AnimatedLogo from '../components/AnimatedLogo';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err) {
      setError((err as Error).message || 'Failed to create account');
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
            <h1 className="mb-2">Create your account</h1>
            <p className="caption">Join Estait to streamline your real estate business</p>
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
                placeholder="Create a password"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" className="label">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Confirm your password"
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
              className="btn btn-primary w-full mb-4"
            >
              {loading ? (
                <div className="loading-indicator" style={{ width: '24px', margin: '0 auto' }} />
              ) : (
                'Create account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1" style={{ height: '1px', background: 'var(--border)' }} />
            <span className="caption">or</span>
            <div className="flex-1" style={{ height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Alternative actions */}
          <button className="btn btn-secondary w-full mb-4">
            Sign up with Google
          </button>
          
          <div className="text-center">
            <p className="caption">
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="caption">
            By creating an account, you agree to our{' '}
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