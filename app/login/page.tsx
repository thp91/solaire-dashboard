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
    <div className="min-h-screen bg-[#050B12] flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(#1A2D42 1px, transparent 1px), linear-gradient(90deg, #1A2D42 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00D4FF]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        <div className="bg-[#0B1B2B] border border-[#1A2D42] rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <Image src="/logo.png" alt="EnerVisio" width={160} height={64} className="object-contain" priority />
          </div>

          <p className="text-center text-sm text-[#7A8A99] mb-8">Connexion à votre espace</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#7A8A99] uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-[#050B12] border border-[#1A2D42] rounded-xl px-4 py-3 text-sm text-[#F5FAFF] focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition"
                placeholder="vous@exemple.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#7A8A99] uppercase tracking-widest mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-[#050B12] border border-[#1A2D42] rounded-xl px-4 py-3 text-sm text-[#F5FAFF] focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-[#FF4D6D] bg-[#FF4D6D]/10 border border-[#FF4D6D]/20 rounded-xl px-4 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#00D4FF] to-[#42F5A7] text-[#050B12] font-semibold rounded-xl text-sm transition hover:opacity-90 disabled:opacity-50 mt-2"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-xs text-[#7A8A99]/50 mt-8 font-[var(--font-space-grotesk)]">
            Vos installations, enfin visibles.
          </p>
        </div>
      </div>
    </div>
  );
}
