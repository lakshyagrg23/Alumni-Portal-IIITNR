const crypto = require('crypto');

/**
 * Token Utilities for generating secure tokens and managing expiration
 */

/**
 * Generate secure random token
 * @param {number} length - Token length in bytes (default 32)
 * @returns {string} - Hexadecimal token (64 characters for 32 bytes)
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate token expiration date
 * @param {number} hours - Hours until expiration (default 24)
 * @returns {Date} - Expiration date
 */
const generateTokenExpiry = (hours = 24) => {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
};

/**
 * Check if token has expired
 * @param {Date} expiryDate - Token expiration date
 * @returns {boolean} - True if expired, false otherwise
 */
const isTokenExpired = (expiryDate) => {
  if (!expiryDate) return true;
  return new Date() > new Date(expiryDate);
};

/**
 * Hash a token (for storing sensitive tokens)
 * @param {string} token - Token to hash
 * @returns {string} - SHA-256 hash of the token
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  generateToken,
  generateTokenExpiry,
  isTokenExpired,
  hashToken,
};
