/*
  # Rewards Platform Database Schema

  ## Overview
  Complete database schema for a rewards platform where users earn tokens by completing tasks
  and redeem them for in-game currencies (Fortnite, CSGO, Valorant, etc.).

  ## Tables Created

  ### 1. profiles
  Extends Supabase auth.users with additional user data
  - `id` (uuid, FK to auth.users) - User ID
  - `username` (text, unique) - Display name
  - `token_balance` (integer) - Current token balance
  - `total_earned` (integer) - Lifetime tokens earned
  - `total_spent` (integer) - Lifetime tokens spent
  - `referral_code` (text, unique) - User's unique referral code
  - `referred_by` (uuid, nullable) - ID of user who referred this user
  - `signup_bonus_claimed` (boolean) - Whether signup bonus was given
  - `created_at` (timestamptz) - Account creation timestamp

  ### 2. tasks
  Available tasks/offers users can complete to earn tokens
  - `id` (uuid, PK) - Task ID
  - `title` (text) - Task name
  - `description` (text) - Task details
  - `reward_tokens` (integer) - Tokens awarded on completion
  - `task_type` (text) - Type: survey, offer, video, signup, etc.
  - `external_url` (text, nullable) - Link to external task
  - `is_active` (boolean) - Whether task is currently available
  - `created_at` (timestamptz) - Task creation date

  ### 3. user_tasks
  Tracks which tasks users have completed
  - `id` (uuid, PK) - Record ID
  - `user_id` (uuid, FK) - User who completed task
  - `task_id` (uuid, FK) - Completed task
  - `status` (text) - pending, completed, rejected
  - `completed_at` (timestamptz) - Completion timestamp
  - `tokens_awarded` (integer) - Tokens given for this completion

  ### 4. redemptions
  Tracks user redemptions of tokens for in-game currencies
  - `id` (uuid, PK) - Redemption ID
  - `user_id` (uuid, FK) - User making redemption
  - `game` (text) - Game name (Fortnite, CSGO, Valorant, etc.)
  - `amount` (text) - Amount/description of reward
  - `tokens_spent` (integer) - Tokens deducted
  - `status` (text) - pending, processing, completed, failed
  - `user_game_id` (text) - User's game account identifier
  - `created_at` (timestamptz) - Redemption request time
  - `completed_at` (timestamptz, nullable) - Fulfillment time

  ### 5. transactions
  Complete history of all token movements
  - `id` (uuid, PK) - Transaction ID
  - `user_id` (uuid, FK) - User account
  - `amount` (integer) - Token amount (positive for earning, negative for spending)
  - `type` (text) - signup_bonus, task_completion, referral_bonus, redemption, admin_adjustment
  - `description` (text) - Transaction details
  - `reference_id` (uuid, nullable) - Related record ID (task_id, redemption_id, etc.)
  - `created_at` (timestamptz) - Transaction timestamp

  ### 6. referrals
  Tracks referral relationships and bonuses
  - `id` (uuid, PK) - Referral record ID
  - `referrer_id` (uuid, FK) - User who referred
  - `referred_id` (uuid, FK) - User who was referred
  - `bonus_tokens` (integer) - Tokens awarded to referrer
  - `is_paid` (boolean) - Whether bonus has been paid
  - `created_at` (timestamptz) - Referral date

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only read their own profile data
  - Users can view all active tasks
  - Users can only see their own completed tasks, redemptions, and transactions
  - Only authenticated users can access data
  - Leaderboard data is public to authenticated users

  ## Important Notes
  - All monetary values use integers to avoid floating point issues
  - Referral codes are automatically generated as random 8-character strings
  - Signup bonus (100 tokens) is automatically awarded on profile creation
  - Comprehensive indexing for performance on common queries
*/

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  token_balance integer DEFAULT 0,
  total_earned integer DEFAULT 0,
  total_spent integer DEFAULT 0,
  referral_code text UNIQUE NOT NULL,
  referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  signup_bonus_claimed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  reward_tokens integer NOT NULL,
  task_type text NOT NULL,
  external_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user_tasks table (tracks completed tasks)
CREATE TABLE IF NOT EXISTS user_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'completed',
  completed_at timestamptz DEFAULT now(),
  tokens_awarded integer NOT NULL,
  UNIQUE(user_id, task_id)
);

-- Create redemptions table
CREATE TABLE IF NOT EXISTS redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  game text NOT NULL,
  amount text NOT NULL,
  tokens_spent integer NOT NULL,
  status text DEFAULT 'pending',
  user_game_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create transactions table (complete token history)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  bonus_tokens integer DEFAULT 50,
  is_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referred_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_task_id ON user_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_total_earned ON profiles(total_earned DESC);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view leaderboard data"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for tasks
