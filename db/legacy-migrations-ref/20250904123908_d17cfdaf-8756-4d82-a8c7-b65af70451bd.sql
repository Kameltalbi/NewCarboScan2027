-- Create storage bucket for blog images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('blog-images', 'blog-images', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for blog images storage
CREATE POLICY "Superadmins can upload blog images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'blog-images' 
  AND has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Anyone can view blog images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'blog-images');

CREATE POLICY "Superadmins can update blog images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'blog-images'   
  AND has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Superadmins can delete blog images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'blog-images'
  AND has_role(auth.uid(), 'superadmin'::app_role)
);