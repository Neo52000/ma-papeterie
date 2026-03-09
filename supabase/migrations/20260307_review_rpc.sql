-- ── RPC Function: Increment Review Vote Counters ─────────────────────────

CREATE OR REPLACE FUNCTION increment_review_count(review_id UUID, count_type TEXT)
RETURNS void AS $$
BEGIN
  IF count_type = 'helpful_count' THEN
    UPDATE product_reviews SET helpful_count = helpful_count + 1 WHERE id = review_id;
  ELSIF count_type = 'unhelpful_count' THEN
    UPDATE product_reviews SET unhelpful_count = unhelpful_count + 1 WHERE id = review_id;
  ELSE
    RAISE EXCEPTION 'Invalid count_type: %', count_type;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_review_count IS 'Increment helpful/unhelpful counters on product reviews';
