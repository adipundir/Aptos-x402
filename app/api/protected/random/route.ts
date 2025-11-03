import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const randomData = {
    number: Math.floor(Math.random() * 1000),
    uuid: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    randomQuote: [
      "The only way to do great work is to love what you do.",
      "Innovation distinguishes between a leader and a follower.",
      "Life is what happens to you while you're busy making other plans.",
    ][Math.floor(Math.random() * 3)],
  };

  return NextResponse.json(randomData);
}

