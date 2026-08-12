-- Allow superadmins to view all bilans carbone
CREATE POLICY "Superadmins can view all bilans carbone" 
ON public.bilans_carbone 
FOR SELECT 
USING (has_role(auth.uid(), 'superadmin'::app_role));