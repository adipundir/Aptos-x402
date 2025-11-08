/**
 * API Registry
 * Hardcoded catalog of available x402-protected APIs
 */

export interface ApiMetadata {
  id: string;
  url: string;
  name: string;
  description: string;
  category: 'AI' | 'Trading' | 'Utility' | 'Weather' | 'Search' | 'Random';
  cost: string; // Cost in Octas
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  requiresAuth?: boolean;
}

// Base URL - computed dynamically at runtime to handle Vercel serverless environment
// Priority: NEXT_PUBLIC_BASE_URL > VERCEL_URL > PORT detection > localhost (dev only)
function getBaseUrl(): string {
  // 1. User-configured base URL (highest priority)
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // 2. Vercel automatically provides VERCEL_URL (e.g., "your-app.vercel.app")
  // Also check VERCEL_PROJECT_PRODUCTION_URL for production deployments
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // 3. In browser/client context, use window.location (always correct)
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  
  // 4. Server-side: Try to detect port from various sources
  // Next.js doesn't always set PORT when auto-selecting ports
  // Check common Next.js dev server ports
  const port = process.env.PORT || 
               process.env.NEXT_PORT || 
               (process.env.NODE_ENV === 'development' ? '3001' : '3000'); // Default to 3001 in dev (common when 3000 is taken)
  return `http://localhost:${port}`;
}

// Base API metadata without URLs (URLs computed dynamically)
const API_METADATA: Omit<ApiMetadata, 'url'>[] = [
  {
    id: 'weather',
    name: 'Weather API',
    description: 'Get current weather data and forecasts for locations',
    category: 'Weather',
    cost: '10', // 0.00000001 APT in Octas
    method: 'GET',
  },
  {
    id: 'random',
    name: 'Random Data API',
    description: 'Get random data for testing purposes',
    category: 'Random',
    cost: '100000', // 0.001 APT
    method: 'GET',
  },
  {
    id: 'jsonplaceholder',
    name: 'JSONPlaceholder API',
    description: 'Get posts, users, todos, and comments from JSONPlaceholder (free API)',
    category: 'Utility',
    cost: '50000', // 0.0005 APT
    method: 'GET',
  },
  {
    id: 'dogs',
    name: 'Dog API',
    description: 'Get random dog images and breed information (free API)',
    category: 'Utility',
    cost: '30000', // 0.0003 APT
    method: 'GET',
  },
  {
    id: 'catfacts',
    name: 'Cat Facts API',
    description: 'Get random cat facts (free API)',
    category: 'Utility',
    cost: '20000', // 0.0002 APT
    method: 'GET',
  },
  {
    id: 'randomuser',
    name: 'Random User API',
    description: 'Get realistic random user profiles (free API)',
    category: 'Utility',
    cost: '40000', // 0.0004 APT
    method: 'GET',
  },
  {
    id: 'countries',
    name: 'Countries API',
    description: 'Get country information and data (free API)',
    category: 'Utility',
    cost: '60000', // 0.0006 APT
    method: 'GET',
  },
];

// Helper to get API registry with dynamically computed URLs
function getApiRegistry(baseUrlOverride?: string): ApiMetadata[] {
  const baseUrl = baseUrlOverride || getBaseUrl();
  console.log('[API Registry] Base URL resolved:', baseUrl);
  console.log('[API Registry] Environment check:', {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ? 'set' : 'not set',
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'set' : 'not set',
    VERCEL_URL: process.env.VERCEL_URL ? `set (${process.env.VERCEL_URL})` : 'not set',
    PORT: process.env.PORT || 'not set',
    hasWindow: typeof window !== 'undefined',
    baseUrlOverride: baseUrlOverride || 'none',
  });
  
  const registry = API_METADATA.map(api => ({
    ...api,
    url: `${baseUrl}/api/protected/${api.id}`,
  }));
  
  console.log('[API Registry] Generated URLs:', registry.map(api => ({ id: api.id, url: api.url })));
  
  return registry;
}

// Export registry as a getter function to ensure URLs are computed at runtime
export const API_REGISTRY: ApiMetadata[] = getApiRegistry();

export function getAllApis(baseUrl?: string): ApiMetadata[] {
  // Always recompute URLs at runtime to handle serverless environments
  return getApiRegistry(baseUrl);
}

export function getApiById(id: string, baseUrl?: string): ApiMetadata | null {
  // Always recompute URLs at runtime to handle serverless environments
  return getApiRegistry(baseUrl).find(api => api.id === id) || null;
}

export function getApisByCategory(category: ApiMetadata['category'], baseUrl?: string): ApiMetadata[] {
  // Always recompute URLs at runtime to handle serverless environments
  return getApiRegistry(baseUrl).filter(api => api.category === category);
}

export function searchApis(query: string, baseUrl?: string): ApiMetadata[] {
  // Always recompute URLs at runtime to handle serverless environments
  const lowerQuery = query.toLowerCase();
  return getApiRegistry(baseUrl).filter(
    api =>
      api.name.toLowerCase().includes(lowerQuery) ||
      api.description.toLowerCase().includes(lowerQuery) ||
      api.category.toLowerCase().includes(lowerQuery)
  );
}

