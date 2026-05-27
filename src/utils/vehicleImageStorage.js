import { supabase, isSupabaseConfigured } from '../supabase';
import { getVehicleImageContentType } from './vehicleImageUpload';
import { sanitizeFileName } from './licenseUpload';

const BUCKET = 'vehicle-images';

export const uploadVehicleImage = async (file, vehicleId) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local');
  }

  if (!vehicleId) {
    throw new Error('Vehicle ID is required before uploading an image.');
  }

  const safeName = sanitizeFileName(file.name);
  const path = `vehicles/${vehicleId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: getVehicleImageContentType(file),
    upsert: false,
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    url: publicData.publicUrl,
    path,
  };
};

export const deleteVehicleImage = async (imagePath) => {
  if (!imagePath || !isSupabaseConfigured || !supabase) return;

  const { error } = await supabase.storage.from(BUCKET).remove([imagePath]);
  if (error) {
    console.warn('Could not delete previous vehicle image:', error);
  }
};

export const getVehicleImageErrorMessage = (err) => {
  const msg = err?.message || String(err);
  if (msg.includes('Supabase is not configured')) return msg;
  if (err?.statusCode === '404' || msg.includes('Bucket not found')) {
    return 'Bucket "vehicle-images" not found. In Supabase → Storage, create a public bucket with that exact name.';
  }
  if (err?.statusCode === '403' || msg.includes('row-level security') || msg.includes('policy') || msg.includes('denied')) {
    return (
      'Upload denied by Supabase Storage rules. In Supabase → SQL Editor, run the full script: '
      + 'supabase/storage-policies-vehicles.sql (bucket must be named vehicle-images, public ON).'
    );
  }
  return msg || 'Failed to upload vehicle image.';
};
