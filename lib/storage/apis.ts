/**
 * API Registry
 * Hardcoded catalog of available x402-protected APIs
 */

export interface ApiMetadata {
  id: string;
  url: string;
  name: string;
  description: string;
  category: 'AI' | 'Trading' | 'Utility' | 'Weather' | 'Search' | 'Random' | 'Conversion' | 'SEO' | 'Text';
  cost: string; // Cost in Octas
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  requiresAuth?: boolean;
  isExternal?: boolean; // True if API is hosted externally (absolute URL)
  available?: boolean; // True if API is currently available, false if unavailable
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

// DonaLabs API base URL
const DONALABS_BASE_URL = 'https://donalabs-apis.vercel.app';

// Local API metadata (URLs computed dynamically based on environment)
const LOCAL_API_METADATA: Omit<ApiMetadata, 'url'>[] = [
  {
    id: 'weather',
    name: 'Weather API',
    description: 'Get current weather data and forecasts for locations',
    category: 'Weather',
    cost: '10', // 0.00000001 APT in Octas
    method: 'GET',
    available: true,
  },
  {
    id: 'openmeteo',
    name: 'Open-Meteo Forecast',
    description: 'Real forecast + current conditions from Open-Meteo (free source, no API key)',
    category: 'Weather',
    cost: '25000', // 0.00025 APT
    method: 'GET',
    available: true,
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
  {
    id: 'hackernews',
    name: 'Hacker News Search',
    description: 'Search Hacker News stories via Algolia (free source, no API key)',
    category: 'Search',
    cost: '25000', // 0.00025 APT
    method: 'GET',
    available: true,
  },
  {
    id: 'worldtime',
    name: 'World Time',
    description: 'Get timezone-based time data from WorldTime API (free source, no API key)',
    category: 'Utility',
    cost: '20000', // 0.0002 APT
    method: 'GET',
    available: true,
  },
  {
    id: 'github',
    name: 'GitHub Repo Info',
    description: 'Fetch public GitHub repository metadata (free source; rate-limited by GitHub)',
    category: 'Utility',
    cost: '40000', // 0.0004 APT
    method: 'GET',
    available: true,
  },
  {
    id: 'exchangerate',
    name: 'Exchange Rates',
    description: 'Get real-time currency exchange rates (free source, no API key)',
    category: 'Utility',
    cost: '30000', // 0.0003 APT
    method: 'GET',
    available: true,
  },
  {
    id: 'jokes',
    name: 'Jokes API',
    description: 'Get random programming jokes and puns (free source, no API key)',
    category: 'Random',
    cost: '15000', // 0.00015 APT
    method: 'GET',
    available: true,
  },
  {
    id: 'quotes',
    name: 'Quotes API',
    description: 'Get inspirational quotes from famous authors (free source, no API key)',
    category: 'Text',
    cost: '20000', // 0.0002 APT
    method: 'GET',
    available: true,
  },
  {
    id: 'dictionary',
    name: 'Dictionary API',
    description: 'Get word definitions, pronunciations, and examples (free source, no API key)',
    category: 'Text',
    cost: '25000', // 0.00025 APT
    method: 'GET',
    available: true,
  },
  {
    id: 'ipgeolocation',
    name: 'IP Geolocation',
    description: 'Get location and ISP info from IP address (free source, no API key)',
    category: 'Utility',
    cost: '30000', // 0.0003 APT
    method: 'GET',
    available: true,
  },
  {
    id: 'holidays',
    name: 'Public Holidays',
    description: 'Get public holidays for any country and year (free source, no API key)',
    category: 'Utility',
    cost: '25000', // 0.00025 APT
    method: 'GET',
    available: true,
  },
];

// DonaLabs External APIs (x402-powered, hosted at donalabs-apis.vercel.app)
// Pricing: Simple 0.001 APT, Medium 0.005 APT, Complex 0.01 APT (testnet)
// NOTE: Currently unavailable - marked as unavailable in UI
const DONALABS_APIS: ApiMetadata[] = [
  {
    id: 'donalabs-translate',
    url: `${DONALABS_BASE_URL}/api/translate`,
    name: 'Translator',
    description: 'Multi-language translation with context awareness',
    category: 'Text',
    cost: '500000', // 0.005 APT
    method: 'POST',
    isExternal: true,
    available: false,
  },
  {
    id: 'donalabs-prompt',
    url: `${DONALABS_BASE_URL}/api/prompt`,
    name: 'Prompt Enhancer',
    description: 'Supercharge your AI prompts for better results',
    category: 'AI',
    cost: '100000', // 0.001 APT
    method: 'POST',
    isExternal: true,
    available: false,
  },
  {
    id: 'donalabs-markdown',
    url: `${DONALABS_BASE_URL}/api/markdown`,
    name: 'Markdown Converter',
    description: 'Transform Markdown to HTML, PDF or images',
    category: 'Conversion',
    cost: '500000', // 0.005 APT
    method: 'POST',
    isExternal: true,
    available: false,
  },
  {
    id: 'donalabs-yamljson',
    url: `${DONALABS_BASE_URL}/api/yamljson`,
    name: 'Config Converter',
    description: 'Convert between YAML, JSON, and TOML formats',
    category: 'Conversion',
    cost: '100000', // 0.001 APT
    method: 'POST',
    isExternal: true,
    available: false,
  },
  {
    id: 'donalabs-htmlpdf',
    url: `${DONALABS_BASE_URL}/api/htmlpdf`,
    name: 'HTML to PDF',
    description: 'Render any HTML page as a perfect PDF document',
    category: 'Conversion',
    cost: '1000000', // 0.01 APT
    method: 'POST',
    isExternal: true,
    available: false,
  },
  {
    id: 'donalabs-pdfword',
    url: `${DONALABS_BASE_URL}/api/pdfword`,
    name: 'PDF & Word Converter',
    description: 'Convert PDF to DOCX and back seamlessly',
    category: 'Conversion',
    cost: '1000000', // 0.01 APT
    method: 'POST',
    isExternal: true,
    available: false,
  },
  {
    id: 'donalabs-ebook',
    url: `${DONALABS_BASE_URL}/api/ebook`,
    name: 'E-Book Converter',
    description: 'EPUB ↔ MOBI ↔ PDF conversions with high fidelity',
    category: 'Conversion',
    cost: '1000000', // 0.01 APT
    method: 'POST',
    isExternal: true,
    available: false,
  },
  {
    id: 'donalabs-latex',
    url: `${DONALABS_BASE_URL}/api/latex`,
    name: 'LaTeX Processor',
    description: 'Tables to LaTeX, compile beautiful PDFs',
    category: 'Conversion',
    cost: '1000000', // 0.01 APT
    method: 'POST',
    isExternal: true,
    available: false,
  },
  {
    id: 'donalabs-seo-keywords',
    url: `${DONALABS_BASE_URL}/api/seo/keywords`,
    name: 'SEO Keywords',
    description: 'Analyze keyword density and optimization for any text',
    category: 'SEO',
    cost: '500000', // 0.005 APT
    method: 'POST',
    isExternal: true,
    available: false,
  },
  {
    id: 'donalabs-seo-domain',
    url: `${DONALABS_BASE_URL}/api/seo/domain`,
    name: 'Domain Analytics',
    description: 'Get comprehensive SEO metrics for any domain',
    category: 'SEO',
    cost: '500000', // 0.005 APT
    method: 'POST',
    isExternal: true,
    available: false,
  },
  {
    id: 'donalabs-podcast',
    url: `${DONALABS_BASE_URL}/api/podcast`,
    name: 'Podcast Chapters',
    description: 'Auto-generate chapters from podcast transcripts',
    category: 'AI',
    cost: '1000000', // 0.01 APT
    method: 'POST',
    isExternal: true,
    available: false,
  },
  {
    id: 'donalabs-git-diff',
    url: `${DONALABS_BASE_URL}/api/git/diff`,
    name: 'Git Diff Analyzer',
    description: 'Analyze git diffs with AI-powered insights',
    category: 'AI',
    cost: '500000', // 0.005 APT
    method: 'POST',
    isExternal: true,
    available: false,
  },
  {
    id: 'donalabs-health',
    url: `${DONALABS_BASE_URL}/api/health`,
    name: 'Health Check',
    description: 'Check DonaLabs API service status',
    category: 'Utility',
    cost: '100000', // 0.001 APT
    method: 'GET',
    isExternal: true,
    available: false,
  },
  {
    id: 'donalabs-text',
    url: `${DONALABS_BASE_URL}/api/text`,
    name: 'Text Operations',
    description: 'Various text manipulation and analysis operations',
    category: 'Text',
    cost: '100000', // 0.001 APT
    method: 'POST',
    isExternal: true,
    available: false,
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
  
  // Build local APIs with dynamic base URL
  const localApis: ApiMetadata[] = LOCAL_API_METADATA.map(api => ({
    ...api,
    url: `${baseUrl}/api/protected/${api.id}`,
    isExternal: false,
  }));
  
  // Combine local APIs with external DonaLabs APIs
  const registry = [...localApis, ...DONALABS_APIS];
  
  console.log('[API Registry] Generated URLs:', registry.map(api => ({ id: api.id, url: api.url, isExternal: api.isExternal })));
  
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

