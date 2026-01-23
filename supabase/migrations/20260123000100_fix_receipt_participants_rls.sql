-- Fix infinite recursion in receipt_participants RLS policy
-- The original policy referenced receipt_participants within itself

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants for accessible receipts" ON receipt_participants;

-- Create a simpler policy that avoids self-reference
-- Users can view participants if:
-- 1. They own the receipt, OR
-- 2. They are a participant themselves (check directly, not via subquery)
CREATE POLICY "Users can view participants for accessible receipts"
  ON receipt_participants FOR SELECT
  TO authenticated
  USING (
    -- User is a participant in this receipt (direct check on current row's receipt)
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_participants.receipt_id 
      AND receipts.owner_id = auth.uid()
    )
  );
