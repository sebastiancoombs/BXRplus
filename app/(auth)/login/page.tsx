// frontend/app/(auth)/login/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AppLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user && !error) {
        router.push('/home');
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await supabase.auth.signOut();
        setIsChecking(false);
      }
    };
    checkSession();
  },[router]);

  useEffect(() => {
    try {
      const localState = localStorage.getItem('chronoa-settings');
      let theme = 'system';
      if (localState) {
        const parsed = JSON.parse(localState);
        if (parsed?.state?.theme) theme = parsed.state.theme;
      }
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    } catch (e) {}
  },[]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.replace('/home');
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (signUpError) throw signUpError;

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          avatar_url: null,
        });
        if (profileError) throw profileError;
      }

      if (data.session) {
        router.replace('/home');
      } else {
        setMode('login');
        setError('Account created. Check your email to confirm it, then sign in.');
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to authenticate.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) return <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#121212]" />;

  return (
    <div className="relative min-h-screen bg-[#f7f5f0] dark:bg-[#121212] flex flex-col items-center justify-center overflow-hidden transition-colors duration-300">
      
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="absolute w-[800px] h-[800px] -translate-y-48 translate-x-32" style={{ background: 'radial-gradient(circle, rgba(168,130,194,0.15) 0%, transparent 60%)' }}></div>
        <div className="absolute w-[800px] h-[800px] translate-y-48 -translate-x-32" style={{ background: 'radial-gradient(circle, rgba(124,169,130,0.15) 0%, transparent 60%)' }}></div>
        <div className="absolute w-[1000px] h-[1000px] translate-y-12" style={{ background: 'radial-gradient(circle, rgba(194,149,110,0.1) 0%, transparent 60%)' }}></div>
      </div>

      <div className="z-10 flex flex-col items-center px-4 w-full">
        <h1 className="text-6xl md:text-7xl text-[#3d3b33] dark:text-[#f0f0f0] mb-4 tracking-tight font-serif">
          Chronoa
        </h1>
        <p className="text-[#888888] dark:text-[#7a7a7a] tracking-[0.25em] text-[11px] font-semibold uppercase mb-16">
          Your aesthetic workspace. Completely synced.
        </p>

        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          {mode === 'register' && (
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your name"
              required
              className="w-full h-[52px] px-5 bg-white dark:bg-[#1e1e1e] border border-[#e0ddd5] dark:border-[#333] rounded-2xl text-sm outline-none focus:border-[#c2956e] dark:focus:border-[#b0855f]"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
            autoComplete="email"
            className="w-full h-[52px] px-5 bg-white dark:bg-[#1e1e1e] border border-[#e0ddd5] dark:border-[#333] rounded-2xl text-sm outline-none focus:border-[#c2956e] dark:focus:border-[#b0855f]"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full h-[52px] px-5 pr-16 bg-white dark:bg-[#1e1e1e] border border-[#e0ddd5] dark:border-[#333] rounded-2xl text-sm outline-none focus:border-[#c2956e] dark:focus:border-[#b0855f]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-[#888]"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {error && <p className="text-sm text-center text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center w-full h-[52px] bg-[#c2956e] hover:bg-[#b0855f] text-white rounded-2xl text-sm font-semibold transition-all disabled:opacity-50"
          >
            {isLoading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode((current) => current === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="w-full text-xs text-[#888] hover:text-[#c2956e] transition-colors"
          >
            {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
