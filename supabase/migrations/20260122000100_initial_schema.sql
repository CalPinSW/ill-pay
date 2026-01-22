-- Initial Schema Migration for I'll Pay
-- Creates core tables for user profiles, friendships, receipts, and item claims

-- ============================================
-- PROFILES TABLE
-- Extends Supabase auth.users with app-specific data
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for username lookups
CREATE INDEX idx_profiles_username ON profiles(username);

-- ============================================
-- FRIENDSHIPS TABLE
-- Bidirectional friend relationships with status tracking
-- ============================================
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Indexes for efficient friend lookups
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- ============================================
-- RECEIPTS TABLE
-- Store receipt metadata and sharing configuration
-- ============================================
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_name TEXT,
  receipt_date DATE,
  subtotal DECIMAL(10,2),
  tax DECIMAL(10,2),
  tip_amount DECIMAL(10,2),
  tip_type TEXT NOT NULL CHECK (tip_type IN ('proportional', 'equal')) DEFAULT 'proportional',
  total DECIMAL(10,2),
  image_url TEXT,
  share_code TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'settled')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for receipt queries
CREATE INDEX idx_receipts_owner_id ON receipts(owner_id);
CREATE INDEX idx_receipts_share_code ON receipts(share_code);
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_receipts_created_at ON receipts(created_at DESC);

-- ============================================
-- RECEIPT ITEMS TABLE
-- Individual line items from parsed receipts
-- ============================================
CREATE TABLE receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for receipt item lookups
CREATE INDEX idx_receipt_items_receipt_id ON receipt_items(receipt_id);

-- ============================================
-- RECEIPT PARTICIPANTS TABLE
-- Users who have joined a receipt for splitting
-- ============================================
CREATE TABLE receipt_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_via TEXT CHECK (invited_via IN ('friend', 'link', 'qr')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(receipt_id, user_id)
);

-- Indexes for participant queries
CREATE INDEX idx_receipt_participants_receipt_id ON receipt_participants(receipt_id);
CREATE INDEX idx_receipt_participants_user_id ON receipt_participants(user_id);

-- ============================================
-- ITEM CLAIMS TABLE
-- Tracks which users claimed which items (and quantity)
-- ============================================
CREATE TABLE item_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES receipt_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, user_id)
);

-- Indexes for claim queries
CREATE INDEX idx_item_claims_item_id ON item_claims(item_id);
CREATE INDEX idx_item_claims_user_id ON item_claims(user_id);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_claims_updated_at
  BEFORE UPDATE ON item_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Auto-create profile on user signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- FUNCTION: Generate unique share code
-- ============================================
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-generate share code for receipts
-- ============================================
CREATE OR REPLACE FUNCTION set_receipt_share_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  IF NEW.share_code IS NULL THEN
    LOOP
      new_code := generate_share_code();
      SELECT EXISTS(SELECT 1 FROM receipts WHERE share_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.share_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_receipt_share_code_trigger
  BEFORE INSERT ON receipts
  FOR EACH ROW EXECUTE FUNCTION set_receipt_share_code();
