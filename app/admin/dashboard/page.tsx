'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MediaItem } from '@/types';
import {
  UploadCloud,
  Tv,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  FileImage,
  FileVideo,
  Plus,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  // Form Upload state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState<number>(10);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check Auth & Session via Server Endpoint
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUserEmail(data.user.email || 'Admin');
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
    };
    checkSession();
  }, []);

  // Fetch all media items via Server Endpoint
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/media');
      const data = await res.json();
      if (res.ok && data.items) {
        setItems(data.items as MediaItem[]);
      }
    } catch (err) {
      console.error('Fetch items error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Handle Logout via Server Endpoint
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      router.push('/admin/login');
    }
  };

  // Handle File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title) {
        const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    }
  };

  // Handle Upload Submission via Direct R2 Presigned URL
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Pilih file gambar atau video terlebih dahulu');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setUploadSuccess(false);
    setUploadProgress(0);
    setUploadStatus('Mempersiapkan upload...');

    try {
      const mimeType = file.type || 'application/octet-stream';
      const isVideo = mimeType.startsWith('video/');

      // 1. Minta presigned URL upload langsung ke Cloudflare R2
      setUploadStatus('Mendapatkan izin upload ke Cloudflare R2...');
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: mimeType,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok || !presignData.uploadUrl) {
        throw new Error(presignData.error || 'Gagal menyiapkan URL upload R2');
      }

      // 2. Upload file langsung ke Cloudflare R2 via PUT (Bypass Vercel limit)
      setUploadStatus('Mengunggah file ke Cloudflare R2...');
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignData.uploadUrl, true);
        xhr.setRequestHeader('Content-Type', mimeType);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Gagal upload ke R2 (Status: ${xhr.status})`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Gagal upload ke R2: Periksa konfigurasi CORS pada bucket Cloudflare R2 Anda'));
        };

        xhr.send(file);
      });

      // 3. Simpan data metadata media ke Supabase
      setUploadStatus('Menyimpan data banner...');
      const saveRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || file.name,
          type: isVideo ? 'video' : 'image',
          url: presignData.publicUrl,
          r2_key: presignData.key,
          duration: duration,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok || saveData.error) {
        throw new Error(saveData.error || 'Gagal menyimpan data ke database');
      }

      setUploadSuccess(true);
      setFile(null);
      setTitle('');
      setDuration(10);
      setUploadProgress(0);
      setUploadStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      fetchItems();
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat upload');
    } finally {
      setUploading(false);
    }
  };

  // Toggle Active/Inactive status via Server Endpoint
  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, is_active: !currentStatus } : item))
        );
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Update Duration via Server Endpoint
  const updateDuration = async (id: string, newDuration: number) => {
    if (isNaN(newDuration) || newDuration < 1) return;
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: newDuration }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, duration: newDuration } : item))
        );
      }
    } catch (err) {
      console.error('Failed to update duration:', err);
    }
  };

  // Move item position up/down via Server Endpoint
  const moveOrder = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newItems = [...items];

    const temp = newItems[index];
    newItems[index] = newItems[newIndex];
    newItems[newIndex] = temp;

    const updatedWithOrder = newItems.map((item, idx) => ({
      ...item,
      sort_order: idx + 1,
    }));

    setItems(updatedWithOrder);

    try {
      await fetch('/api/media/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: updatedWithOrder.map((it) => ({ id: it.id, sort_order: it.sort_order })),
        }),
      });
    } catch (err) {
      console.error('Failed to save order:', err);
    }
  };

  // Delete media item via Server Endpoint
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus media "${title}"?`)) return;

    try {
      const res = await fetch(`/api/media/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-16">
      {/* Header Minimalist Black & White */}
      <header className="border-b border-zinc-900 bg-black/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <Tv className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-widest uppercase font-mono">ADMIN TV MASJID NUR AL IMAN</h1>
              <p className="text-[11px] text-zinc-500">{userEmail || 'Pengelola Banner TV Masjid Nur Al Iman'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/display"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors border border-zinc-800"
            >
              <Eye className="w-3.5 h-3.5 text-white" />
              <span>Tampilan TV</span>
            </Link>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Section 1: Upload Media Form */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Sliders className="w-5 h-5 text-white" />
            <h2 className="text-base font-bold text-white tracking-wider uppercase font-mono">Tambah Banner Baru</h2>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center gap-3 text-zinc-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-white" />
              <span>{errorMsg}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center gap-3 text-white text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
              <span>Media berhasil diunggah ke Cloudflare R2 dan ditambahkan ke slideshow!</span>
            </div>
          )}

          <form onSubmit={handleUploadSubmit} className="space-y-6">
            {/* File Upload Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 hover:border-white bg-black rounded-2xl p-8 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-7 h-7 text-white" />
              </div>

              {file ? (
                <div>
                  <p className="text-sm font-semibold text-white truncate max-w-md mx-auto">{file.name}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-zinc-300">
                    Klik atau seret file gambar/video ke sini
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Mendukung JPG, PNG, WebP, MP4, WebM (Cloudflare R2 Object Storage)
                  </p>
                </div>
              )}
            </div>

            {/* Inputs Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Judul Banner
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: Promo Pengajian Jumat Berkah"
                  className="w-full px-4 py-2.5 rounded-xl bg-black border border-zinc-800 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Durasi Tampil (Detik)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black border border-zinc-800 text-sm text-white focus:outline-none focus:border-white transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {uploading && (
              <div className="space-y-2 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>{uploadStatus}</span>
                  <span className="font-mono font-bold text-white">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !file}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-40 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>{uploadProgress > 0 ? `MENGUNGGAH (${uploadProgress}%)...` : 'MEMPROSES...'}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-black" />
                  <span>UNGGAH & TAMBAHKAN SLIDE</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Section 2: Media Management List */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white tracking-wider uppercase font-mono">Daftar Banner Slideshow</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Urutan penayangan sesuai daftar di bawah ini</p>
            </div>

            <button
              onClick={fetchItems}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-zinc-500 text-sm font-mono">Memuat data media...</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              Belum ada media yang diunggah. Unggah file baru menggunakan form di atas.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all gap-4 ${
                    item.is_active
                      ? 'bg-black border-zinc-800'
                      : 'bg-black/50 border-zinc-900 opacity-40'
                  }`}
                >
                  {/* Left: Thumbnail & Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0">
                      {item.type === 'image' ? (
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      )}
                      <div className="absolute top-1 left-1 bg-black/80 p-1 rounded-md border border-zinc-700">
                        {item.type === 'image' ? (
                          <FileImage className="w-3 h-3 text-white" />
                        ) : (
                          <FileVideo className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{item.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 font-mono">
                        <span className="uppercase">{item.type}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {item.duration}s
                        </span>
                        <span>•</span>
                        <span className={item.is_active ? 'text-white font-bold' : 'text-zinc-600'}>
                          {item.is_active ? 'AKTIF' : 'NON-AKTIF'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Controls */}
                  <div className="flex items-center gap-2 border-t sm:border-t-0 border-zinc-900 pt-3 sm:pt-0 justify-end">
                    {/* Reorder Buttons */}
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mr-2">
                      <button
                        onClick={() => moveOrder(index, 'up')}
                        disabled={index === 0}
                        className="p-2 hover:bg-zinc-800 disabled:opacity-20 text-white transition-colors"
                        title="Naikkan Urutan"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveOrder(index, 'down')}
                        disabled={index === items.length - 1}
                        className="p-2 hover:bg-zinc-800 disabled:opacity-20 text-white transition-colors border-l border-zinc-800"
                        title="Turunkan Urutan"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Duration Input */}
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1">
                      <input
                        type="number"
                        min="1"
                        value={item.duration}
                        onChange={(e) => updateDuration(item.id, parseInt(e.target.value, 10))}
                        className="w-10 bg-transparent text-xs text-center font-mono text-white focus:outline-none"
                      />
                      <span className="text-[10px] text-zinc-500 pr-1">s</span>
                    </div>

                    {/* Active Toggle */}
                    <button
                      onClick={() => toggleActive(item.id, item.is_active)}
                      className={`p-2 rounded-xl border transition-colors ${
                        item.is_active
                          ? 'bg-white text-black border-white hover:bg-zinc-200'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white'
                      }`}
                      title={item.is_active ? 'Sembunyikan' : 'Tampilkan'}
                    >
                      {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Hapus Media"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
