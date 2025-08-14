
'use client';
import React, { useState, FormEvent, ChangeEvent } from 'react';
import { logIn } from '../../lib/firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '../components/Logo';
import type { LoginFormData } from '@/types';

const Login: React.FC = () => {
  // Typed state variables
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  // Handle input changes with proper typing
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission with proper error handling
  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      await logIn(formData.email, formData.password);
      router.push('/dashboard');
    } catch (error) {
      // Type-safe error handling
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      <div className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-md p-10 space-y-8 bg-black rounded-2xl m-4 border border-gray-100/10">
          <div className="flex justify-center">
            <Logo />
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 mt-1 border border-gray-100/10 rounded-lg shadow-sm focus:ring-white/50 focus:border-white/50 transition bg-white/5 text-white placeholder-white/50"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 mt-1 border border-gray-100/10 rounded-lg shadow-sm focus:ring-white/50 focus:border-white/50 transition bg-white/5 text-white placeholder-white/50"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-center text-red-400 text-sm">{error}</p>}
            <div>
              <button
                type="submit"
                className="w-full px-4 py-3 text-white bg-black rounded-full hover:bg-white/5 font-bold transition text-lg transform hover:scale-105 border border-gray-100/10"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </div>
          </form>
          <div className="text-center text-sm text-white/50">
            <p>
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-bold text-white hover:underline">
                  Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
