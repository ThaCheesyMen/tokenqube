-- Sample News Feed Data
-- Real-looking announcements and updates

INSERT INTO platform_announcements (title, content, category, game_name, priority, banner_url, created_at)
VALUES
  -- Recent announcements (last 7 days)
  ('Platform Maintenance Complete', 'All systems are back online! Thank you for your patience. Enjoy 100 bonus tokens as compensation!', 'announcement', NULL, 'high', NULL, NOW() - INTERVAL '13 hours'),
  
  ('Battlefield 6 Official Launch!', 'The wait is over! Battlefield 6 is now live with massive multiplayer battles, next-gen graphics, and revolutionary destruction physics. Join the fight today!', 'announcement', 'Battlefield 6', 'urgent', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800', NOW() - INTERVAL '1 day'),
  
  ('Battlefield 6 Season 1 Starts October 28th', 'Get ready for Season 1: Tactical Warfare! New maps, weapons, specialists, and exclusive battle pass rewards. Mark your calendars for October 28th!', 'announcement', 'Battlefield 6', 'high', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800', NOW() - INTERVAL '2 hours'),
  
  ('TokenQube Winter Event Starts Tomorrow!', 'Earn 2x tokens during our Winter Championship event. Special tournaments, exclusive rewards, and more!', 'announcement', NULL, 'high', 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?w=800', NOW() - INTERVAL '2 days'),
  
  ('Fortnite Chapter 5 Season 1 Patch Notes', 'New weapons, map changes, and performance improvements. Check out all the latest updates!', 'patch_notes', 'Fortnite', 'normal', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800', NOW() - INTERVAL '3 days'),
  
  ('Community Spotlight: Top Player of the Week', 'Congratulations to @ProGamer2024 for reaching #1 on our global leaderboard with 50,000 tokens earned!', 'community', NULL, 'normal', NULL, NOW() - INTERVAL '4 days'),
  
  ('Apex Legends: New Legend "Catalyst" Available', 'Season 19 brings a powerful new legend with game-changing abilities. Plus weapon balance updates and bug fixes.', 'patch_notes', 'Apex Legends', 'high', 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800', NOW() - INTERVAL '5 days'),
  
  ('CS2 Major Tournament Announced', 'The biggest Counter-Strike 2 tournament of the year is coming! $1M prize pool, registration opens next week.', 'esports', 'Counter-Strike 2', 'high', 'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=800', NOW() - INTERVAL '6 days'),
  
  ('New Achievement System Update', 'We''ve added 50+ new achievements across multiple games. Earn bonus tokens for completing rare achievements!', 'announcement', NULL, 'normal', NULL, NOW() - INTERVAL '7 days'),
  
  ('Community Tournament: Weekend Warriors', 'Join our weekly community tournament this Saturday! All skill levels welcome, 5000 token prize pool.', 'community', NULL, 'normal', NULL, NOW() - INTERVAL '5 days')
ON CONFLICT DO NOTHING;

