-- DEV ONLY: use if uploads fail without Firebase custom claims on JWT
-- Run AFTER storage-policies.sql or instead of authenticated policies

CREATE POLICY "licenses_dev_anon_upload"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'licenses');

CREATE POLICY "vehicle_images_dev_anon_upload"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'vehicle-images');
