-- Fix RLS policy for receipt_participants INSERT
-- Allow receipt owners to add participants, not just users adding themselves

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can join receipts" ON receipt_participants;

-- Create new policy: users can join themselves OR owners can add participants
CREATE POLICY "Users can join or owners can invite"
  ON receipt_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can add themselves
    auth.uid() = user_id
    OR
    -- Owner can add anyone to their receipt
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_participants.receipt_id 
      AND receipts.owner_id = auth.uid()
    )
  );
