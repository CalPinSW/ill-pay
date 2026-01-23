-- ============================================
-- MIGRATION: Update RLS policy to allow splitting items
-- Allows participants to create claims for other participants
-- ============================================

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Participants can claim items" ON item_claims;

-- Create new policy that allows participants to split items with other participants
CREATE POLICY "Participants can claim items"
  ON item_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    -- The user creating the claim must be a participant or owner
    EXISTS (
      SELECT 1 FROM receipt_items ri
      JOIN receipts r ON r.id = ri.receipt_id
      LEFT JOIN receipt_participants rp ON rp.receipt_id = r.id AND rp.user_id = auth.uid()
      WHERE ri.id = item_claims.item_id
      AND (r.owner_id = auth.uid() OR rp.user_id IS NOT NULL)
    )
    -- AND the target user must also be a participant or owner
    AND EXISTS (
      SELECT 1 FROM receipt_items ri
      JOIN receipts r ON r.id = ri.receipt_id
      LEFT JOIN receipt_participants rp ON rp.receipt_id = r.id AND rp.user_id = item_claims.user_id
      WHERE ri.id = item_claims.item_id
      AND (r.owner_id = item_claims.user_id OR rp.user_id IS NOT NULL)
    )
  );

-- Also allow participants to delete claims for split items they created
-- (when re-splitting, we need to delete other users' claims)
DROP POLICY IF EXISTS "Users can delete own claims" ON item_claims;

CREATE POLICY "Users can delete claims"
  ON item_claims FOR DELETE
  TO authenticated
  USING (
    -- Can delete own claims
    auth.uid() = user_id
    -- OR can delete claims on items where you're a participant (for re-splitting)
    OR EXISTS (
      SELECT 1 FROM receipt_items ri
      JOIN receipts r ON r.id = ri.receipt_id
      LEFT JOIN receipt_participants rp ON rp.receipt_id = r.id AND rp.user_id = auth.uid()
      WHERE ri.id = item_claims.item_id
      AND (r.owner_id = auth.uid() OR rp.user_id IS NOT NULL)
    )
  );
