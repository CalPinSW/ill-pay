-- ============================================
-- MIGRATION: Support splitting items between friends
-- Changes quantity from INTEGER to DECIMAL to allow fractional claims
-- ============================================

-- Change quantity column to support fractional values
ALTER TABLE item_claims 
  ALTER COLUMN quantity TYPE DECIMAL(10,4);

-- Update the check constraint to allow fractional values > 0
ALTER TABLE item_claims 
  DROP CONSTRAINT IF EXISTS item_claims_quantity_check;

ALTER TABLE item_claims 
  ADD CONSTRAINT item_claims_quantity_check CHECK (quantity > 0);
