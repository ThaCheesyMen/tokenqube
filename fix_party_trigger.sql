-- Fix the party trigger to delete parties when they reach 0 members

DROP TRIGGER IF EXISTS trigger_party_size_delete ON party_members;
DROP TRIGGER IF EXISTS trigger_party_size_insert ON party_members;
DROP FUNCTION IF EXISTS update_party_size();

-- Recreate the function with proper party deletion
CREATE OR REPLACE FUNCTION update_party_size()
RETURNS TRIGGER AS $$
DECLARE
  remaining_count INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get the current count from the members table
    SELECT COUNT(*) INTO remaining_count
    FROM party_members
    WHERE party_id = NEW.party_id;
    
    UPDATE parties 
    SET current_size = remaining_count,
        status = CASE 
          WHEN remaining_count >= party_size THEN 'full'
          ELSE 'open'
        END
    WHERE id = NEW.party_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- First check if this is the last member
    SELECT COUNT(*) INTO remaining_count
    FROM party_members
    WHERE party_id = OLD.party_id;

    -- If only 0 or 1 member remaining, delete the party
    IF remaining_count <= 1 THEN
      DELETE FROM parties WHERE id = OLD.party_id;
    ELSE
      -- Otherwise update the size
      UPDATE parties 
      SET current_size = current_size - 1,
          status = 'open'
      WHERE id = OLD.party_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the triggers
CREATE TRIGGER trigger_party_size_insert
  AFTER INSERT ON party_members
  FOR EACH ROW
  EXECUTE FUNCTION update_party_size();

CREATE TRIGGER trigger_party_size_delete
  AFTER DELETE ON party_members
  FOR EACH ROW
  EXECUTE FUNCTION update_party_size();

-- Also allow users to delete empty parties
DROP POLICY IF EXISTS "Users can delete empty parties" ON parties;
CREATE POLICY "Users can delete empty parties"
  ON parties FOR DELETE
  TO authenticated
  USING (auth.uid() = leader_id OR current_size <= 1);

SELECT 'Party trigger fixed successfully!' as status;
