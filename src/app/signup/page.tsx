
'use client';
import React, { useState, FormEvent, ChangeEvent } from 'react';
import { signUp } from '../../lib/firebase/auth';
import { createUserProfile } from '../../lib/firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '../components/Logo';
import type { SignupFormData } from '@/types';

const SignUp: React.FC = () => {
  // Typed state variables
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: ''
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

  // Handle form submission with validation
  const handleSignUp = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      const { user } = await signUp(formData.email, formData.password);
      await createUserProfile(user.uid, { email: user.email });
      router.push('/dashboard');
    } catch (err) {
      // Type-safe error handling
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
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
          <form onSubmit={handleSignUp} className="space-y-6">
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
                minLength={6}
                className="w-full px-4 py-3 mt-1 border border-gray-100/10 rounded-lg shadow-sm focus:ring-white/50 focus:border-white/50 transition bg-white/5 text-white placeholder-white/50"
                placeholder="Password (min 6 characters)"
                autoComplete="new-password"
              />
            </div>
            <div>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                minLength={6}
                className="w-full px-4 py-3 mt-1 border border-gray-100/10 rounded-lg shadow-sm focus:ring-white/50 focus:border-white/50 transition bg-white/5 text-white placeholder-white/50"
                placeholder="Confirm password"
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-center text-red-400 text-sm">{error}</p>}
            <div>
              <button
                type="submit"
                className="w-full px-4 py-3 text-white bg-black rounded-full hover:bg-white/5 font-bold transition text-lg transform hover:scale-105 border border-gray-100/10"
                disabled={loading}
              >
                {loading ? 'Signing up...' : 'Sign up'}
              </button>
            </div>
          </form>
          <div className="text-center text-sm text-white/50">
            <p>
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-white hover:underline">
                  Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
