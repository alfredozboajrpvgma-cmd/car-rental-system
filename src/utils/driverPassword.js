const RANDOM_CHARS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** First word of the business / company name (letters and digits only). */
export const getCompanyPasswordPrefix = (businessName) => {
  const raw = String(businessName || 'Drive').trim().split(/\s+/)[0] || 'Drive';
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '');
  return cleaned || 'Drive';
};

const randomSegment = (length) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => RANDOM_CHARS[b % RANDOM_CHARS.length]).join('');
};

/**
 * Default chauffeur password: company first word + random suffix (min 8 random chars).
 * Example: Drive PH Car Rentals → DriveK8m2Qx7p
 */
export const generateDriverPassword = (businessName) => {
  const prefix = getCompanyPasswordPrefix(businessName);
  return `${prefix}${randomSegment(8)}`;
};
