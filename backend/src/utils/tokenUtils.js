import crypto from 'crypto';

// Generate secure random token (hex string)
export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Generate token expiration date (hours in future)
export function generateTokenExpiry(hours = 24) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

// Check if token expired
export function isTokenExpired(expiryDate) {
  if (!expiryDate) return true;
  return new Date() > new Date(expiryDate);
}

// Hash a token (SHA-256)
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export default { generateToken, generateTokenExpiry, isTokenExpired, hashToken };
