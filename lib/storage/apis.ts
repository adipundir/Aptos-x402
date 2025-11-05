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
// Priority: NEXT_PUBLIC_BASE_URL > VERCEL_URL > localhost (dev only)
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
  
  // 3. In browser/client context, use window.location
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  
  // 4. Fallback to localhost for local development
  return 'http://localhost:3000';
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
    id: 'stocks',
    name: 'Stock Prices API',
    description: 'Get real-time stock market data and prices',
    category: 'Trading',
    cost: '1000000', // 0.01 APT
    method: 'GET',
  },
  {
    id: 'news',
    name: 'News API',
    description: 'Get latest news headlines and articles',
    category: 'AI',
    cost: '500000', // 0.005 APT
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
];

// Helper to get API registry with dynamically computed URLs
function getApiRegistry(): ApiMetadata[] {
  const baseUrl = getBaseUrl();
  console.log('[API Registry] Base URL resolved:', baseUrl);
  console.log('[API Registry] Environment check:', {
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL ? 'set' : 'not set',
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'set' : 'not set',
    VERCEL_URL: process.env.VERCEL_URL ? `set (${process.env.VERCEL_URL})` : 'not set',
    hasWindow: typeof window !== 'undefined',
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

export function getAllApis(): ApiMetadata[] {
  // Always recompute URLs at runtime to handle serverless environments
  return getApiRegistry();
}

export function getApiById(id: string): ApiMetadata | null {
  // Always recompute URLs at runtime to handle serverless environments
  return getApiRegistry().find(api => api.id === id) || null;
}

export function getApisByCategory(category: ApiMetadata['category']): ApiMetadata[] {
  // Always recompute URLs at runtime to handle serverless environments
  return getApiRegistry().filter(api => api.category === category);
}

export function searchApis(query: string): ApiMetadata[] {
  // Always recompute URLs at runtime to handle serverless environments
  const lowerQuery = query.toLowerCase();
  return getApiRegistry().filter(
    api =>
      api.name.toLowerCase().includes(lowerQuery) ||
      api.description.toLowerCase().includes(lowerQuery) ||
      api.category.toLowerCase().includes(lowerQuery)
  );
}

