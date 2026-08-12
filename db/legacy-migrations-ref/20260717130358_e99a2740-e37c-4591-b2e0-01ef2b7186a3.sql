-- Grant blog_editor role to insafarfa27@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('a83078d4-9305-4362-b918-31166fa7b345', 'blog_editor')
ON CONFLICT (user_id, role) DO NOTHING;

-- Allow blog_editors (and superadmins) to view all posts (including drafts)
CREATE POLICY "Blog editors can view all posts"
ON public.blog_posts FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'blog_editor')
  OR public.has_role(auth.uid(), 'superadmin')
);

-- Allow blog_editors to insert posts
CREATE POLICY "Blog editors can insert posts"
ON public.blog_posts FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'blog_editor')
  OR public.has_role(auth.uid(), 'superadmin')
);

-- Allow blog_editors to update posts
CREATE POLICY "Blog editors can update posts"
ON public.blog_posts FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'blog_editor')
  OR public.has_role(auth.uid(), 'superadmin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'blog_editor')
  OR public.has_role(auth.uid(), 'superadmin')
);

-- Allow blog_editors to delete posts
CREATE POLICY "Blog editors can delete posts"
ON public.blog_posts FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'blog_editor')
  OR public.has_role(auth.uid(), 'superadmin')
);