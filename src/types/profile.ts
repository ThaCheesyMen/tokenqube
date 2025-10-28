import { Database } from '../lib/supabase';

// Base Profile type from Supabase
export type Profile = Database['public']['Tables']['profiles']['Row'];

// Extended Profile with optional fields that may exist
export interface ExtendedProfile extends Profile {
  banner_url?: string;
  avatar_url?: string;
  custom_status?: string;
  status_emoji?: string;
  bio?: string;
  social_links?: Record<string, string>;
  theme_id?: string;
  title_id?: string;
  flair_id?: string;
}

