# Quickstart for Sellers

This guide shows you how to add payment requirements to your Next.js API in under 5 minutes using x402 middleware.

## Prerequisites

You'll need a Next.js 15+ application with the App Router, Node.js 20 or higher, and TypeScript (recommended).

## Installation

Install the x402 SDK:

```bash
npm install @adipundir/aptos-x402
```

The Aptos SDK is included as a dependency, so you don't need to install it separately.

## Set Up Your Wallet

You need an Aptos wallet address to receive payments. If you already have one from Petra Wallet or Martian Wallet, you can use that address directly. Otherwise, generate a new account using the Aptos SDK or our helper scripts.

The wallet address is simply where payment funds will be transferred. You don't need the private key on your server - clients will send payments to this address, and you'll see the funds appear in your wallet.

## Configure Environment Variables

Create a `.env.local` file in your project root:

```env
PAYMENT_RECIPIENT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
FACILITATOR_URL=https://aptos-x402.vercel.app/api/facilitator
```

Replace the address with your actual Aptos wallet address. The facilitator URL above points to the public demo facilitator for testing. For production, deploy and use your own facilitator service.

## Create the Middleware

Create a file named `middleware.ts` in your project root (at the same level as your `app` directory, not inside it):

```typescript
import { paymentMiddleware } from '@adipundir/aptos-x402';

export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/weather': {
      price: '1000000',
      network: 'testnet',
      config: {
        description: 'Premium weather data with 7-day forecast'
      }
    }
  },
  {
    url: process.env.FACILITATOR_URL!
  }
);

export const config = {
  matcher: ['/api/premium/:path*']
};
```

This configuration protects all routes under `/api/premium/` and requires 0.01 APT (1,000,000 Octas) for the weather endpoint. The matcher pattern determines which routes the middleware applies to.

Note: The `routes` map uses exact pathnames as keys. The matcher controls which requests reach the middleware, but you must list each exact endpoint you want to charge in the `routes` object (for example, `/api/premium/weather` and `/api/premium/stocks`).

## Understanding Octas

Aptos uses Octas as the smallest unit, similar to satoshis in Bitcoin or wei in Ethereum. One APT equals 100,000,000 Octas. Common price points:

- 0.001 APT = 100,000 Octas
- 0.01 APT = 1,000,000 Octas
- 0.1 APT = 10,000,000 Octas
- 1 APT = 100,000,000 Octas

## Create Your API Route

Your API routes require no payment logic. Write them as you normally would:

```typescript
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    location: 'San Francisco',
    temperature: 72,
    condition: 'Sunny',
    forecast: [
      { day: 'Monday', high: 73, low: 58 },
      { day: 'Tuesday', high: 70, low: 55 },
      // Additional forecast days...
    ]
  });
}
```

This code only executes after the middleware has verified and settled payment. If payment hasn't been made or fails, your route handler never runs.

## Test the Integration

Start your development server:

```bash
npm run dev
```

Make a request to your protected endpoint:

```bash
curl http://localhost:3000/api/premium/weather
```

You should receive a 402 Payment Required response with payment details:

```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "aptos-testnet",
    "maxAmountRequired": "1000000",
    "payTo": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "description": "Premium weather data with 7-day forecast",
    "resource": "http://localhost:3000/api/premium/weather"
  }]
}
```

This 402 response tells clients how to pay for access. The middleware handles returning this response automatically when no valid payment is present.

To complete a paid request from a client, follow the [Quickstart for Buyers](quickstart-buyers.md) and call your protected endpoint using `x402axios`.

## How It Works

When a request arrives at a protected route, the middleware checks for an X-PAYMENT header. If absent, it returns 402 with payment requirements. If present, it verifies the payment structure, settles the transaction on the Aptos blockchain, and only allows your API code to execute after successful settlement.

The middleware adds timing information to responses in headers like X-Verification-Time and X-Settlement-Time, which can help with debugging and monitoring performance.

## Protecting Multiple Endpoints

You can protect multiple endpoints with different prices:

```typescript
export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/weather': {
      price: '1000000',
      network: 'testnet',
      config: { description: 'Weather data' }
    },
    '/api/premium/stocks': {
      price: '5000000',
      network: 'testnet',
      config: { description: 'Stock market data' }
    }
  },
  { url: process.env.FACILITATOR_URL! }
);
```

Each route can have its own price and description. The middleware handles routing automatically based on the request path.

## Next Steps

You've successfully set up payment protection for your API. To complete your integration:

- Test with real payments by following the client integration guide
- Set up your own facilitator for production use
- Switch from testnet to mainnet when ready to accept real payments

See [Facilitator Setup](../guides/facilitator-setup.md) for production deployment guidance.