CREATE POLICY "Authenticated users can view active tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for user_tasks
CREATE POLICY "Users can view own completed tasks"
  ON user_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task completions"
  ON user_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for redemptions
CREATE POLICY "Users can view own redemptions"
  ON redemptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own redemptions"
  ON redemptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for referrals
CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Function to generate random referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code text;
  referrer_user_id uuid;
BEGIN
  -- Generate unique referral code
  LOOP
    new_referral_code := generate_referral_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_referral_code);
  END LOOP;

  -- Create profile with signup bonus
  INSERT INTO profiles (id, username, referral_code, token_balance, total_earned, signup_bonus_claimed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    new_referral_code,
    100,
    100,
    true
  );

  -- Record signup bonus transaction
  INSERT INTO transactions (user_id, amount, type, description)
  VALUES (NEW.id, 100, 'signup_bonus', 'Welcome bonus for signing up!');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to complete a task
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
  
  -- Record task completion
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

-- Function to process redemption
CREATE OR REPLACE FUNCTION process_redemption(
  p_game text,
  p_amount text,
  p_tokens_spent integer,
  p_user_game_id text
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_current_balance integer;
  v_redemption_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Check user balance
  SELECT token_balance INTO v_current_balance
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_current_balance < p_tokens_spent THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient tokens');
  END IF;
  
  -- Create redemption
  INSERT INTO redemptions (user_id, game, amount, tokens_spent, user_game_id)
  VALUES (v_user_id, p_game, p_amount, p_tokens_spent, p_user_game_id)
  RETURNING id INTO v_redemption_id;
  
  -- Update user balance
  UPDATE profiles
  SET token_balance = token_balance - p_tokens_spent,
      total_spent = total_spent + p_tokens_spent
  WHERE id = v_user_id;
  
  -- Record transaction
  INSERT INTO transactions (user_id, amount, type, description, reference_id)
  VALUES (v_user_id, -p_tokens_spent, 'redemption', 'Redeemed for ' || p_game, v_redemption_id);
  
  RETURN json_build_object('success', true, 'redemption_id', v_redemption_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process referral
CREATE OR REPLACE FUNCTION process_referral(p_referral_code text)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_referrer_id uuid;
  v_bonus integer := 50;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user already has a referrer
  IF EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id AND referred_by IS NOT NULL) THEN
    RETURN json_build_object('success', false, 'error', 'Already referred by someone');
  END IF;
  
  -- Find referrer
  SELECT id INTO v_referrer_id
  FROM profiles
  WHERE referral_code = p_referral_code AND id != v_user_id;
  
  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid referral code');
  END IF;
  
  -- Update referred user
  UPDATE profiles
  SET referred_by = v_referrer_id
  WHERE id = v_user_id;
  
  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, bonus_tokens, is_paid)
  VALUES (v_referrer_id, v_user_id, v_bonus, true);
  
  -- Award bonus to referrer
  UPDATE profiles
  SET token_balance = token_balance + v_bonus,
      total_earned = total_earned + v_bonus
  WHERE id = v_referrer_id;
  
  -- Record transaction
  INSERT INTO transactions (user_id, amount, type, description)
  VALUES (v_referrer_id, v_bonus, 'referral_bonus', 'Referral bonus for inviting a friend');
  
  RETURN json_build_object('success', true, 'bonus_awarded', v_bonus);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample tasks
INSERT INTO tasks (title, description, reward_tokens, task_type, external_url) VALUES
  ('Complete Survey', 'Share your opinion in our 5-minute survey', 50, 'survey', 'https://example.com/survey'),
  ('Watch Video', 'Watch a short promotional video', 25, 'video', 'https://example.com/video'),
  ('Sign up for Newsletter', 'Subscribe to our partner newsletter', 75, 'signup', 'https://example.com/newsletter'),
  ('Download App', 'Download and try our partner mobile app', 150, 'app_install', 'https://example.com/app'),
  ('Complete Offer', 'Sign up for a free trial', 200, 'offer', 'https://example.com/offer'),
  ('Daily Login Bonus', 'Log in every day to earn tokens', 10, 'daily', null),
  ('Share on Social Media', 'Share our platform with your friends', 30, 'social', 'https://example.com/share'),
  ('Write Review', 'Write a review of our platform', 100, 'review', 'https://example.com/review');
