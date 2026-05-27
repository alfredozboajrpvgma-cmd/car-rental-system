export const ALLOWED_LICENSE_TYPES = [
  'image/png',
  'image/jpeg',
  'application/pdf',
];

export const ALLOWED_LICENSE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf'];

export const MAX_LICENSE_SIZE_MB = 5;

export const validateLicenseFile = (file) => {
  if (!file) {
    return { ok: false, message: 'No file selected.' };
  }

  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
  const typeOk = ALLOWED_LICENSE_TYPES.includes(file.type)
    || ALLOWED_LICENSE_EXTENSIONS.includes(ext);

  if (!typeOk) {
    return { ok: false, message: 'Only PNG, JPG, and PDF files are allowed.' };
  }

  if (file.size > MAX_LICENSE_SIZE_MB * 1024 * 1024) {
    return { ok: false, message: `File must be under ${MAX_LICENSE_SIZE_MB} MB.` };
  }

  return { ok: true };
};

export const sanitizeFileName = (name) =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');

export const licenseAcceptAttribute =
  'image/png,image/jpeg,.png,.jpg,.jpeg,.pdf,application/pdf';

export const getLicenseContentType = (file) => {
  if (file.type && ALLOWED_LICENSE_TYPES.includes(file.type)) {
    return file.type;
  }
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
};
