import { NextResponse } from 'next/server';
import { getAllApis, getApisByCategory, searchApis } from '@/lib/storage/apis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let apis = getAllApis();

    if (category) {
      apis = getApisByCategory(category as any);
    }

    if (search) {
      apis = searchApis(search);
    }

    return NextResponse.json({ apis });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch APIs' },
      { status: 500 }
    );
  }
}


