-- Calculation Functions for I'll Pay
-- Functions to calculate user totals, tip distribution, and settlement amounts

-- ============================================
-- FUNCTION: Get total claimed amount for a user on a receipt
-- ============================================
CREATE OR REPLACE FUNCTION get_user_items_total(
  p_receipt_id UUID,
  p_user_id UUID
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(
    (ic.quantity::DECIMAL / ri.quantity::DECIMAL) * ri.total_price
  ), 0)
  INTO total
  FROM item_claims ic
  JOIN receipt_items ri ON ri.id = ic.item_id
  WHERE ri.receipt_id = p_receipt_id
  AND ic.user_id = p_user_id;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get user's share of tip (proportional or equal)
-- ============================================
CREATE OR REPLACE FUNCTION get_user_tip_share(
  p_receipt_id UUID,
  p_user_id UUID
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  receipt_record RECORD;
  user_items_total DECIMAL(10,2);
  participant_count INTEGER;
  tip_share DECIMAL(10,2);
BEGIN
  -- Get receipt details
  SELECT tip_amount, tip_type, subtotal
  INTO receipt_record
  FROM receipts
  WHERE id = p_receipt_id;
  
  IF receipt_record.tip_amount IS NULL OR receipt_record.tip_amount = 0 THEN
    RETURN 0;
  END IF;
  
  IF receipt_record.tip_type = 'equal' THEN
    -- Equal split among all participants (including owner)
    SELECT COUNT(*) + 1 INTO participant_count
    FROM receipt_participants
    WHERE receipt_id = p_receipt_id;
    
    tip_share := receipt_record.tip_amount / participant_count;
  ELSE
    -- Proportional based on items claimed
    user_items_total := get_user_items_total(p_receipt_id, p_user_id);
    
    IF receipt_record.subtotal IS NULL OR receipt_record.subtotal = 0 THEN
      RETURN 0;
    END IF;
    
    tip_share := (user_items_total / receipt_record.subtotal) * receipt_record.tip_amount;
  END IF;
  
  RETURN ROUND(tip_share, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get user's share of tax (proportional)
-- ============================================
CREATE OR REPLACE FUNCTION get_user_tax_share(
  p_receipt_id UUID,
  p_user_id UUID
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  receipt_record RECORD;
  user_items_total DECIMAL(10,2);
  tax_share DECIMAL(10,2);
BEGIN
  -- Get receipt details
  SELECT tax, subtotal
  INTO receipt_record
  FROM receipts
  WHERE id = p_receipt_id;
  
  IF receipt_record.tax IS NULL OR receipt_record.tax = 0 THEN
    RETURN 0;
  END IF;
  
  IF receipt_record.subtotal IS NULL OR receipt_record.subtotal = 0 THEN
    RETURN 0;
  END IF;
  
  user_items_total := get_user_items_total(p_receipt_id, p_user_id);
  tax_share := (user_items_total / receipt_record.subtotal) * receipt_record.tax;
  
  RETURN ROUND(tax_share, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get total amount a user owes for a receipt
-- ============================================
CREATE OR REPLACE FUNCTION get_user_total_owed(
  p_receipt_id UUID,
  p_user_id UUID
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  items_total DECIMAL(10,2);
  tax_share DECIMAL(10,2);
  tip_share DECIMAL(10,2);
BEGIN
  items_total := get_user_items_total(p_receipt_id, p_user_id);
  tax_share := get_user_tax_share(p_receipt_id, p_user_id);
  tip_share := get_user_tip_share(p_receipt_id, p_user_id);
  
  RETURN ROUND(items_total + tax_share + tip_share, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get settlement summary for a receipt
-- Returns a table with each participant's breakdown
-- ============================================
CREATE OR REPLACE FUNCTION get_receipt_settlement(p_receipt_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  display_name TEXT,
  items_total DECIMAL(10,2),
  tax_share DECIMAL(10,2),
  tip_share DECIMAL(10,2),
  total_owed DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH participants AS (
    -- Owner is always a participant
    SELECT r.owner_id AS uid
    FROM receipts r
    WHERE r.id = p_receipt_id
    UNION
    SELECT rp.user_id AS uid
    FROM receipt_participants rp
    WHERE rp.receipt_id = p_receipt_id
  )
  SELECT 
    p.id AS user_id,
    p.username,
    p.display_name,
    get_user_items_total(p_receipt_id, p.id) AS items_total,
    get_user_tax_share(p_receipt_id, p.id) AS tax_share,
    get_user_tip_share(p_receipt_id, p.id) AS tip_share,
    get_user_total_owed(p_receipt_id, p.id) AS total_owed
  FROM participants pt
  JOIN profiles p ON p.id = pt.uid
  ORDER BY total_owed DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get unclaimed amount for a receipt
-- ============================================
CREATE OR REPLACE FUNCTION get_unclaimed_amount(p_receipt_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  receipt_subtotal DECIMAL(10,2);
  claimed_total DECIMAL(10,2);
BEGIN
  SELECT subtotal INTO receipt_subtotal
  FROM receipts
  WHERE id = p_receipt_id;
  
  SELECT COALESCE(SUM(
    (ic.quantity::DECIMAL / ri.quantity::DECIMAL) * ri.total_price
  ), 0)
  INTO claimed_total
  FROM receipt_items ri
  LEFT JOIN item_claims ic ON ic.item_id = ri.id
  WHERE ri.receipt_id = p_receipt_id;
  
  RETURN COALESCE(receipt_subtotal, 0) - claimed_total;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Check if all items are fully claimed
-- ============================================
CREATE OR REPLACE FUNCTION is_receipt_fully_claimed(p_receipt_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  unclaimed_items INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unclaimed_items
  FROM receipt_items ri
  WHERE ri.receipt_id = p_receipt_id
  AND ri.quantity > (
    SELECT COALESCE(SUM(ic.quantity), 0)
    FROM item_claims ic
    WHERE ic.item_id = ri.id
  );
  
  RETURN unclaimed_items = 0;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get item claim status (for UI display)
-- ============================================
CREATE OR REPLACE FUNCTION get_item_claim_status(p_item_id UUID)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  total_quantity INTEGER,
  claimed_quantity INTEGER,
  remaining_quantity INTEGER,
  claims JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ri.id AS item_id,
    ri.name AS item_name,
    ri.quantity AS total_quantity,
    COALESCE(SUM(ic.quantity)::INTEGER, 0) AS claimed_quantity,
    (ri.quantity - COALESCE(SUM(ic.quantity)::INTEGER, 0)) AS remaining_quantity,
    COALESCE(
      json_agg(
        json_build_object(
          'user_id', ic.user_id,
          'username', p.username,
          'quantity', ic.quantity
        )
      ) FILTER (WHERE ic.id IS NOT NULL),
      '[]'::json
    ) AS claims
  FROM receipt_items ri
  LEFT JOIN item_claims ic ON ic.item_id = ri.id
  LEFT JOIN profiles p ON p.id = ic.user_id
  WHERE ri.id = p_item_id
  GROUP BY ri.id, ri.name, ri.quantity;
END;
$$ LANGUAGE plpgsql STABLE;
