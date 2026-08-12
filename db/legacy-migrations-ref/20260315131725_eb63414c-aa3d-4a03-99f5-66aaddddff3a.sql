-- Create public bucket for downloadable documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents-publics', 'documents-publics', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for documents-publics"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents-publics');

-- Allow authenticated users with admin role to upload
CREATE POLICY "Admin upload for documents-publics"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents-publics' AND public.has_role(auth.uid(), 'admin'));
