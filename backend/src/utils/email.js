const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (email) => {
  return email.trim().toLowerCase();
};

export const isValidEmail = (email) => {
  return EMAIL_PATTERN.test(email);
};