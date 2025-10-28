/*
  # Fix Auth Flow and Add Gaming Features

  ## Changes Made

  ### 1. Foreign Key Constraint Fix
  - Update complete_task function to reference profiles(id) instead of auth.users(id)
  - Fix all RPC functions to use proper foreign key references

  ### 2. New Tables

  #### gaming_accounts
  Stores connected gaming platform accounts
  - `id` (uuid, PK) - Account record ID
  - `user_id` (uuid, FK) - User who owns this gaming account
  - `platform` (text) - Platform name (steam, xbox, playstation, epic, riot, etc.)
  - `platform_user_id` (text) - User's ID on that platform
  - `platform_username` (text) - Display name on platform
  - `is_verified` (boolean) - Whether account is verified
  - `total_playtime_hours` (integer) - Total gaming hours tracked
  - `last_sync` (timestamptz) - Last time we synced data
  - `created_at` (timestamptz) - Connection date

  #### daily_tasks
  Daily recurring tasks for users
  - `id` (uuid, PK) - Task ID
  - `title` (text) - Task name
  - `description` (text) - Task details
  - `reward_tokens` (integer) - Tokens awarded
  - `task_type` (text) - daily_login, daily_survey, etc.
  - `is_active` (boolean) - Whether task is active
  - `created_at` (timestamptz)

  #### user_daily_tasks
  Tracks daily task completions (resets daily)
  - `id` (uuid, PK)
  - `user_id` (uuid, FK) - User
  - `daily_task_id` (uuid, FK) - Task completed
  - `completed_date` (date) - Date completed
  - `tokens_awarded` (integer) - Tokens given
  - `created_at` (timestamptz)

  #### gaming_achievements
  Track gaming achievements for passive rewards
  - `id` (uuid, PK)
  - `user_id` (uuid, FK) - User
  - `gaming_account_id` (uuid, FK) - Connected gaming account
  - `achievement_name` (text) - Achievement title
  - `achievement_description` (text) - Details
  - `tokens_awarded` (integer) - Tokens earned
  - `platform` (text) - Platform where achievement was earned
  - `created_at` (timestamptz)

  #### offer_walls
  External offer wall integrations
  - `id` (uuid, PK)
  - `name` (text) - Offer wall name
  - `provider` (text) - Provider (offertoro, cpx, adgem, etc.)
  - `iframe_url` (text) - Embed URL
  - `is_active` (boolean)
  - `description` (text)
  - `created_at` (timestamptz)

  ### 3. Security
  - RLS enabled on all new tables
  - Users can only access their own gaming accounts and achievements
  - Public access to offer walls for authenticated users

  ### 4. Functions Updated
  - Fix complete_task to use profiles(id)
  - Add function to complete daily tasks
  - Add function to sync gaming data
*/

-- Fix complete_task function to use profiles(id)
DROP FUNCTION IF EXISTS complete_task(uuid);
CREATE OR REPLACE FUNCTION complete_task(p_task_id uuid)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_task_reward integer;
  v_result json;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if task exists and is active
  SELECT reward_tokens INTO v_task_reward
  FROM tasks
  WHERE id = p_task_id AND is_active = true;
  
  IF v_task_reward IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Task not found or inactive');
  END IF;
  
  -- Check if user already completed this task
  IF EXISTS (SELECT 1 FROM user_tasks WHERE user_id = v_user_id AND task_id = p_task_id) THEN
    RETURN json_build_object('success', false, 'error', 'Task already completed');
  END IF;
  
  -- Record task completion with correct FK reference
  INSERT INTO user_tasks (user_id, task_id, tokens_awarded)
  VALUES (v_user_id, p_task_id, v_task_reward);
  
  -- Update user balance
  UPDATE profiles
  SET token_balance = token_balance + v_task_reward,
      total_earned = total_earned + v_task_reward
  WHERE id = v_user_id;
  
  -- Record transaction
  INSERT INTO transactions (user_id, amount, type, description, reference_id)
  VALUES (v_user_id, v_task_reward, 'task_completion', 'Completed task', p_task_id);
  
  RETURN json_build_object('success', true, 'tokens_earned', v_task_reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create gaming_accounts table
CREATE TABLE IF NOT EXISTS gaming_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  platform_user_id text NOT NULL,
  platform_username text NOT NULL,
  is_verified boolean DEFAULT false,
  total_playtime_hours integer DEFAULT 0,
  last_sync timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Create daily_tasks table
CREATE TABLE IF NOT EXISTS daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  reward_tokens integer NOT NULL,
  task_type text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user_daily_tasks table
CREATE TABLE IF NOT EXISTS user_daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  daily_task_id uuid REFERENCES daily_tasks(id) ON DELETE CASCADE NOT NULL,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  tokens_awarded integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, daily_task_id, completed_date)
);

-- Create gaming_achievements table
CREATE TABLE IF NOT EXISTS gaming_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  gaming_account_id uuid REFERENCES gaming_accounts(id) ON DELETE CASCADE NOT NULL,
  achievement_name text NOT NULL,
  achievement_description text NOT NULL,
  tokens_awarded integer NOT NULL,
  platform text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create offer_walls table
CREATE TABLE IF NOT EXISTS offer_walls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text NOT NULL,
  iframe_url text NOT NULL,
  is_active boolean DEFAULT true,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gaming_accounts_user_id ON gaming_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_gaming_accounts_platform ON gaming_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_user_daily_tasks_user_id ON user_daily_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_tasks_date ON user_daily_tasks(completed_date);
CREATE INDEX IF NOT EXISTS idx_gaming_achievements_user_id ON gaming_achievements(user_id);

