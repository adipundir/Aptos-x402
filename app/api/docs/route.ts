import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const docPath = searchParams.get('path');

  if (!docPath) {
    return NextResponse.json({ error: 'No path provided' }, { status: 400 });
  }

  try {
    // Read the markdown file from the docs directory
    const fullPath = join(process.cwd(), 'docs', docPath);
    const content = await readFile(fullPath, 'utf-8');
    
    // Add cache headers to improve performance
    return NextResponse.json({ content }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error reading doc:', error);
    return NextResponse.json(
      { error: 'Failed to read documentation file' },
      { status: 500 }
    );
  }
}

