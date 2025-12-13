import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/hackernews
 *
 * Real-world API integration: Hacker News Search (Algolia) (free, no API key)
 *
 * Query params:
 * - q: string (default: 'aptos')
 * - tags: string (default: 'story')
 * - limit: number (default: 10, max: 50)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "aptos").trim();
  const tags = (searchParams.get("tags") ?? "story").trim();
  const limitRaw = searchParams.get("limit") ?? "10";

  const limitParsed = Number.parseInt(limitRaw, 10);
  const limit = Number.isFinite(limitParsed) ? Math.min(Math.max(limitParsed, 1), 50) : 10;

  try {
    const upstreamUrl = new URL("https://hn.algolia.com/api/v1/search");
    upstreamUrl.searchParams.set("query", q);
    upstreamUrl.searchParams.set("tags", tags);
    upstreamUrl.searchParams.set("hitsPerPage", String(limit));

    const response = await fetch(upstreamUrl.toString(), {
      headers: { "Accept": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HN Algolia returned ${response.status}`);
    }

    const data = await response.json();
    
    // Format HN search results for user-friendly display
    const hits = data.hits || [];
    
    return NextResponse.json({
      query: q,
      results: hits.map((hit: any) => ({
        title: hit.title,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        author: hit.author,
        points: hit.points,
        comments: hit.num_comments,
        createdAt: hit.created_at_i ? new Date(hit.created_at_i * 1000).toISOString() : hit.created_at,
        objectID: hit.objectID,
      })),
      totalResults: data.nbHits || 0,
      // Keep raw data for advanced use cases
      _raw: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch from HN search",
        message: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}


