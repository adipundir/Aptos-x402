import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/ipgeolocation
 *
 * Real-world API integration: IPAPI.co (free, no API key, rate limited)
 *
 * Query params:
 * - ip: string (optional) - IP address to lookup (defaults to request IP)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let ip = searchParams.get("ip")?.trim();

  // If no IP provided, try to get from request headers
  if (!ip) {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    ip = forwarded?.split(",")[0].trim() || realIp || "8.8.8.8"; // Default to Google DNS for demo
  }

  // Basic IP validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
    return NextResponse.json(
      { error: "Invalid IP address", message: "IP must be a valid IPv4 or IPv6 address" },
      { status: 400 },
    );
  }

  try {
    const upstreamUrl = `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
    const response = await fetch(upstreamUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "aptos-x402-composer",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`IPAPI returned ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { error: "IP lookup failed", message: data.reason || "Invalid IP address" },
        { status: 400 },
      );
    }

    // Format response
    return NextResponse.json({
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country_name,
      countryCode: data.country_code,
      postal: data.postal,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      isp: data.org,
      asn: data.asn,
      currency: data.currency,
      currencyName: data.currency_name,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch IP geolocation",
        message: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

