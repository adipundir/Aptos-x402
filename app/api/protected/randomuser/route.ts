import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/randomuser
 * 
 * Real-world API integration: Random User API (free, no API key)
 * Returns random user profiles with realistic data
 * 
 * Query params:
 * - results: number (default: 1, max: 5000)
 * - gender: 'male' | 'female' (optional)
 * - nationality: string (optional, e.g., 'us', 'gb', 'fr')
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const results = searchParams.get('results') || '1';
  const gender = searchParams.get('gender');
  const nationality = searchParams.get('nationality');
  
  try {
    let endpoint = `https://randomuser.me/api/?results=${results}`;
    
    if (gender) {
      endpoint += `&gender=${gender}`;
    }
    
    if (nationality) {
      endpoint += `&nat=${nationality}`;
    }
    
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Random User API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      source: 'Random User API (randomuser.me)',
      results: parseInt(results, 10),
      gender: gender || 'any',
      nationality: nationality || 'any',
      users: data.results || [],
      info: data.info || {},
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch from Random User API',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

