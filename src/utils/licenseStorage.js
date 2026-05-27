import { supabase, isSupabaseConfigured } from '../supabase';
import { getLicenseContentType, sanitizeFileName } from './licenseUpload';

const BUCKET = 'licenses';

export const uploadLicenseFile = async (file, userId) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local');
  }

  const safeName = sanitizeFileName(file.name);
  const path = `${userId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: getLicenseContentType(file),
    upsert: false,
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: signedData, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  const url = signError ? publicData.publicUrl : signedData.signedUrl;

  return {
    url,
    path,
    fileName: file.name,
  };
};

export const getUploadErrorMessage = (err) => {
  const msg = err?.message || '';
  if (msg.includes('Supabase is not configured')) return msg;
  if (err?.statusCode === '403' || msg.includes('row-level security') || msg.includes('policy')) {
    return 'Upload denied. Check Supabase Storage policies and Firebase third-party auth (see supabase/README.md).';
  }
  if (err?.statusCode === '404' || msg.includes('Bucket not found')) {
    return 'Storage bucket "licenses" not found. Create it in Supabase Dashboard → Storage.';
  }
  return msg || 'Failed to upload license document.';
};
