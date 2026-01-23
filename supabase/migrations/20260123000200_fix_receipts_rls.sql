-- Fix infinite recursion in receipts RLS policy
-- The original policy referenced receipt_participants which has its own RLS

-- Drop the problematic SELECT policy
DROP POLICY IF EXISTS "Users can view own or participated receipts" ON receipts;
DROP POLICY IF EXISTS "Anyone can view receipt by share code" ON receipts;

-- Create simpler policy: owner can always see their receipts
-- For participant access, we'll use a security definer function to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_receipt_participant(receipt_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM receipt_participants 
    WHERE receipt_id = receipt_uuid AND user_id = user_uuid
  );
$$;

-- Users can view receipts they own or participate in
CREATE POLICY "Users can view own or participated receipts"
  ON receipts FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() 
    OR public.is_receipt_participant(id, auth.uid())
    OR share_code IS NOT NULL
  );
