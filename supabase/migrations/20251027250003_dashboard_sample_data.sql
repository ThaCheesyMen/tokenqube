-- Dashboard Enhancement Features - Sample Data
-- This migration adds sample tournaments and events

-- Insert sample tournaments (using existing schema)
INSERT INTO tournaments (name, description, game_name, platform, format, max_participants, prize_pool_tokens, entry_fee_tokens, start_date, registration_deadline, status, banner_url)
VALUES 
  ('TokenQube Winter Championship', 'Compete for the grand prize in this epic tournament!', 'Fortnite', 'pc', 'single_elimination', 64, 10000, 0, NOW() + INTERVAL '3 days', NOW() + INTERVAL '2 days', 'upcoming', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800'),
  ('Speed Run Challenge', 'Fastest completion wins big tokens!', 'Minecraft', 'pc', 'single_elimination', 32, 5000, 100, NOW() + INTERVAL '1 day', NOW() + INTERVAL '12 hours', 'registration', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800'),
  ('Battle Royale Showdown', 'Last player standing takes it all!', 'Apex Legends', 'pc', 'single_elimination', 100, 7500, 0, NOW() + INTERVAL '5 days', NOW() + INTERVAL '4 days', 'upcoming', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800')
ON CONFLICT DO NOTHING;

-- Insert sample events
INSERT INTO events (name, description, type, start_date, end_date, rewards, status)
VALUES
  ('Double Token Weekend', 'Earn 2x tokens for every achievement unlocked!', 'double_tokens', NOW(), NOW() + INTERVAL '3 days', '{"multiplier": 2, "applies_to": ["achievements", "quests"]}', 'active'),
  ('Community Game Night', 'Join us for a community-wide gaming session!', 'community', NOW() + INTERVAL '7 days', NOW() + INTERVAL '8 days', '{"tokens": 500, "badge": "community_player"}', 'upcoming'),
  ('Halloween Horror Challenge', 'Complete spooky challenges for exclusive rewards!', 'challenge', NOW() + INTERVAL '14 days', NOW() + INTERVAL '21 days', '{"tokens": 2000, "badge": "halloween_2024", "title": "The Haunted"}', 'upcoming')
ON CONFLICT DO NOTHING;

