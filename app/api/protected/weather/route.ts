import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/protected/weather
 * 
 * A demo protected API that requires x402 payment to access.
 * 
 * This looks like a free API! 🎉
 * All payment logic is handled in middleware.ts before the request reaches here.
 */
export async function GET(request: NextRequest) {
  // Just return your data - payment already verified by middleware!
  
  const weatherData = {
    location: "San Francisco, CA",
    temperature: 72,
    conditions: "Sunny",
    humidity: 65,
    windSpeed: 8,
    forecast: [
      { day: "Monday", high: 75, low: 58, conditions: "Partly Cloudy" },
      { day: "Tuesday", high: 73, low: 56, conditions: "Sunny" },
      { day: "Wednesday", high: 70, low: 55, conditions: "Cloudy" },
      { day: "Thursday", high: 68, low: 54, conditions: "Rainy" },
      { day: "Friday", high: 71, low: 56, conditions: "Sunny" },
    ],
  };

  // Check if payment was settled (middleware passes this via headers)
  const settlementData = request.headers.get("x-payment-settlement");
  
  if (settlementData) {
    // Payment was made! Add X-PAYMENT-RESPONSE header per x402 spec
    const paymentResponse = JSON.parse(settlementData);
    const verificationTime = request.headers.get('x-verification-time-internal');
    const settlementTime = request.headers.get('x-settlement-time-internal');
    
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set(
      "X-Payment-Response",
      Buffer.from(JSON.stringify(paymentResponse)).toString('base64')
    );
    
    // Add timing headers for debugging
    if (verificationTime) {
      headers.set('X-Verification-Time', verificationTime);
    }
    if (settlementTime) {
      headers.set('X-Settlement-Time', settlementTime);
    }
    
    return new Response(JSON.stringify(weatherData), {
      status: 200,
      headers,
    });
  }

  // No payment settlement data (shouldn't happen if middleware is configured correctly)
  return NextResponse.json(weatherData);
}

