-- =========================================================
-- SQL Schema Setup for Smart TV Banner Slideshow System
-- Run this script in your Supabase SQL Editor
-- =========================================================

-- 1. Create media_items table
CREATE TABLE IF NOT EXISTS public.media_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('image', 'video')),
    url TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 10, -- duration in seconds (for images or max duration for videos)
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create index for faster querying by display order
CREATE INDEX IF NOT EXISTS idx_media_items_sort ON public.media_items (sort_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_items_active ON public.media_items (is_active);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies:
-- Allow anyone (public/TV browser) to read active media items
CREATE POLICY "Public media items are viewable by everyone" 
ON public.media_items 
FOR SELECT 
USING (true);

-- Allow authenticated users (Admin) to insert, update, delete media items
CREATE POLICY "Authenticated users can insert media items" 
ON public.media_items 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update media items" 
ON public.media_items 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete media items" 
ON public.media_items 
FOR DELETE 
TO authenticated 
USING (true);

-- 5. Enable Realtime on media_items (Optional, for instant TV update)
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_items;
