/**
 * User ID Management
 * Generates and stores a persistent UUID for each browser
 * 
 * NOTE: This is client-side only. For server-side usage, use headers.
 */

const USER_ID_KEY = 'aptos-x402-user-id';

/**
 * Get or create a user ID stored in localStorage
 * Returns a UUID that persists across page reloads
 */
export function getUserId(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    // Server-side: return a default (shouldn't happen in client components)
    return 'default-user';
  }

  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    // Generate a new UUID v4
    userId = generateUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  // Simple UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get headers with user ID for API requests
 */
export function getUserIdHeaders(): Record<string, string> {
  const userId = getUserId();
  return {
    'x-user-id': userId,
  };
}

/**
 * Reset user ID (useful for testing or logout)
 */
export function resetUserId(): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(USER_ID_KEY);
  }
}

