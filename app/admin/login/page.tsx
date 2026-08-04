'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, Tv, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message || 'Gagal masuk. Periksa kembali email dan password Anda.');
      } else if (data.session) {
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Subtle Background Glow Accent (Monochrome) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card - Pure Minimalist Black & White */}
      <div className="w-full max-w-md bg-zinc-950/90 border border-zinc-800 rounded-3xl p-8 shadow-2xl z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono text-center">ADMIN TV MASJID NUR AL IMAN</h1>
          <p className="text-xs text-zinc-400 mt-1.5">Masuk untuk mengelola banner slideshow Smart TV Masjid Nur Al Iman</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-zinc-900 border border-zinc-700 flex items-start gap-3 text-zinc-300 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 uppercase tracking-wider">Email Admin</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@domain.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-50 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            {loading ? (
              <span>Memproses...</span>
            ) : (
              <>
                <span>MASUK SEKARANG</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-900 text-center">
          <Link
            href="/display"
            className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <Tv className="w-4 h-4 text-zinc-400" />
            <span>Lihat Tampilan Smart TV</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
