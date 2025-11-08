import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/jsonplaceholder
 * 
 * Real-world API integration: JSONPlaceholder (free, no API key)
 * Returns posts, users, or todos based on query params
 * 
 * Query params:
 * - type: 'posts' | 'users' | 'todos' | 'comments' (default: 'posts')
 * - limit: number (optional, limits results)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'posts';
  const limit = searchParams.get('limit');
  
  const baseUrl = 'https://jsonplaceholder.typicode.com';
  let endpoint = `${baseUrl}/${type}`;
  
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`JSONPlaceholder API returned ${response.status}`);
    }
    
    let data = await response.json();
    
    // Apply limit if specified
    if (limit && Array.isArray(data)) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        data = data.slice(0, limitNum);
      }
    }
    
    return NextResponse.json({
      source: 'JSONPlaceholder',
      type,
      count: Array.isArray(data) ? data.length : 1,
      data,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch from JSONPlaceholder',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

