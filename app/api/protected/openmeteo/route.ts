import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/openmeteo
 *
 * Real-world API integration: Open-Meteo (free, no API key)
 *
 * Query params:
 * - lat: number (default: 37.7749)
 * - lon: number (default: -122.4194)
 * - timezone: string (default: 'auto')
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latRaw = searchParams.get("lat") ?? "37.7749";
  const lonRaw = searchParams.get("lon") ?? "-122.4194";
  const timezone = searchParams.get("timezone") ?? "auto";

  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "Invalid coordinates", message: "lat and lon must be valid numbers" },
      { status: 400 },
    );
  }

  try {
    const upstreamUrl = new URL("https://api.open-meteo.com/v1/forecast");
    upstreamUrl.searchParams.set("latitude", String(lat));
    upstreamUrl.searchParams.set("longitude", String(lon));
    upstreamUrl.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,precipitation",
    );
    upstreamUrl.searchParams.set("hourly", "temperature_2m,precipitation_probability");
    upstreamUrl.searchParams.set("timezone", timezone);

    const response = await fetch(upstreamUrl.toString(), {
      headers: { "Accept": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Open-Meteo returned ${response.status}`);
    }

    const data = await response.json();
    
    // Format weather data for user-friendly display
    const current = data.current;
    const hourly = data.hourly;
    
    return NextResponse.json({
      location: {
        latitude: lat,
        longitude: lon,
        timezone: data.timezone || timezone,
      },
      current: {
        temperature: current?.temperature_2m,
        feelsLike: current?.apparent_temperature,
        humidity: current?.relative_humidity_2m,
        windSpeed: current?.wind_speed_10m,
        precipitation: current?.precipitation,
        time: current?.time,
      },
      hourly: hourly?.time?.slice(0, 24).map((time: string, idx: number) => ({
        time,
        temperature: hourly.temperature_2m?.[idx],
        precipitationChance: hourly.precipitation_probability?.[idx],
      })) || [],
      // Keep raw data for advanced use cases
      _raw: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch from Open-Meteo",
        message: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}


