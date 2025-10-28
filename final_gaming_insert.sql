-- =====================================================
-- FINAL GAMING DATA INSERT SCRIPT
-- =====================================================
-- Follow these steps:

-- STEP 1: Find your User ID (copy the UUID result)
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- STEP 2: Copy your UUID from Step 1 and replace "REPLACE_WITH_USER_ID" below
-- Then run the gaming account insert:

INSERT INTO gaming_accounts (
    user_id,
    platform,
    platform_user_id,
    platform_username,
    is_verified,
    total_playtime_hours,
    last_sync,
    created_at
) VALUES (
    'REPLACE_WITH_USER_ID',  -- <-- REPLACE THIS with your user ID from Step 1
    'steam',
    'https://steamcommunity.com/id/sidsterflows/',
    'sidsterflows',
    true,
    55,
    NOW(),
    NOW()
) RETURNING id, user_id;

-- STEP 3: Copy the "id" (gaming account ID) from Step 2's result
-- Then replace "REPLACE_WITH_USER_ID" and "REPLACE_WITH_GAMING_ACCOUNT_ID" below
-- Then uncomment and run:

/*
INSERT INTO gaming_achievements (
    user_id,
    gaming_account_id,
    achievement_name,
    achievement_description,
    tokens_awarded,
    platform,
    created_at
) VALUES 
(
    'REPLACE_WITH_USER_ID',  -- <-- REPLACE with your user ID
    'REPLACE_WITH_GAMING_ACCOUNT_ID',  -- <-- REPLACE with gaming account ID from Step 2
    'First Steps',
    'Played your first game on Steam',
    50,
    'steam',
    NOW() - INTERVAL '5 days'
),
(
    'REPLACE_WITH_USER_ID',
    'REPLACE_WITH_GAMING_ACCOUNT_ID',
    'Grinder',
    'Played for 10+ hours total',
    100,
    'steam',
    NOW() - INTERVAL '2 days'
),
(
    'REPLACE_WITH_USER_ID',
    'REPLACE_WITH_GAMING_ACCOUNT_ID',
    'Champion',
    'Earned multiple achievements',
    75,
    'steam',
    NOW() - INTERVAL '1 day'
);
*/

-- STEP 4: Insert gaming tasks (run this anytime, it won't duplicate)
INSERT INTO tasks (title, description, task_type, reward_tokens, is_active, created_at)
VALUES 
('Game Time', 'Play any game for 30 minutes today', 'gaming', 25, true, NOW()),
('Achievement Hunter', 'Earn 3 new achievements', 'gaming', 50, true, NOW()),
('Marathon Session', 'Play for 2+ hours today', 'gaming', 75, true, NOW())
ON CONFLICT DO NOTHING;

-- STEP 5: Verify your data (replace with your user ID)
SELECT 
    ga.platform_username,
    ga.platform,
    ga.total_playtime_hours,
    ga.is_verified,
    COUNT(ach.id) as achievement_count,
    COALESCE(SUM(ach.tokens_awarded), 0) as total_tokens_earned
FROM gaming_accounts ga
LEFT JOIN gaming_achievements ach ON ach.user_id = ga.user_id
WHERE ga.user_id = 'REPLACE_WITH_USER_ID'  -- <-- REPLACE with your user ID
GROUP BY ga.id, ga.platform_username, ga.platform, ga.total_playtime_hours, ga.is_verified;
