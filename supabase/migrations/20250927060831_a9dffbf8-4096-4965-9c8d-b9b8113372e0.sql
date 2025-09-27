-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  badge TEXT,
  eco BOOLEAN DEFAULT false,
  stock_quantity INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Products are viewable by everyone" 
ON public.products 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample products
INSERT INTO public.products (name, description, price, image_url, category, badge, eco, stock_quantity, is_featured) VALUES
('Carnet Moleskine Classic', 'Carnet de notes premium avec couverture rigide et papier de qualité supérieure.', 24.90, '/placeholder.svg', 'Bureautique', 'Bestseller', true, 50, true),
('Stylo Pilot G2', 'Stylo à bille rétractable avec encre gel fluide et grip confortable.', 3.50, '/placeholder.svg', 'Bureautique', null, false, 200, true),
('Agenda 2024 Rhodia', 'Agenda hebdomadaire avec couverture cuir et papier Clairefontaine.', 35.00, '/placeholder.svg', 'Bureautique', 'Nouveau', false, 30, true),
('Cahier spirale A4', 'Cahier spirale 180 pages avec perforations détachables.', 4.90, '/placeholder.svg', 'Scolaire', null, true, 100, false),
('Trousse vintage cuir', 'Trousse en cuir véritable style vintage avec fermeture éclair.', 18.50, '/placeholder.svg', 'Vintage', 'Édition limitée', false, 25, true),
('Crayons de couleur Faber-Castell', 'Boîte de 24 crayons de couleur aquarellables de qualité artistique.', 29.90, '/placeholder.svg', 'Scolaire', null, true, 40, false);