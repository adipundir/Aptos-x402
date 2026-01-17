/**
 * User ID Management
 * Generates and stores a persistent UUID for each browser
 * 
 * NOTE: This is client-side only. For server-side usage, use headers.
 */

const USER_ID_KEY = 'aptos-x402-user-id';
export const USER_ID_COOKIE = 'aptos-x402-user-id';
const COOKIE_MAX_AGE_DAYS = 365;

/**
 * Get or create a user ID stored in localStorage
 * Returns a UUID that persists across page reloads
 */
export function getUserId(): string {
  if (typeof window === 'undefined') {
    return 'default-user';
  }

  let userId = getCookie(USER_ID_COOKIE) || getFromLocalStorage();

  if (!userId) {
    userId = generateUUID();
  }

  persistUserId(userId);

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
    'user-id': userId,
  };
}

/**
 * Reset user ID (useful for testing or logout)
 */
export function resetUserId(): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(USER_ID_KEY);
  }

  if (typeof document !== 'undefined') {
    document.cookie = `${USER_ID_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  }
}

function getFromLocalStorage(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(USER_ID_KEY);
  } catch {
    return null;
  }
}

function persistUserId(userId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(USER_ID_KEY, userId);
    } catch {
      // ignore write errors
    }
  }

  setCookie(USER_ID_COOKIE, userId, COOKIE_MAX_AGE_DAYS);
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') {
    return;
  }

  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  const encodedValue = encodeURIComponent(value);
  document.cookie = `${name}=${encodedValue}; expires=${expires}; path=/; SameSite=Lax`;
}