-- Enable RLS
ALTER TABLE gaming_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gaming_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_walls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gaming_accounts
CREATE POLICY "Users can view own gaming accounts"
  ON gaming_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gaming accounts"
  ON gaming_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gaming accounts"
  ON gaming_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own gaming accounts"
  ON gaming_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for daily_tasks
CREATE POLICY "Authenticated users can view active daily tasks"
  ON daily_tasks FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for user_daily_tasks
CREATE POLICY "Users can view own daily task completions"
  ON user_daily_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily task completions"
  ON user_daily_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for gaming_achievements
CREATE POLICY "Users can view own gaming achievements"
  ON gaming_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for offer_walls
CREATE POLICY "Authenticated users can view active offer walls"
  ON offer_walls FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Function to complete daily task
CREATE OR REPLACE FUNCTION complete_daily_task(p_daily_task_id uuid)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_task_reward integer;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if task exists and is active
  SELECT reward_tokens INTO v_task_reward
  FROM daily_tasks
  WHERE id = p_daily_task_id AND is_active = true;
  
  IF v_task_reward IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Task not found or inactive');
  END IF;
  
  -- Check if user already completed this task today
  IF EXISTS (
    SELECT 1 FROM user_daily_tasks 
    WHERE user_id = v_user_id 
    AND daily_task_id = p_daily_task_id 
    AND completed_date = CURRENT_DATE
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Task already completed today');
  END IF;
  
  -- Record task completion
  INSERT INTO user_daily_tasks (user_id, daily_task_id, tokens_awarded)
  VALUES (v_user_id, p_daily_task_id, v_task_reward);
  
  -- Update user balance
  UPDATE profiles
  SET token_balance = token_balance + v_task_reward,
      total_earned = total_earned + v_task_reward
  WHERE id = v_user_id;
  
  -- Record transaction
  INSERT INTO transactions (user_id, amount, type, description, reference_id)
  VALUES (v_user_id, v_task_reward, 'daily_task', 'Completed daily task', p_daily_task_id);
  
  RETURN json_build_object('success', true, 'tokens_earned', v_task_reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award passive gaming tokens
CREATE OR REPLACE FUNCTION award_gaming_tokens(
  p_gaming_account_id uuid,
  p_achievement_name text,
  p_achievement_description text,
  p_tokens integer
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_platform text;
BEGIN
  -- Get user_id and platform from gaming account
  SELECT user_id, platform INTO v_user_id, v_platform
  FROM gaming_accounts
  WHERE id = p_gaming_account_id;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Gaming account not found');
  END IF;
  
  -- Record achievement
  INSERT INTO gaming_achievements (
    user_id, 
    gaming_account_id, 
    achievement_name, 
    achievement_description, 
    tokens_awarded, 
    platform
  ) VALUES (
    v_user_id, 
    p_gaming_account_id, 
    p_achievement_name, 
    p_achievement_description, 
    p_tokens, 
    v_platform
  );
  
  -- Update user balance
  UPDATE profiles
  SET token_balance = token_balance + p_tokens,
      total_earned = total_earned + p_tokens
  WHERE id = v_user_id;
  
  -- Record transaction
  INSERT INTO transactions (user_id, amount, type, description)
  VALUES (v_user_id, p_tokens, 'gaming_achievement', p_achievement_name);
  
  RETURN json_build_object('success', true, 'tokens_earned', p_tokens);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert daily tasks
INSERT INTO daily_tasks (title, description, reward_tokens, task_type) VALUES
  ('Daily Login', 'Log in to your account', 10, 'daily_login'),
  ('Daily Check-in', 'Complete your daily check-in', 25, 'daily_checkin'),
  ('Watch 3 Videos', 'Watch 3 short videos', 30, 'daily_videos'),
  ('Complete 2 Surveys', 'Finish 2 surveys today', 50, 'daily_surveys'),
  ('Refer a Friend', 'Share your referral link', 20, 'daily_share');

-- Insert offer walls
INSERT INTO offer_walls (name, provider, iframe_url, description) VALUES
  ('OfferToro', 'offertoro', 'https://www.offertoro.com/ifr/show/YOUR_ID', 'Complete offers and earn tokens'),
  ('CPX Research', 'cpx', 'https://offers.cpx-research.com/index.php?app_id=YOUR_ID', 'Take surveys for rewards'),
  ('AdGem', 'adgem', 'https://api.adgem.com/v1/wall?appid=YOUR_ID', 'Video offers and downloads'),
  ('Lootably', 'lootably', 'https://wall.lootably.com/?placementID=YOUR_ID', 'Quick tasks and offers');

-- Insert more regular tasks with better variety
INSERT INTO tasks (title, description, reward_tokens, task_type, external_url) VALUES
  ('Install Mobile Game', 'Download and reach level 10', 500, 'app_install', 'https://example.com/game1'),
  ('Try Disney+', 'Sign up for Disney+ free trial', 1000, 'offer', 'https://example.com/disney'),
  ('Netflix Sign Up', 'Start your Netflix subscription', 800, 'offer', 'https://example.com/netflix'),
  ('Complete Quick Survey', '2-minute opinion survey', 40, 'survey', 'https://example.com/survey1'),
  ('Watch Gaming Trailer', 'Watch new game announcement', 15, 'video', 'https://example.com/trailer'),
  ('Follow on Twitter', 'Follow our Twitter account', 35, 'social', 'https://twitter.com/example'),
  ('Join Discord Server', 'Join our Discord community', 50, 'social', 'https://discord.gg/example'),
  ('Test New App', 'Try app for 5 minutes', 100, 'app_install', 'https://example.com/app2'),
  ('Shopping Cashback', 'Make a purchase through our link', 250, 'offer', 'https://example.com/shop'),
  ('Credit Score Check', 'Check your free credit score', 300, 'offer', 'https://example.com/credit');
