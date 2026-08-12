DROP POLICY IF EXISTS "Organization admins can upload organization logo files" ON storage.objects;
DROP POLICY IF EXISTS "Organization admins can update organization logo files" ON storage.objects;
DROP POLICY IF EXISTS "Organization admins can delete organization logo files" ON storage.objects;

CREATE POLICY "Organization admins can upload organization logo files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.organizations org
    WHERE org.id::text = (storage.foldername(storage.objects.name))[1]
      AND public.is_org_admin(auth.uid(), org.id)
  )
);

CREATE POLICY "Organization admins can update organization logo files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.organizations org
    WHERE org.id::text = (storage.foldername(storage.objects.name))[1]
      AND public.is_org_admin(auth.uid(), org.id)
  )
)
WITH CHECK (
  bucket_id = 'organization-logos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.organizations org
    WHERE org.id::text = (storage.foldername(storage.objects.name))[1]
      AND public.is_org_admin(auth.uid(), org.id)
  )
);

CREATE POLICY "Organization admins can delete organization logo files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.organizations org
    WHERE org.id::text = (storage.foldername(storage.objects.name))[1]
      AND public.is_org_admin(auth.uid(), org.id)
  )
);