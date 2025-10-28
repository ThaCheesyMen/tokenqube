import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  username: string;
  token_balance: number;
  total_earned: number;
  total_spent: number;
  referral_code: string;
  referred_by: string | null;
  signup_bonus_claimed: boolean;
  created_at: string;
  avatar_url?: string;
  banner_url?: string;
  status?: string;
  last_seen?: string;
  last_heartbeat?: string;
  currently_playing?: string;
  currently_playing_platform?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  reward_tokens: number;
  task_type: string;
  external_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface UserTask {
  id: string;
  user_id: string;
  task_id: string;
  status: string;
  completed_at: string;
  tokens_awarded: number;
}

export interface Redemption {
  id: string;
  user_id: string;
  game: string;
  amount: string;
  tokens_spent: number;
  status: string;
  user_game_id: string;
  created_at: string;
  completed_at: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string;
  reference_id: string | null;
  created_at: string;
}

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  reward_tokens: number;
  task_type: string;
  is_active: boolean;
  created_at: string;
}

export interface GamingAccount {
  id: string;
  user_id: string;
  platform: string;
  platform_user_id: string;
  platform_username: string;
  is_verified: boolean;
  total_playtime_hours: number;
  last_sync: string;
  created_at: string;
}

export interface OfferWall {
  id: string;
  name: string;
  provider: string;
  iframe_url: string;
  is_active: boolean;
  description: string;
  created_at: string;
}

export interface GamingAchievement {
  id: string;
  user_id: string;
  gaming_account_id: string;
  achievement_name: string;
  achievement_description: string;
  tokens_awarded: number;
  platform: string;
  created_at: string;
}

export interface UserGame {
  id: string;
  user_id: string;
  gaming_account_id: string;
  game_name: string;
  game_id: string;
  platform: string;
  hours_played: number;
  is_owned: boolean;
  image_url: string | null;
  last_sync: string;
  created_at: string;
  updated_at: string;
}

export interface GameTier {
  id: string;
  game_name: string;
  tier: number;
  tokens_per_hour: number;
  is_active: boolean;
  created_at: string;
}

export interface PlaytimeReward {
  id: string;
  user_id: string;
  gaming_account_id: string;
  game_name: string;
  hours_played: number;
  tokens_earned: number;
  reward_rate: number;
  period_start: string;
  period_end: string;
  claimed: boolean;
  created_at: string;
}

export interface PlaytimeMilestone {
  id: string;
  game_name: string | null;
  hours_required: number;
  bonus_tokens: number;
  milestone_name: string;
  badge_icon: string;
  is_active: boolean;
  created_at: string;
}

export interface UserMilestone {
  id: string;
  user_id: string;
  milestone_id: string;
  game_name: string;
  achieved_at: string;
  tokens_awarded: number;
}

export interface AchievementMultiplier {
  id: string;
  rarity: string;
  base_tokens: number;
  multiplier: number;
  description: string;
}

export interface CompetitiveMatch {
  id: string;
  user_id: string;
  game_name: string;
  match_result: string;
  rank_change: number;
  performance_score: number;
  tokens_earned: number;
  match_date: string;
  created_at: string;
}

export interface MarketplaceItem {
  id: string;
  seller_id: string;
  game_name: string;
  item_name: string;
  item_description: string;
  item_type: string;
  item_rarity: string | null;
  price_tokens: number;
  price_usd: number | null;
  quantity: number;
  images: string[];
  condition: string;
  tradeable_until: string | null;
  platform: string;
  is_verified: boolean;
  status: string;
  views: number;
  favorites: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string;
  };
}

export interface MarketplaceTransaction {
  id: string;
  item_id: string;
  seller_id: string;
  buyer_id: string;
  price_tokens: number;
  platform_fee: number;
  seller_receives: number;
  transaction_status: string;
  delivery_status: string;
  delivery_method: string | null;
  buyer_rating: number | null;
  seller_rating: number | null;
  dispute_reason: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface MarketplaceFavorite {
  id: string;
  user_id: string;
  item_id: string;
  created_at: string;
}

export interface MarketplaceReview {
  id: string;
  transaction_id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface UserMarketplaceStats {
  user_id: string;
  total_sales: number;
  total_purchases: number;
  total_tokens_earned: number;
  total_tokens_spent: number;
  average_rating: number;
  total_reviews: number;
  verified_seller: boolean;
  seller_tier: string;
  created_at: string;
  updated_at: string;
}
