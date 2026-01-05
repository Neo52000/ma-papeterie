-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create updated policies that include super_admin
CREATE POLICY "Admins and super_admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins and super_admins can manage all roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Drop the old user-specific policy since it's now included in the first policy
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;