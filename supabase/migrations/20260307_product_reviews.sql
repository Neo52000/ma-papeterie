-- ── Product Reviews Table (SEO + Social Proof) ────────────────────────────

CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Relationship
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Optional: logged-in user
  
  -- Review content
  title TEXT,  -- e.g., "Great quality"
  body TEXT NOT NULL,  -- Review text (min 20 chars recommended)
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),  -- 1-5 stars
  
  -- Author info (public display)
  author_name TEXT NOT NULL,  -- Name or "Anonymous"
  author_company TEXT,  -- Optional: school/company name
  author_email TEXT,  -- For verification, never public
  
  -- Moderation
  is_published BOOLEAN NOT NULL DEFAULT false,  -- Requires admin approval
  is_verified_purchase BOOLEAN DEFAULT false,  -- Flag if from actual order
  approved_at TIMESTAMP WITH TIME ZONE,  -- When moderator approved
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- SEO/Analytics
  helpful_count INT DEFAULT 0,  -- "Was this helpful?" votes
  unhelpful_count INT DEFAULT 0,
  
  CONSTRAINT valid_rating CHECK (rating BETWEEN 1 AND 5)
);

-- Create useful indexes
CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id) WHERE is_published = true;
CREATE INDEX idx_product_reviews_rating ON product_reviews(rating) WHERE is_published = true;
CREATE INDEX idx_product_reviews_created_at ON product_reviews(created_at DESC) WHERE is_published = true;
CREATE INDEX idx_product_reviews_author_id ON product_reviews(author_id);
CREATE INDEX idx_product_reviews_pending ON product_reviews(is_published) WHERE is_published = false;

-- Enable RLS
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public: Everyone can read published reviews
CREATE POLICY "Read published reviews" ON product_reviews
  FOR SELECT USING (is_published = true);

-- Authenticated: Users can see their own unpublished reviews
CREATE POLICY "Authors can read own reviews" ON product_reviews
  FOR SELECT USING (author_id = auth.uid());

-- Admins: Can manage all reviews
CREATE POLICY "Admins manage reviews" ON product_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
    )
  );

-- Authenticated users can submit reviews
CREATE POLICY "Users can insert reviews" ON product_reviews
  FOR INSERT WITH CHECK (
    author_id = auth.uid() OR author_email IS NOT NULL
  );

-- Users can update their own drafts
CREATE POLICY "Users update own reviews" ON product_reviews
  FOR UPDATE USING (author_id = auth.uid() AND is_published = false);

-- View for getting product review statistics (for frontend)
CREATE OR REPLACE VIEW v_product_review_stats AS
SELECT 
  product_id,
  COUNT(*) as review_count,
  ROUND(AVG(rating)::NUMERIC, 2) as avg_rating,
  COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
  COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
  COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
  COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
  COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count
FROM product_reviews
WHERE is_published = true
GROUP BY product_id;

-- Grant public access to stats view (for frontend)
GRANT SELECT ON v_product_review_stats TO anon, authenticated;

COMMENT ON TABLE product_reviews IS 'Customer reviews for products — moderated, for SEO + social proof';
COMMENT ON COLUMN product_reviews.rating IS 'Star rating 1-5, required for schema.org Review';
COMMENT ON COLUMN product_reviews.is_verified_purchase IS 'Marked true if review comes from actual order (builds trust)';
COMMENT ON COLUMN product_reviews.is_published IS 'Only published=true reviews appear publicly; others await moderation';
