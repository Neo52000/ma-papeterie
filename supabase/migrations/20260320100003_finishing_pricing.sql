-- Finishing pricing table for reprography services
CREATE TABLE finishing_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finishing TEXT NOT NULL,
  label TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  per_page BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO finishing_pricing (finishing, label, price, per_page) VALUES
  ('none', 'Aucune', 0, false),
  ('stapling', 'Agrafage', 0.50, false),
  ('spiral', 'Reliure spirale', 3.00, false),
  ('thermal', 'Reliure thermique', 5.00, false),
  ('lamination', 'Plastification', 1.50, true);

-- Extend print_pricing with large formats
INSERT INTO print_pricing (format, color, price_per_page, active)
SELECT format, color, price, true
FROM (VALUES
  ('A2', 'nb', 1.50),
  ('A2', 'couleur', 3.00),
  ('A1', 'nb', 3.00),
  ('A1', 'couleur', 6.00),
  ('A0', 'nb', 5.00),
  ('A0', 'couleur', 10.00)
) AS v(format, color, price)
WHERE NOT EXISTS (
  SELECT 1 FROM print_pricing pp WHERE pp.format = v.format AND pp.color = v.color
);

-- Extend photo_pricing with large formats
INSERT INTO photo_pricing (format, label, price_per_unit, active)
SELECT format, label, price, true
FROM (VALUES
  ('40x60', '40 x 60 cm', 12.00),
  ('50x75', '50 x 75 cm', 18.00),
  ('60x90', '60 x 90 cm', 25.00)
) AS v(format, label, price)
WHERE NOT EXISTS (
  SELECT 1 FROM photo_pricing pp WHERE pp.format = v.format
);

-- RLS
ALTER TABLE finishing_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read finishing pricing"
  ON finishing_pricing FOR SELECT USING (true);

CREATE POLICY "Admins can manage finishing pricing"
  ON finishing_pricing FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
