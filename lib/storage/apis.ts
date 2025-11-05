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

// Base URL - works in both browser (DOM) and Node (SDK build) contexts
// Priority: NEXT_PUBLIC_BASE_URL > VERCEL_URL > localhost (dev only)
function getBaseUrl(): string {
  // 1. User-configured base URL (highest priority)
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // 2. Vercel automatically provides VERCEL_URL (e.g., "your-app.vercel.app")
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

const BASE_URL = getBaseUrl();

export const API_REGISTRY: ApiMetadata[] = [
  {
    id: 'weather',
    url: `${BASE_URL}/api/protected/weather`,
    name: 'Weather API',
    description: 'Get current weather data and forecasts for locations',
    category: 'Weather',
    cost: '10', // 0.00000001 APT in Octas
    method: 'GET',
  },
  {
    id: 'stocks',
    url: `${BASE_URL}/api/protected/stocks`,
    name: 'Stock Prices API',
    description: 'Get real-time stock market data and prices',
    category: 'Trading',
    cost: '1000000', // 0.01 APT
    method: 'GET',
  },
  {
    id: 'news',
    url: `${BASE_URL}/api/protected/news`,
    name: 'News API',
    description: 'Get latest news headlines and articles',
    category: 'AI',
    cost: '500000', // 0.005 APT
    method: 'GET',
  },
  {
    id: 'random',
    url: `${BASE_URL}/api/protected/random`,
    name: 'Random Data API',
    description: 'Get random data for testing purposes',
    category: 'Random',
    cost: '100000', // 0.001 APT
    method: 'GET',
  },
];

export function getAllApis(): ApiMetadata[] {
  return API_REGISTRY;
}

export function getApiById(id: string): ApiMetadata | null {
  return API_REGISTRY.find(api => api.id === id) || null;
}

export function getApisByCategory(category: ApiMetadata['category']): ApiMetadata[] {
  return API_REGISTRY.filter(api => api.category === category);
}

export function searchApis(query: string): ApiMetadata[] {
  const lowerQuery = query.toLowerCase();
  return API_REGISTRY.filter(
    api =>
      api.name.toLowerCase().includes(lowerQuery) ||
      api.description.toLowerCase().includes(lowerQuery) ||
      api.category.toLowerCase().includes(lowerQuery)
  );
}

