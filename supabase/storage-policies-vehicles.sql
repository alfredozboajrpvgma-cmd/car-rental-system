-- Run in Supabase Dashboard → SQL Editor (safe to re-run)
-- Bucket name must be exactly: vehicle-images (public bucket ON)

DROP POLICY IF EXISTS "vehicle_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_anon_upload" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_anon_update" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_anon_delete" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_dev_anon_upload" ON storage.objects;

-- Anyone can view photos (public bucket URLs)
CREATE POLICY "vehicle_images_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vehicle-images');

-- When Firebase ↔ Supabase third-party auth is configured
CREATE POLICY "vehicle_images_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-images'
  AND (storage.foldername(name))[1] = 'vehicles'
);

CREATE POLICY "vehicle_images_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vehicle-images'
  AND (storage.foldername(name))[1] = 'vehicles'
);

CREATE POLICY "vehicle_images_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicle-images'
  AND (storage.foldername(name))[1] = 'vehicles'
);

-- Fallback: allows uploads from the app without Firebase JWT mapping (local dev / school projects)
CREATE POLICY "vehicle_images_anon_upload"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'vehicle-images');

CREATE POLICY "vehicle_images_anon_update"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'vehicle-images');

CREATE POLICY "vehicle_images_anon_delete"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'vehicle-images');
