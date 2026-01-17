import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FALLBACK = {
  downloads: 200,
  version: '0.2.0',
  created: '2024-01-01T00:00:00.000Z',
  modified: new Date().toISOString(),
};

export async function GET() {
  const packageName = 'aptos-x402';
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    const [downloads, pkg] = await Promise.allSettled([
      fetch(`https://api.npmjs.org/downloads/point/last-week/${packageName}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'aptos-x402' }
      }).then(r => r.ok ? r.json() : null),
      
      fetch(`https://registry.npmjs.org/${packageName}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'aptos-x402' }
      }).then(r => r.ok ? r.json() : null),
    ]);
    
    clearTimeout(timeout);
    
    return NextResponse.json({
      downloads: downloads.status === 'fulfilled' && downloads.value?.downloads 
        ? downloads.value.downloads 
        : FALLBACK.downloads,
      version: pkg.status === 'fulfilled' && pkg.value?.['dist-tags']?.latest
        ? pkg.value['dist-tags'].latest
        : FALLBACK.version,
      created: pkg.status === 'fulfilled' && pkg.value?.time?.created
        ? pkg.value.time.created
        : FALLBACK.created,
      modified: pkg.status === 'fulfilled' && pkg.value?.time?.modified
        ? pkg.value.time.modified
        : FALLBACK.modified,
    });
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
