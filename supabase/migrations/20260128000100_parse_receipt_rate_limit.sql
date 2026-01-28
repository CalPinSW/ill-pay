CREATE TABLE receipt_parse_usage (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);

CREATE TRIGGER update_receipt_parse_usage_updated_at
  BEFORE UPDATE ON receipt_parse_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE receipt_parse_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own receipt parse usage"
  ON receipt_parse_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipt parse usage"
  ON receipt_parse_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipt parse usage"
  ON receipt_parse_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION check_and_increment_parse_receipt_usage(
  p_user_id UUID,
  p_day DATE,
  p_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_count INTEGER;
  v_new_count INTEGER;
  v_incremented BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  WITH upsert AS (
    INSERT INTO receipt_parse_usage (user_id, day, count)
    VALUES (p_user_id, p_day, 1)
    ON CONFLICT (user_id, day)
    DO UPDATE
      SET count = receipt_parse_usage.count + 1,
          updated_at = NOW()
      WHERE receipt_parse_usage.count < p_limit
    RETURNING count
  )
  SELECT
    (SELECT count FROM receipt_parse_usage WHERE user_id = p_user_id AND day = p_day),
    (SELECT count FROM upsert),
    (SELECT EXISTS(SELECT 1 FROM upsert))
  INTO v_current_count, v_new_count, v_incremented;

  RETURN jsonb_build_object(
    'allowed', v_incremented,
    'count', v_current_count,
    'limit', p_limit
  );
END;
$$;

REVOKE ALL ON FUNCTION check_and_increment_parse_receipt_usage(UUID, DATE, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_and_increment_parse_receipt_usage(UUID, DATE, INTEGER) TO authenticated;
