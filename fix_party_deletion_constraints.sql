-- Fix foreign key constraints for party deletion
-- This script ensures that when a party is deleted, related records are handled properly

-- Drop existing triggers that might cause issues
DROP TRIGGER IF EXISTS log_party_creation ON parties;
DROP TRIGGER IF EXISTS log_party_join ON party_members;
DROP TRIGGER IF EXISTS log_party_leave ON party_members;
DROP TRIGGER IF EXISTS update_party_size ON party_members;

-- Create a function to safely delete a party and all its related data
CREATE OR REPLACE FUNCTION delete_party_safely(p_party_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete in correct order to avoid foreign key violations
  DELETE FROM party_activity_logs WHERE party_id = p_party_id;
  DELETE FROM party_bans WHERE party_id = p_party_id;
  DELETE FROM party_members WHERE party_id = p_party_id;
  DELETE FROM parties WHERE id = p_party_id;
END;
$$;

-- Recreate the update_party_size trigger with better logic
CREATE OR REPLACE FUNCTION update_party_size()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  remaining_count integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increase current_size
    UPDATE parties
    SET current_size = current_size + 1,
        status = CASE 
          WHEN current_size + 1 >= party_size THEN 'full'
          ELSE 'open'
        END
    WHERE id = NEW.party_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrease current_size
    UPDATE parties
    SET current_size = current_size - 1,
        status = 'open'
    WHERE id = OLD.party_id
    RETURNING current_size INTO remaining_count;
    
    -- If no members left, delete the party
    IF remaining_count <= 0 THEN
      -- Use the safe delete function
      PERFORM delete_party_safely(OLD.party_id);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_party_size
AFTER INSERT OR DELETE ON party_members
FOR EACH ROW
EXECUTE FUNCTION update_party_size();

-- Recreate activity log triggers that don't cause foreign key issues
CREATE OR REPLACE FUNCTION log_party_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO party_activity_logs (party_id, user_id, action, details)
  VALUES (NEW.id, NEW.leader_id, 'created',
    jsonb_build_object('game_name', NEW.game_name, 'party_size', NEW.party_size));
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if party_activity_logs doesn't exist or has issues
    RETURN NEW;
END;
$$;

CREATE TRIGGER log_party_creation
AFTER INSERT ON parties
FOR EACH ROW
EXECUTE FUNCTION log_party_creation();

CREATE OR REPLACE FUNCTION log_party_join()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO party_activity_logs (party_id, user_id, action, details)
  VALUES (NEW.party_id, NEW.user_id, 'joined', jsonb_build_object('role', NEW.role));
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if party_activity_logs doesn't exist or has issues
    RETURN NEW;
END;
$$;

CREATE TRIGGER log_party_join
AFTER INSERT ON party_members
FOR EACH ROW
EXECUTE FUNCTION log_party_join();

CREATE OR REPLACE FUNCTION log_party_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only log if party still exists (to avoid foreign key errors)
  IF EXISTS (SELECT 1 FROM parties WHERE id = OLD.party_id) THEN
    INSERT INTO party_activity_logs (party_id, user_id, action, details)
    VALUES (OLD.party_id, OLD.user_id, 'left', jsonb_build_object());
  END IF;
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors
    RETURN OLD;
END;
$$;

CREATE TRIGGER log_party_leave
AFTER DELETE ON party_members
FOR EACH ROW
EXECUTE FUNCTION log_party_leave();

-- Update RLS policy to allow safe deletion
DROP POLICY IF EXISTS "Users can delete their own parties" ON parties;
CREATE POLICY "Users can delete their own parties"
ON parties FOR DELETE
TO authenticated
USING (leader_id = auth.uid());

-- Grant execute permission on the safe delete function
GRANT EXECUTE ON FUNCTION delete_party_safely(uuid) TO authenticated;

COMMENT ON FUNCTION delete_party_safely IS 'Safely deletes a party and all related records in the correct order';
