-- Fix contact_requests table security issues

-- First, update the RLS policy to be more restrictive
DROP POLICY IF EXISTS "Users can insert contact requests" ON public.contact_requests;

-- Create a more secure policy that allows both authenticated and anonymous users
-- but with proper validation and structure
CREATE POLICY "Allow contact requests with validation" 
ON public.contact_requests 
FOR INSERT 
WITH CHECK (
  -- Either user is authenticated (user_id = auth.uid())
  (auth.uid() = user_id) OR 
  -- Or it's an anonymous request (user_id IS NULL) with required fields
  (user_id IS NULL AND email IS NOT NULL AND message IS NOT NULL)
);

-- Add a new policy for anonymous contact form submissions
CREATE POLICY "Anonymous users can submit contact forms" 
ON public.contact_requests 
FOR INSERT 
WITH CHECK (
  user_id IS NULL 
  AND email IS NOT NULL 
  AND message IS NOT NULL
  AND length(email) >= 5 
  AND length(message) >= 10
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
);

-- Update the existing view policy to be more secure
DROP POLICY IF EXISTS "Users can view their own contact requests" ON public.contact_requests;

CREATE POLICY "Users can view their own contact requests" 
ON public.contact_requests 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  -- Superadmins can view all requests
  (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  ))
);

-- Add a policy for superadmins to manage contact requests
CREATE POLICY "Superadmins can manage all contact requests" 
ON public.contact_requests 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'
  )
);

-- Add an index for performance on email lookups
CREATE INDEX IF NOT EXISTS idx_contact_requests_email ON public.contact_requests(email);
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON public.contact_requests(created_at);

-- Add a function to help with rate limiting (optional future enhancement)
CREATE OR REPLACE FUNCTION public.check_contact_rate_limit(client_ip inet, time_window interval DEFAULT '1 hour', max_requests integer DEFAULT 5)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*) < max_requests
  FROM public.contact_requests
  WHERE created_at > now() - time_window
  AND (
    -- Could be enhanced to track IP addresses in future
    email IS NOT NULL
  );
$$;