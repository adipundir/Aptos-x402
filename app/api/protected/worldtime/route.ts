import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/worldtime
 *
 * Real-world API integration: WorldTime API (free, no API key)
 *
 * Query params:
 * - tz: string (default: 'Etc/UTC')
 *
 * Notes:
 * - tz must be a valid timezone path segment supported by worldtimeapi.org
 *   e.g. 'Etc/UTC', 'America/New_York', 'Europe/London'
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tz = (searchParams.get("tz") ?? "Etc/UTC").trim();

  // Basic allowlist to avoid path injection. We still encode below.
  if (!/^[A-Za-z0-9_+\-\/]+$/.test(tz)) {
    return NextResponse.json(
      { error: "Invalid timezone", message: "tz contains unsupported characters" },
      { status: 400 },
    );
  }

  try {
    const upstreamUrl = `https://worldtimeapi.org/api/timezone/${encodeURIComponent(tz).replaceAll("%2F", "/")}`;
    const response = await fetch(upstreamUrl, {
      headers: { "Accept": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`WorldTime API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Format timezone data for user-friendly display
    return NextResponse.json({
      timezone: data.timezone || tz,
      datetime: data.datetime,
      date: data.datetime?.split('T')[0],
      time: data.datetime?.split('T')[1]?.split('.')[0],
      dayOfWeek: data.day_of_week,
      dayOfYear: data.day_of_year,
      weekNumber: data.week_number,
      abbreviation: data.abbreviation,
      utcOffset: data.utc_offset,
      // Keep raw data for advanced use cases
      _raw: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch from WorldTime API",
        message: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}


