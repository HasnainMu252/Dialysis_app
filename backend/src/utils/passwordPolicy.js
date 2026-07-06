import { ApiError } from './apiError.js';

/**
 * Enforce a reasonable password policy for PHI systems:
 * at least 8 chars, with upper, lower, number and symbol.
 * Throws ApiError(400) if the password is too weak.
 */
export const assertStrongPassword = (password) => {
  const value = String(password || '');
  const problems = [];
  if (value.length < 8) problems.push('at least 8 characters');
  if (!/[a-z]/.test(value)) problems.push('a lowercase letter');
  if (!/[A-Z]/.test(value)) problems.push('an uppercase letter');
  if (!/[0-9]/.test(value)) problems.push('a number');
  if (!/[^A-Za-z0-9]/.test(value)) problems.push('a symbol');
  if (problems.length) {
    throw new ApiError(400, `Password must contain ${problems.join(', ')}.`);
  }
  return true;
};
