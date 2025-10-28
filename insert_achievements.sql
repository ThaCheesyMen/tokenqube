-- Insert gaming achievements
-- Replace 'GAMING_ACCOUNT_ID' with the ID returned from the gaming_accounts insert

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
    '4c4ef0a4-6689-46df-b215-37a9d2bcc089',  -- Your user ID
    'GAMING_ACCOUNT_ID',  -- Replace with the gaming account ID from the INSERT above
    'First Steps',
    'Played your first game on Steam',
    50,
    'steam',
    NOW() - INTERVAL '5 days'
),
(
    '4c4ef0a4-6689-46df-b215-37a9d2bcc089',
    'GAMING_ACCOUNT_ID',
    'Grinder',
    'Played for 10+ hours total',
    100,
    'steam',
    NOW() - INTERVAL '2 days'
),
(
    '4c4ef0a4-6689-46df-b215-37a9d2bcc089',
    'GAMING_ACCOUNT_ID',
    'Champion',
    'Earned multiple achievements',
    75,
    'steam',
    NOW() - INTERVAL '1 day'
);
