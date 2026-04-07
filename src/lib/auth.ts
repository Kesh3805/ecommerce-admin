const AUTH_TOKEN_KEY = 'admin_access_token';
const AUTH_EXPIRY_KEY = 'admin_token_expiry';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
  
  if (!token || !expiry) return null;
  
  // Check if token is expired
  const expiryTime = parseInt(expiry, 10);
  if (Date.now() >= expiryTime) {
    clearAuthToken();
    return null;
  }
  
  return token;
}

export function setAuthToken(token: string, expiresIn?: string): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  
  // Parse expiresIn and store expiry timestamp
  // Supports formats like "30d", "24h", "3600s", or raw seconds
  if (expiresIn) {
    const expiryMs = parseExpiresIn(expiresIn);
    const expiryTime = Date.now() + expiryMs;
    localStorage.setItem(AUTH_EXPIRY_KEY, expiryTime.toString());
  } else {
    // Default to 30 days if not specified
    const defaultExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
    localStorage.setItem(AUTH_EXPIRY_KEY, defaultExpiry.toString());
  }
}

export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_EXPIRY_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAuthToken());
}

export function getTokenExpiryTime(): number | null {
  if (typeof window === 'undefined') return null;
  const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
  return expiry ? parseInt(expiry, 10) : null;
}

export function isTokenExpiringSoon(thresholdMs: number = 5 * 60 * 1000): boolean {
  const expiry = getTokenExpiryTime();
  if (!expiry) return true;
  return Date.now() + thresholdMs >= expiry;
}

function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([dhms]?)$/i);
  if (!match) {
    // Assume raw seconds if no unit
    const seconds = parseInt(expiresIn, 10);
    return isNaN(seconds) ? 30 * 24 * 60 * 60 * 1000 : seconds * 1000;
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
    case '':
      return value * 1000;
    default:
      return value * 1000;
  }
}
