import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/jokes
 *
 * Real-world API integration: Official Joke API (free, no API key)
 *
 * Query params:
 * - type: string (optional) - 'programming', 'general', 'knock-knock', 'dad'
 * - count: number (optional, default: 1, max: 10) - number of jokes
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type")?.toLowerCase() || "random";
  const countRaw = searchParams.get("count") || "1";

  const count = Math.min(Math.max(parseInt(countRaw, 10) || 1, 1), 10);

  const validTypes = ["programming", "general", "knock-knock", "dad", "random"];
  const jokeType = validTypes.includes(type) ? type : "random";

  try {
    const jokes = [];
    for (let i = 0; i < count; i++) {
      const endpoint = jokeType === "random"
        ? "https://official-joke-api.appspot.com/random_joke"
        : `https://official-joke-api.appspot.com/jokes/${jokeType}/random`;

      const response = await fetch(endpoint, {
        headers: { "Accept": "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Jokes API returned ${response.status}`);
      }

      const joke = await response.json();
      jokes.push({
        id: joke.id,
        type: joke.type || jokeType,
        setup: joke.setup,
        punchline: joke.punchline,
      });
    }

    return NextResponse.json({
      count: jokes.length,
      type: jokeType,
      jokes,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch jokes",
        message: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

