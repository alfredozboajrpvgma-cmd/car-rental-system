export const ALLOWED_VEHICLE_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
];

export const ALLOWED_VEHICLE_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

export const MAX_VEHICLE_IMAGE_SIZE_MB = 5;

export const vehicleImageAcceptAttribute =
  'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';

export const validateVehicleImageFile = (file) => {
  if (!file) {
    return { ok: false, message: 'No image selected.' };
  }

  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
  const typeOk = ALLOWED_VEHICLE_IMAGE_TYPES.includes(file.type)
    || ALLOWED_VEHICLE_IMAGE_EXTENSIONS.includes(ext);

  if (!typeOk) {
    return { ok: false, message: 'Only PNG, JPG, and WebP images are allowed.' };
  }

  if (file.size > MAX_VEHICLE_IMAGE_SIZE_MB * 1024 * 1024) {
    return { ok: false, message: `Image must be under ${MAX_VEHICLE_IMAGE_SIZE_MB} MB.` };
  }

  return { ok: true };
};

export const getVehicleImageContentType = (file) => {
  if (file.type && ALLOWED_VEHICLE_IMAGE_TYPES.includes(file.type)) {
    return file.type;
  }
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
};
