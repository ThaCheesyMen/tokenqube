-- Manual profile creation for existing user
-- This will test if we can create profiles manually

-- First, let's create a profile for the existing user
INSERT INTO profiles (
  id, 
  username, 
  referral_code, 
  token_balance, 
  total_earned, 
  total_spent, 
  signup_bonus_claimed
) VALUES (
  'ac3a844d-beaf-4f93-8725-b9a5767f937f',
  'testuser',
  'MANUAL123',
  100,
  100,
  0,
  true
);

-- Create the transaction
INSERT INTO transactions (
  user_id, 
  amount, 
  type, 
  description
) VALUES (
  'ac3a844d-beaf-4f93-8725-b9a5767f937f',
  100,
  'signup_bonus',
  'Welcome bonus for signing up!'
);

-- Check if it worked
SELECT * FROM profiles WHERE id = 'ac3a844d-beaf-4f93-8725-b9a5767f937f';
SELECT * FROM transactions WHERE user_id = 'ac3a844d-beaf-4f93-8725-b9a5767f937f';
