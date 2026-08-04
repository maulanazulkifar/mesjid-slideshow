export type MediaType = 'image' | 'video';

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  url: string;
  r2_key: string;
  duration: number; // in seconds
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UploadMediaRequest {
  title: string;
  type: MediaType;
  duration?: number;
}
