-- Update English blog posts to have the same featured images as their French counterparts
UPDATE public.blog_posts 
SET featured_image_url = 'https://jhucjukyvlilhgjbtlkt.supabase.co/storage/v1/object/public/blog-images/1756991747988.jpg'
WHERE slug = 'cbam-future-extensions-what-awaits-industries-after-2026' AND language = 'en';

UPDATE public.blog_posts 
SET featured_image_url = 'https://jhucjukyvlilhgjbtlkt.supabase.co/storage/v1/object/public/blog-images/1756990762868.jpg'
WHERE slug = 'cbam-opportunity-for-african-industrial-development' AND language = 'en';

UPDATE public.blog_posts 
SET featured_image_url = 'https://jhucjukyvlilhgjbtlkt.supabase.co/storage/v1/object/public/blog-images/1756990467773.jpg'
WHERE slug = 'cbam-european-mechanism-fair-competition-low-carbon-transition' AND language = 'en';