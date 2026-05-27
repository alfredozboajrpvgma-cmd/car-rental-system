const PLACEHOLDER_FIRST_NAMES = /^(test|asdf|qwerty|xxx+|driver\d*|user\d*|admin|guest|null|undefined)$/i;

/**
 * First name for greetings; rejects empty, test junk, and keyboard-mash strings.
 */
export const sanitizeFirstName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') return null;

  const first = fullName.trim().split(/\s+/)[0];
  if (!first || first.length < 2 || first.length > 24) return null;
  if (PLACEHOLDER_FIRST_NAMES.test(first)) return null;
  if (!/^[a-zA-Z][a-zA-Z'-]*$/.test(first)) return null;

  const vowels = (first.match(/[aeiouAEIOU]/g) || []).length;
  if (first.length >= 4 && vowels / first.length < 0.2) return null;

  const unique = new Set(first.toLowerCase().replace(/[^a-z]/g, ''));
  if (first.length >= 5 && unique.size <= 3) return null;

  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

export const getDriverGreetingName = (driver, currentUser, fallback = 'Driver') => {
  const fromDriver = sanitizeFirstName(driver?.name);
  if (fromDriver) return fromDriver;

  const fromUser = sanitizeFirstName(currentUser?.name)
    || sanitizeFirstName(currentUser?.displayName);
  if (fromUser) return fromUser;

  return fallback;
};
