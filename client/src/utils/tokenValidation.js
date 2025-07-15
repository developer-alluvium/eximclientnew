/**
 * Utility functions for token validation
 */

/**
 * Decode JWT token without verification (for client-side expiration check)
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded token payload or null if invalid
 */
const decodeToken = (token) => {
  try {
    if (!token) return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if token is expired or invalid
 */
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};

/**
 * Format time remaining in human readable format
 * @param {number} seconds - Seconds remaining
 * @returns {string} - Formatted time string
 */
const formatTimeRemaining = (seconds) => {
  if (seconds <= 0) return '0 minutes';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};
