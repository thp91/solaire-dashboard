'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    if (err) {
      setError('Email ou mot de passe incorrect.');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Halo lumineux discret */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(10,132,255,0.14), transparent 60%)' }}
      />

      <div className="relative w-full max-w-[380px]">
        <div className="app-card p-9 shadow-xl shadow-black/[0.06]">
          <div className="flex justify-center mb-7">
            <Image src="/logo.png" alt="EnerVisio" width={150} height={60} className="object-contain" priority />
          </div>

          <h1 className="text-center text-[22px] font-semibold text-[#1d1d1f] tracking-tight">Bienvenue</h1>
          <p className="text-center text-[15px] text-[#6e6e73] mt-1 mb-8">Connexion à votre espace</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="app-input"
                placeholder="vous@exemple.com"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#6e6e73] mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="app-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-[13px] text-[#FF3B30] bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl px-4 py-2.5">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-[#8e8e93] mt-6">
          Vos installations, enfin visibles.
        </p>
      </div>
    </div>
  );
}
