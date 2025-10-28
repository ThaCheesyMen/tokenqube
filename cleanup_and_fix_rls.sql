-- Clean up the problematic trigger
-- Run this to remove the trigger that's causing issues

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Re-enable RLS (it was disabled for testing)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE gaming_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gaming_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_walls ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view leaderboard data" ON profiles;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;

DROP POLICY IF EXISTS "Authenticated users can view active tasks" ON tasks;

DROP POLICY IF EXISTS "Users can view own completed tasks" ON user_tasks;
DROP POLICY IF EXISTS "Users can insert own task completions" ON user_tasks;

DROP POLICY IF EXISTS "Users can view own redemptions" ON redemptions;
DROP POLICY IF EXISTS "Users can create own redemptions" ON redemptions;

DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;

-- Drop gaming policies
DROP POLICY IF EXISTS "Users can view own gaming accounts" ON gaming_accounts;
DROP POLICY IF EXISTS "Users can insert own gaming accounts" ON gaming_accounts;
DROP POLICY IF EXISTS "Users can update own gaming accounts" ON gaming_accounts;
DROP POLICY IF EXISTS "Users can delete own gaming accounts" ON gaming_accounts;

-- Drop daily task policies
DROP POLICY IF EXISTS "Authenticated users can view active daily tasks" ON daily_tasks;

-- Drop user daily task policies
DROP POLICY IF EXISTS "Users can view own daily task completions" ON user_daily_tasks;
DROP POLICY IF EXISTS "Users can insert own daily task completions" ON user_daily_tasks;

-- Drop gaming achievement policies
DROP POLICY IF EXISTS "Users can view own gaming achievements" ON gaming_achievements;

-- Drop offer wall policies
DROP POLICY IF EXISTS "Authenticated users can view active offer walls" ON offer_walls;

-- Recreate profile creation function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code text;
  new_username text;
BEGIN
  -- Generate username from metadata or email
  new_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  
  -- Generate unique referral code
  LOOP
    new_referral_code := upper(substr(md5(random()::text || random()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_referral_code);
  END LOOP;

  -- Create profile with signup bonus
  INSERT INTO public.profiles (
    id, 
    username, 
    referral_code, 
    token_balance, 
    total_earned, 
    signup_bonus_claimed
  )
  VALUES (
    NEW.id,
    new_username,
    new_referral_code,
    100,
    100,
    true
  );

  -- Record signup bonus transaction
  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (NEW.id, 100, 'signup_bonus', 'Welcome bonus for signing up!');

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If profile already exists, just return
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create profile policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view leaderboard data"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Create transaction policies
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create task policies
CREATE POLICY "Authenticated users can view active tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create user_tasks policies
CREATE POLICY "Users can view own completed tasks"
  ON user_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own task completions"
  ON user_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create redemption policies
CREATE POLICY "Users can view own redemptions"
  ON redemptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own redemptions"
  ON redemptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create referral policies
CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Gaming accounts policies
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

-- Daily tasks policies
CREATE POLICY "Authenticated users can view active daily tasks"
  ON daily_tasks FOR SELECT
  TO authenticated
  USING (is_active = true);

-- User daily tasks policies
CREATE POLICY "Users can view own daily task completions"
  ON user_daily_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily task completions"
  ON user_daily_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Gaming achievements policies
CREATE POLICY "Users can view own gaming achievements"
  ON gaming_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Offer walls policies
CREATE POLICY "Authenticated users can view active offer walls"
  ON offer_walls FOR SELECT
  TO authenticated
  USING (is_active = true);
