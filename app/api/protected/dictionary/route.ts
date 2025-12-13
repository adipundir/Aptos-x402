import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/dictionary
 *
 * Real-world API integration: Free Dictionary API (free, no API key)
 *
 * Query params:
 * - word: string (required) - word to look up
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get("word")?.trim().toLowerCase();

  if (!word) {
    return NextResponse.json(
      { error: "Missing parameter", message: "Word parameter is required" },
      { status: 400 },
    );
  }

  if (!/^[a-zA-Z-]+$/.test(word)) {
    return NextResponse.json(
      { error: "Invalid word", message: "Word must contain only letters and hyphens" },
      { status: 400 },
    );
  }

  try {
    const upstreamUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const response = await fetch(upstreamUrl, {
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Word not found", message: `No definition found for "${word}"` },
          { status: 404 },
        );
      }
      throw new Error(`Dictionary API returned ${response.status}`);
    }

    const data = await response.json();
    const entries = Array.isArray(data) ? data : [data];

    // Format response
    const result = {
      word: entries[0]?.word || word,
      phonetic: entries[0]?.phonetic || entries[0]?.phonetics?.[0]?.text,
      meanings: entries.flatMap((entry: any) =>
        entry.meanings?.map((meaning: any) => ({
          partOfSpeech: meaning.partOfSpeech,
          definitions: meaning.definitions?.slice(0, 5).map((def: any) => ({
            definition: def.definition,
            example: def.example,
            synonyms: def.synonyms?.slice(0, 5) || [],
            antonyms: def.antonyms?.slice(0, 5) || [],
          })) || [],
          synonyms: meaning.synonyms?.slice(0, 10) || [],
          antonyms: meaning.antonyms?.slice(0, 10) || [],
        })) || [],
      ),
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch dictionary data",
        message: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

