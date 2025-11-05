import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const newsData = {
    headlines: [
      {
        title: "Tech Stocks Rally on Strong Earnings",
        source: "Tech News",
        publishedAt: new Date().toISOString(),
        category: "Finance",
      },
      {
        title: "AI Breakthrough in Medical Research",
        source: "Science Daily",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        category: "Science",
      },
      {
        title: "Cryptocurrency Market Shows Volatility",
        source: "Crypto Times",
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        category: "Crypto",
      },
    ],
    total: 3,
  };

  return NextResponse.json(newsData);
}

