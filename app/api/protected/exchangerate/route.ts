import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/exchangerate
 *
 * Real-world API integration: ExchangeRate-API (free, no API key)
 *
 * Query params:
 * - base: string (default: 'USD') - base currency code
 * - target: string (optional) - target currency code for conversion
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const base = (searchParams.get("base") ?? "USD").toUpperCase().trim();
  const target = searchParams.get("target")?.toUpperCase().trim();

  if (!/^[A-Z]{3}$/.test(base) || (target && !/^[A-Z]{3}$/.test(target))) {
    return NextResponse.json(
      { error: "Invalid currency code", message: "Currency codes must be 3 uppercase letters (e.g., USD, EUR)" },
      { status: 400 },
    );
  }

  try {
    const upstreamUrl = `https://api.exchangerate-api.com/v4/latest/${base}`;
    const response = await fetch(upstreamUrl, {
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`ExchangeRate API returned ${response.status}`);
    }

    const data = await response.json();

    // Format response
    const result: any = {
      base: data.base,
      date: data.date,
      rates: data.rates,
    };

    // If target specified, show conversion
    if (target && data.rates[target]) {
      result.conversion = {
        from: base,
        to: target,
        rate: data.rates[target],
        example: `1 ${base} = ${data.rates[target]} ${target}`,
      };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch exchange rates",
        message: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

