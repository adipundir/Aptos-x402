import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/holidays
 *
 * Real-world API integration: Nager.Date Public Holidays API (free, no API key)
 *
 * Query params:
 * - country: string (default: 'US') - ISO 3166-1 alpha-2 country code
 * - year: number (optional, default: current year) - year to get holidays for
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = (searchParams.get("country") || "US").toUpperCase().trim();
  const yearRaw = searchParams.get("year");

  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json(
      { error: "Invalid country code", message: "Country code must be 2 uppercase letters (e.g., US, IN, GB)" },
      { status: 400 },
    );
  }

  const currentYear = new Date().getFullYear();
  const year = yearRaw ? parseInt(yearRaw, 10) : currentYear;

  if (isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json(
      { error: "Invalid year", message: "Year must be between 2000 and 2100" },
      { status: 400 },
    );
  }

  try {
    const upstreamUrl = `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`;
    const response = await fetch(upstreamUrl, {
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Country not found", message: `No holiday data available for country code "${country}"` },
          { status: 404 },
        );
      }
      throw new Error(`Holidays API returned ${response.status}`);
    }

    const data = await response.json();
    const holidays = Array.isArray(data) ? data : [];

    // Format response
    return NextResponse.json({
      country,
      year,
      count: holidays.length,
      holidays: holidays.map((h: any) => ({
        date: h.date,
        name: h.name,
        localName: h.localName,
        countryCode: h.countryCode,
        fixed: h.fixed,
        global: h.global,
        counties: h.counties || null,
        launchYear: h.launchYear || null,
        types: h.types || [],
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch public holidays",
        message: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

