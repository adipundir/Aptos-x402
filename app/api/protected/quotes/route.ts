import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/quotes
 *
 * Real-world API integration: Quotable API (free, no API key)
 *
 * Query params:
 * - limit: number (optional, default: 1, max: 20) - number of quotes
 * - tags: string (optional) - filter by tags (comma-separated)
 * - author: string (optional) - filter by author name
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit") || "1";
  const tags = searchParams.get("tags");
  const author = searchParams.get("author");

  const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 1, 1), 20);

  try {
    const url = new URL("https://api.quotable.io/quotes/random");
    url.searchParams.set("limit", String(limit));
    if (tags) url.searchParams.set("tags", tags);
    if (author) url.searchParams.set("author", author);

    const response = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Quotable API returned ${response.status}`);
    }

    const data = await response.json();
    const quotes = Array.isArray(data) ? data : [data];

    return NextResponse.json({
      count: quotes.length,
      quotes: quotes.map((q: any) => ({
        id: q._id,
        content: q.content,
        author: q.author,
        tags: q.tags || [],
        length: q.length,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch quotes",
        message: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

