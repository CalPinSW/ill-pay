-- Fix infinite recursion in receipt_participants RLS policies

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their participations" ON receipt_participants;

-- Create a simpler SELECT policy without self-reference
CREATE POLICY "Users can view participations"
  ON receipt_participants FOR SELECT
  TO authenticated
  USING (
    -- User can view their own participations
    auth.uid() = user_id
    OR
    -- User can view participants of receipts they own
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_participants.receipt_id 
      AND receipts.owner_id = auth.uid()
    )
  );

-- Add separate policy for participants to see other participants (using security definer function)
CREATE OR REPLACE FUNCTION is_receipt_participant_safe(p_receipt_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM receipt_participants
    WHERE receipt_id = p_receipt_id
    AND user_id = p_user_id
  );
$$;

-- Policy for participants to view other participants in their receipts
CREATE POLICY "Participants can view co-participants"
  ON receipt_participants FOR SELECT
  TO authenticated
  USING (
    is_receipt_participant_safe(receipt_id, auth.uid())
  );
