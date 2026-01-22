-- Row Level Security (RLS) Policies for I'll Pay
-- Ensures users can only access data they're authorized to see

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_claims ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view any profile (for friend search, participant lists)
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profile creation is handled by trigger, but allow insert for edge cases
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow service role to insert profiles (needed for auth trigger)
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================
-- FRIENDSHIPS POLICIES
-- ============================================

-- Users can view friendships they're part of
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can send friend requests (insert where they are user_id)
CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update friendships they received (accept/decline) or sent (cancel)
CREATE POLICY "Users can update relevant friendships"
  ON friendships FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can delete friendships they're part of
CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================
-- RECEIPTS POLICIES
-- ============================================

-- Users can view receipts they own or participate in
CREATE POLICY "Users can view own or participated receipts"
  ON receipts FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id 
    OR EXISTS (
      SELECT 1 FROM receipt_participants 
      WHERE receipt_id = receipts.id AND user_id = auth.uid()
    )
  );

-- Anyone can view a receipt by share code (for joining)
CREATE POLICY "Anyone can view receipt by share code"
  ON receipts FOR SELECT
  TO authenticated
  USING (share_code IS NOT NULL);

-- Users can create receipts (they become owner)
CREATE POLICY "Users can create receipts"
  ON receipts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Only owner can update receipt
CREATE POLICY "Owners can update receipts"
  ON receipts FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Only owner can delete receipt
CREATE POLICY "Owners can delete receipts"
  ON receipts FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- ============================================
-- RECEIPT ITEMS POLICIES
-- ============================================

-- Users can view items for receipts they can access
CREATE POLICY "Users can view items for accessible receipts"
  ON receipt_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_items.receipt_id 
      AND (
        receipts.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM receipt_participants 
          WHERE receipt_id = receipts.id AND user_id = auth.uid()
        )
      )
    )
  );

-- Only receipt owner can insert items
CREATE POLICY "Owners can insert receipt items"
  ON receipt_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_items.receipt_id 
      AND receipts.owner_id = auth.uid()
    )
  );

-- Only receipt owner can update items
CREATE POLICY "Owners can update receipt items"
  ON receipt_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_items.receipt_id 
      AND receipts.owner_id = auth.uid()
    )
  );

-- Only receipt owner can delete items
CREATE POLICY "Owners can delete receipt items"
  ON receipt_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_items.receipt_id 
      AND receipts.owner_id = auth.uid()
    )
  );

-- ============================================
-- RECEIPT PARTICIPANTS POLICIES
-- ============================================

-- Users can view participants for receipts they can access
CREATE POLICY "Users can view participants for accessible receipts"
  ON receipt_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_participants.receipt_id 
      AND (
        receipts.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM receipt_participants rp 
          WHERE rp.receipt_id = receipts.id AND rp.user_id = auth.uid()
        )
      )
    )
  );

-- Users can join receipts (add themselves as participant)
CREATE POLICY "Users can join receipts"
  ON receipt_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Owner can add participants, users can remove themselves
CREATE POLICY "Owners or self can delete participants"
  ON receipt_participants FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_participants.receipt_id 
      AND receipts.owner_id = auth.uid()
    )
  );

-- ============================================
-- ITEM CLAIMS POLICIES
-- ============================================

-- Users can view claims for receipts they participate in
CREATE POLICY "Participants can view item claims"
  ON item_claims FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM receipt_items ri
      JOIN receipts r ON r.id = ri.receipt_id
      WHERE ri.id = item_claims.item_id
      AND (
        r.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM receipt_participants 
          WHERE receipt_id = r.id AND user_id = auth.uid()
        )
      )
    )
  );

-- Participants can claim items (insert their own claims)
CREATE POLICY "Participants can claim items"
  ON item_claims FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM receipt_items ri
      JOIN receipts r ON r.id = ri.receipt_id
      LEFT JOIN receipt_participants rp ON rp.receipt_id = r.id AND rp.user_id = auth.uid()
      WHERE ri.id = item_claims.item_id
      AND (r.owner_id = auth.uid() OR rp.user_id IS NOT NULL)
    )
  );

-- Users can update their own claims
CREATE POLICY "Users can update own claims"
  ON item_claims FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own claims
CREATE POLICY "Users can delete own claims"
  ON item_claims FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
