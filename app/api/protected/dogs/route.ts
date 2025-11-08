import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/dogs
 * 
 * Real-world API integration: Dog API (free, no API key)
 * Returns random dog images and breed information
 * 
 * Query params:
 * - breed: string (optional, specific breed name)
 * - count: number (default: 1, max: 50)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const breed = searchParams.get('breed');
  const count = searchParams.get('count') || '1';
  
  try {
    let endpoint = 'https://dog.ceo/api';
    
    // If breed specified, get random image from that breed
    if (breed) {
      endpoint = `${endpoint}/breed/${breed}/images/random/${count}`;
    } else {
      // Get random dog image(s)
      endpoint = `${endpoint}/breeds/image/random/${count}`;
    }
    
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Dog API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      source: 'Dog API (dog.ceo)',
      breed: breed || 'random',
      count: parseInt(count, 10),
      data,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch from Dog API',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

