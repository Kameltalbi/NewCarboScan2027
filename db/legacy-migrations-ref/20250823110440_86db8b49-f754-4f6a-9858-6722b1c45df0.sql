-- Allow superadmins to view all companies
CREATE POLICY "Superadmins can view all companies" 
ON public.companies 
FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Allow superadmins to view all profiles  
CREATE POLICY "Superadmins can view all profiles"
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));