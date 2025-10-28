-- Debug Friends System
-- Run these queries to check if everything is working correctly

-- 1. Check if the accept_friend_request function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'accept_friend_request';

-- 2. Check your pending friend requests
SELECT 
  fr.id as request_id,
  fr.status,
  p1.username as from_user,
  p2.username as to_user,
  fr.created_at
FROM friend_requests fr
JOIN profiles p1 ON fr.from_user_id = p1.id
JOIN profiles p2 ON fr.to_user_id = p2.id
WHERE fr.status = 'pending'
ORDER BY fr.created_at DESC;

-- 3. Check your current friends
SELECT 
  f.id,
  f.status,
  p1.username as your_username,
  p2.username as friend_username,
  f.created_at
FROM friends f
JOIN profiles p1 ON f.user_id = p1.id
JOIN profiles p2 ON f.friend_id = p2.id
WHERE f.status = 'accepted'
ORDER BY f.created_at DESC;

-- 4. Check RLS policies on friends table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('friends', 'friend_requests');

-- 5. Test the accept_friend_request function (REPLACE 'your-request-id-here' with actual ID)
-- SELECT accept_friend_request('your-request-id-here'::UUID);

-- 6. Check if both directions of friendship were created
SELECT 
  f1.user_id as user1,
  f1.friend_id as user2,
  p1.username as user1_name,
  p2.username as user2_name,
  f1.status as f1_status,
  f2.status as f2_status,
  CASE 
    WHEN f2.id IS NULL THEN 'MISSING REVERSE FRIENDSHIP!'
    ELSE 'OK'
  END as bidirectional_check
FROM friends f1
JOIN profiles p1 ON f1.user_id = p1.id
JOIN profiles p2 ON f1.friend_id = p2.id
LEFT JOIN friends f2 ON f2.user_id = f1.friend_id AND f2.friend_id = f1.user_id
WHERE f1.status = 'accepted'
ORDER BY f1.created_at DESC;

-- 7. Count your friends
SELECT 
  p.username,
  COUNT(f.id) as friend_count
FROM profiles p
LEFT JOIN friends f ON f.user_id = p.id AND f.status = 'accepted'
GROUP BY p.id, p.username
HAVING COUNT(f.id) > 0
ORDER BY friend_count DESC;

