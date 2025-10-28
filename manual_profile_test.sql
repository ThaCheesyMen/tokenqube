-- Manual profile creation test for current user
-- This will help us test if RLS policies are working

-- First, let's try to create a profile manually for the current user
INSERT INTO profiles (
  id, 
  username, 
  referral_code, 
  token_balance, 
  total_earned, 
  total_spent, 
  signup_bonus_claimed
) VALUES (
  'b3c03223-cba8-4299-9a87-4f56854fb868',
  'newuser',
  'TEST1234',
  100,
  100,
  0,
  true
);

-- If that works, create the transaction
INSERT INTO transactions (
  user_id, 
  amount, 
  type, 
  description
) VALUES (
  'b3c03223-cba8-4299-9a87-4f56854fb868',
  100,
  'signup_bonus',
  'Welcome bonus for signing up!'
);
