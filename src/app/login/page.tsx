
'use client';
import React, { useState } from 'react';
import { logIn } from '../../lib/firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '../components/Logo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await logIn(email, password);
      router.push('/dashboard');
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#98BF64] to-[#FFB833]">
      <div className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-md p-10 space-y-6 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl m-4 border border-white/20">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold text-center text-white">Welcome Back</h2>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 mt-1 border border-white/30 rounded-lg shadow-sm focus:ring-[#FFB833] focus:border-[#FFB833] transition bg-white/20 text-white placeholder-white/50"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 mt-1 border border-white/30 rounded-lg shadow-sm focus:ring-[#FFB833] focus:border-[#FFB833] transition bg-white/20 text-white placeholder-white/50"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-center text-red-400 text-sm">{error}</p>}
            <div>
              <button
                type="submit"
                className="w-full px-4 py-3 text-black bg-white rounded-lg hover:bg-black hover:text-white font-bold transition text-lg transform hover:scale-105"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </div>
          </form>
          <div className="text-center text-sm text-white/80">
            <p>
              Don&apos;t have an account?{' '}
              <Link href="/signup" legacyBehavior>
                <a className="font-bold text-white hover:underline">
                  Sign up
                </a>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
