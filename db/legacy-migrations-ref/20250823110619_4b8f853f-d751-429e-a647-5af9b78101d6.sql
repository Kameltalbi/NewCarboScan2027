-- Allow superadmins to delete bilans carbone
CREATE POLICY "Superadmins can delete all bilans carbone" 
ON public.bilans_carbone 
FOR DELETE 
USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Allow superadmins to update bilans carbone  
CREATE POLICY "Superadmins can update all bilans carbone"
ON public.bilans_carbone 
FOR UPDATE 
USING (has_role(auth.uid(), 'superadmin'::app_role));