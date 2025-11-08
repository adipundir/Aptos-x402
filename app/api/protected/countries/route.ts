import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/countries
 * 
 * Real-world API integration: REST Countries API (free, no API key)
 * Returns country information
 * 
 * Query params:
 * - name: string (optional, country name to search)
 * - code: string (optional, country code like 'us', 'gb')
 * - region: string (optional, filter by region)
 * - fields: string (optional, comma-separated fields to include)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const code = searchParams.get('code');
  const region = searchParams.get('region');
  const fields = searchParams.get('fields');
  
  try {
    let endpoint = 'https://restcountries.com/v3.1';
    
    if (name) {
      endpoint = `${endpoint}/name/${name}`;
    } else if (code) {
      endpoint = `${endpoint}/alpha/${code}`;
    } else if (region) {
      endpoint = `${endpoint}/region/${region}`;
    } else {
      // Get all countries
      endpoint = `${endpoint}/all`;
    }
    
    // Add fields filter if specified
    if (fields) {
      endpoint += `?fields=${fields}`;
    }
    
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`REST Countries API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // If single country (object), wrap in array for consistency
    const countries = Array.isArray(data) ? data : [data];
    
    return NextResponse.json({
      source: 'REST Countries API (restcountries.com)',
      query: { name, code, region },
      count: countries.length,
      countries,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch from REST Countries API',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

