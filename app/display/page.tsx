'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MediaItem } from '@/types';
import { Monitor, RefreshCw, Maximize, Lock } from 'lucide-react';
import Link from 'next/link';

export default function DisplayPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mouseMoveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Preload image assets in background to ensure smooth TV transition
  const preloadImages = (mediaList: MediaItem[]) => {
    mediaList.forEach((item) => {
      if (item.type === 'image' && item.url) {
        const img = new Image();
        img.src = item.url;
      }
    });
  };

  // Fetch active media items via secure Server Endpoint
  const fetchActiveItems = useCallback(async () => {
    try {
      const res = await fetch('/api/display/media');
      const data = await res.json();
      if (res.ok && data.items) {
        const fetchedItems = data.items as MediaItem[];
        setItems((prevItems) => {
          const isIdentical =
            prevItems.length === fetchedItems.length &&
            prevItems.every(
              (item, idx) =>
                item.id === fetchedItems[idx]?.id &&
                item.duration === fetchedItems[idx]?.duration &&
                item.url === fetchedItems[idx]?.url &&
                item.is_active === fetchedItems[idx]?.is_active &&
                item.sort_order === fetchedItems[idx]?.sort_order
            );

          if (isIdentical) {
            return prevItems;
          }

          preloadImages(fetchedItems);
          return fetchedItems;
        });
      }
    } catch (err) {
      console.error('Fetch media exception:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + Fast polling every 10s + Supabase Realtime WebSocket listener
  useEffect(() => {
    fetchActiveItems();
    
    const syncInterval = setInterval(fetchActiveItems, 10000);

    const channel = supabase
      .channel('tv_realtime_media')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'media_items' },
        () => {
          fetchActiveItems();
        }
      )
      .subscribe();

    return () => {
      clearInterval(syncInterval);
      supabase.removeChannel(channel);
    };
  }, [fetchActiveItems]);

  // Transition to next slide
  const nextSlide = useCallback(() => {
    setItems((currentItems) => {
      if (currentItems.length === 0) return currentItems;
      setCurrentIndex((prevIndex) => (prevIndex + 1) % currentItems.length);
      return currentItems;
    });
  }, []);

  // Slide timer logic
  useEffect(() => {
    if (items.length === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const safeIndex = currentIndex % items.length;
    const currentItem = items[safeIndex];
    if (!currentItem) return;

    const durationMs = Math.max(currentItem.duration || 10, 3) * 1000;

    if (currentItem.type === 'image') {
      timerRef.current = setTimeout(() => {
        nextSlide();
      }, durationMs);
    } else if (currentItem.type === 'video') {
      timerRef.current = setTimeout(() => {
        nextSlide();
      }, durationMs + 3000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, items, nextSlide]);

  // Imperatively ensure video autoplay whenever currentIndex lands on a video slide
  useEffect(() => {
    if (items.length === 0) return;
    const safeIndex = currentIndex % items.length;
    const currentItem = items[safeIndex];

    if (currentItem?.type === 'video' && videoRef.current) {
      const vid = videoRef.current;
      vid.muted = true;
      vid.currentTime = 0;
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Smart TV Autoplay notice:', err);
        });
      }
    }
  }, [currentIndex, items]);

  // When video ends, move to next slide immediately
  const handleVideoEnded = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    nextSlide();
  };

  // Mouse activity auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (mouseMoveTimeout.current) clearTimeout(mouseMoveTimeout.current);
    mouseMoveTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 4000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
    }
  };

  const currentMedia = items[currentIndex];

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-screen h-screen overflow-hidden bg-black text-white select-none font-sans"
    >
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-40">
          <RefreshCw className="w-10 h-10 text-white animate-spin mb-4" />
          <p className="text-sm font-mono text-zinc-400 uppercase tracking-widest">MEMUAT SLIDESHOW TV...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-6">
            <Monitor className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-widest uppercase font-mono">BELUM ADA BANNER SLIDESHOW</h1>
          <p className="text-zinc-500 max-w-md mb-8 leading-relaxed text-sm">
            Belum ada media gambar atau video aktif yang diunggah. Silakan masuk ke Panel Admin untuk mengunggah banner baru.
          </p>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm transition-all shadow-lg"
          >
            <Lock className="w-4 h-4 text-black" />
            <span>BUKA PANEL ADMIN</span>
          </Link>
        </div>
      )}

      {/* Slideshow Pure Full Screen Media Display Layer */}
      {!loading && items.length > 0 && currentMedia && (
        <div className="absolute inset-0 w-full h-full bg-black">
          {items.map((item, index) => {
            const isActive = index === currentIndex;
            return (
              <div
                key={item.id}
                className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                  isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <video
                    ref={isActive ? videoRef : null}
                    src={item.url}
                    autoPlay={isActive}
                    muted
                    playsInline
                    onEnded={handleVideoEnded}
                    className="w-full h-full object-contain bg-black"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Floating Control Bar */}
      <div
        className={`absolute bottom-6 right-8 z-30 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 bg-black/80 backdrop-blur-md border border-zinc-800 px-4 py-2 rounded-2xl shadow-2xl">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors border border-zinc-800 font-mono"
          >
            <Maximize className="w-3.5 h-3.5" />
            FULLSCREEN TV
          </button>
          <Link
            href="/admin/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-xs font-semibold text-black transition-colors font-mono"
          >
            <Lock className="w-3.5 h-3.5 text-black" />
            ADMIN PANEL
          </Link>
        </div>
      </div>
    </div>
  );
}
