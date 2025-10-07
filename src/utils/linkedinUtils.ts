/**
 * Utility functions for LinkedIn URL and ID handling
 */

/**
 * Extract LinkedIn username/ID from various LinkedIn URL formats
 * 
 * Supports formats like:
 * - https://www.linkedin.com/in/username
 * - https://linkedin.com/in/username/
 * - linkedin.com/in/username
 * - www.linkedin.com/in/username
 * 
 * @param url - LinkedIn profile URL
 * @returns LinkedIn username/ID or null if invalid
 */
export function extractLinkedInUsername(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    // Remove whitespace and convert to lowercase
    const cleanUrl = url.trim().toLowerCase();

    // Pattern to match LinkedIn profile URLs
    // Matches: linkedin.com/in/{username} with optional protocol, www, and trailing slash
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?/,
      /linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?/,
    ];

    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // If the input is just a username (no URL format), validate and return it
    if (/^[a-zA-Z0-9_-]+$/.test(cleanUrl) && !cleanUrl.includes('.')) {
      return cleanUrl;
    }

    return null;
  } catch (error) {
    console.error('Error extracting LinkedIn username:', error);
    return null;
  }
}

/**
 * Build a full LinkedIn profile URL from a username
 * 
 * @param username - LinkedIn username/ID
 * @returns Full LinkedIn profile URL
 */
export function buildLinkedInUrl(username: string): string {
  if (!username) {
    throw new Error('LinkedIn username is required');
  }

  const cleanUsername = username.trim().toLowerCase();
  return `https://www.linkedin.com/in/${cleanUsername}`;
}

/**
 * Validate if a string is a valid LinkedIn URL
 * 
 * @param url - URL to validate
 * @returns true if valid LinkedIn URL, false otherwise
 */
export function isValidLinkedInUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const username = extractLinkedInUsername(url);
  return username !== null;
}

/**
 * Normalize LinkedIn URL to standard format
 * 
 * @param url - LinkedIn URL to normalize
 * @returns Normalized LinkedIn URL or null if invalid
 */
export function normalizeLinkedInUrl(url: string): string | null {
  const username = extractLinkedInUsername(url);
  if (!username) {
    return null;
  }

  return buildLinkedInUrl(username);
}

/**
 * Extract LinkedIn ID from auth identity data
 * 
 * @param identityData - Identity data from OAuth provider
 * @returns LinkedIn ID or null
 */
export function extractLinkedInIdFromIdentity(identityData: any): string | null {
  if (!identityData) {
    return null;
  }

  // LinkedIn OAuth typically provides an 'id' or 'sub' field
  return identityData.id || identityData.sub || null;
}
