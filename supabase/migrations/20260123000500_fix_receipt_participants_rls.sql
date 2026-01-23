-- Fix RLS policies for receipt_participants to allow joining via share code

-- Allow users to view their own participation records (needed for upsert)
DROP POLICY IF EXISTS "Users can view their participations" ON receipt_participants;
CREATE POLICY "Users can view their participations"
  ON receipt_participants FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    -- Allow viewing participants if user owns the receipt
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_participants.receipt_id 
      AND receipts.owner_id = auth.uid()
    )
    OR
    -- Allow viewing if user is already a participant
    EXISTS (
      SELECT 1 FROM receipt_participants rp
      WHERE rp.receipt_id = receipt_participants.receipt_id
      AND rp.user_id = auth.uid()
    )
  );

-- Update INSERT policy to handle share code joins
DROP POLICY IF EXISTS "Users can join or owners can invite" ON receipt_participants;
CREATE POLICY "Users can join or owners can invite"
  ON receipt_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can add themselves to any active receipt with a share code
    (auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_participants.receipt_id 
      AND receipts.share_code IS NOT NULL
    ))
    OR
    -- Owner can add anyone to their receipt
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_participants.receipt_id 
      AND receipts.owner_id = auth.uid()
    )
  );
