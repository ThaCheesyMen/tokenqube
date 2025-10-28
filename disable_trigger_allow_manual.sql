-- Alternative: Disable trigger and allow manual profile creation
-- Use this if the trigger keeps failing

-- Step 1: Disable the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Make RLS policies very permissive for authenticated users
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Allow authenticated users to insert their own profile
CREATE POLICY "Allow authenticated users to insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow everyone to view profiles
CREATE POLICY "Allow anyone to view profiles"
  ON profiles FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Allow users to update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 3: Fix transactions RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Step 4: Ensure columns have proper defaults
ALTER TABLE profiles ALTER COLUMN token_balance SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN total_earned SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN total_spent SET DEFAULT 0;
ALTER TABLE profiles ALTER COLUMN signup_bonus_claimed SET DEFAULT FALSE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Trigger DISABLED - Manual profile creation enabled';
  RAISE NOTICE 'Frontend can now create profiles directly';
  RAISE NOTICE '==============================================';
END $$;

