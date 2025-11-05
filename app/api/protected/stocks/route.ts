import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const stocksData = {
    symbols: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'],
    prices: {
      AAPL: { price: 175.43, change: 2.15, changePercent: 1.24 },
      GOOGL: { price: 142.56, change: -0.87, changePercent: -0.61 },
      MSFT: { price: 378.85, change: 3.42, changePercent: 0.91 },
      AMZN: { price: 151.94, change: 1.23, changePercent: 0.82 },
      TSLA: { price: 248.50, change: -5.20, changePercent: -2.05 },
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(stocksData);
}

