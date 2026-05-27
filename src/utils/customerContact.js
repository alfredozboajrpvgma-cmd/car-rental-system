/** Validate customer contact fields (profile / booking gate). */
export const validateCustomerContactFields = ({ firstName, lastName, phone, address }) => {
  const errors = {};

  if (!firstName?.trim()) {
    errors.firstName = 'First name is required.';
  }
  if (!lastName?.trim()) {
    errors.lastName = 'Last name is required.';
  }

  const phoneTrim = (phone || '').trim();
  if (!phoneTrim) {
    errors.phone = 'Phone number is required.';
  } else if (phoneTrim.replace(/\D/g, '').length < 10) {
    errors.phone = 'Enter a valid phone number (at least 10 digits).';
  }

  const addressTrim = (address || '').trim();
  if (!addressTrim) {
    errors.address = 'Address is required.';
  } else if (addressTrim.length < 5) {
    errors.address = 'Please enter your full address.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

export const splitCustomerName = (fullName) => {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
};

export const isCustomerContactComplete = (user) => {
  if (!user) return false;
  const { firstName, lastName } = splitCustomerName(user.name);
  return validateCustomerContactFields({
    firstName,
    lastName,
    phone: user.phone,
    address: user.address,
  }).valid;
};

export const getCustomerContactMissingMessage = (user) => {
  if (!user) return 'Please complete your contact information on your profile.';
  const { firstName, lastName } = splitCustomerName(user.name);
  const { errors } = validateCustomerContactFields({
    firstName,
    lastName,
    phone: user.phone,
    address: user.address,
  });
  const labels = {
    firstName: 'first name',
    lastName: 'last name',
    phone: 'phone number',
    address: 'address',
  };
  const missing = Object.keys(errors).map((k) => labels[k] || k);
  if (missing.length === 0) return '';
  return `Please add your ${missing.join(', ')} on your profile before booking.`;
};
