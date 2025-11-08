import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/catfacts
 * 
 * Real-world API integration: Cat Facts API (free, no API key)
 * Returns random cat facts
 * 
 * Query params:
 * - limit: number (default: 1, max: 332)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '1';
  
  try {
    const endpoint = `https://catfact.ninja/facts?limit=${limit}`;
    
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Cat Facts API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      source: 'Cat Facts API (catfact.ninja)',
      limit: parseInt(limit, 10),
      total: data.total || data.data?.length || 0,
      facts: data.data || [],
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch from Cat Facts API',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

