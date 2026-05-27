-- Run in Supabase Dashboard → SQL Editor
-- Bucket "licenses" must exist (public recommended for admin license links)

-- Public read (works when bucket is public)
CREATE POLICY "licenses_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'licenses');

-- Authenticated users upload only to their own folder: licenses/{userId}/...
CREATE POLICY "licenses_user_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'licenses'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "licenses_user_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'licenses'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "licenses_user_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'licenses'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
