
CREATE POLICY "Blog editors can upload blog images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'blog-images' AND has_role(auth.uid(), 'blog_editor'::app_role));

CREATE POLICY "Blog editors can update blog images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'blog-images' AND has_role(auth.uid(), 'blog_editor'::app_role));

CREATE POLICY "Blog editors can delete blog images"
ON storage.objects FOR DELETE
USING (bucket_id = 'blog-images' AND has_role(auth.uid(), 'blog_editor'::app_role));
