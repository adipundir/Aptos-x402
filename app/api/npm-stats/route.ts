import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface NpmDownloads {
  downloads: number;
  start: string;
  end: string;
  package: string;
}

interface NpmPackageData {
  'dist-tags': {
    latest: string;
  };
  time: {
    created: string;
    modified: string;
  };
}

export async function GET() {
  try {
    const packageName = 'aptos-x402';
    
    // Fetch download stats for the last week
    const downloadsResponse = await fetch(
      `https://api.npmjs.org/downloads/point/last-week/${packageName}`,
      { 
        cache: 'no-store', // Don't cache during development
        headers: {
          'User-Agent': 'aptos-x402-stats'
        }
      }
    );
    
    let downloads = 150; // Default fallback (will show as "200+" due to threshold)
    
    if (downloadsResponse.ok) {
      const downloadsData: NpmDownloads = await downloadsResponse.json();
      downloads = downloadsData.downloads;
    }
    
    // Fetch package metadata
    const packageResponse = await fetch(
      `https://registry.npmjs.org/${packageName}`,
      { 
        cache: 'no-store',
        headers: {
          'User-Agent': 'aptos-x402-stats'
        }
      }
    );
    
    let version = '1.0.1';
    let created = new Date().toISOString();
    let modified = new Date().toISOString();
    
    if (packageResponse.ok) {
      const packageData: NpmPackageData = await packageResponse.json();
      version = packageData['dist-tags'].latest;
      created = packageData.time.created;
      modified = packageData.time.modified;
    }
    
    return NextResponse.json({
      downloads,
      version,
      created,
      modified,
    });
  } catch (error) {
    console.error('Error fetching NPM stats:', error);
    
    // Return fallback data
    return NextResponse.json({
      downloads: 200,
      version: '1.0.1',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    });
  }
}
