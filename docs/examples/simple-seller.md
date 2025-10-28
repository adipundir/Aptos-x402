# Simple Seller Example

Complete example of a simple API that accepts x402 payments.

## Overview

This example shows the minimal setup for a payment-protected API using x402.

## Project Structure

```
simple-seller/
├── middleware.ts
├── .env.local
├── app/
│   └── api/
│       └── premium/
│           └── weather/
│               └── route.ts
└── package.json
```

## Step 1: Install Dependencies

```bash
npm install @adipundir/aptos-x402 @aptos-labs/ts-sdk next
```

## Step 2: Environment Variables

Create `.env.local`:

```
# Your wallet address (receives payments)
PAYMENT_RECIPIENT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Use public facilitator for testing
FACILITATOR_URL=https://aptos-x402.vercel.app/api/facilitator
```

## Step 3: Create Middleware

```typescript
// middleware.ts
import { paymentMiddleware } from '@adipundir/aptos-x402';

export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/weather': {
      price: '1000000',  // 0.01 APT
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

## Step 4: Create API Route

```typescript
// app/api/premium/weather/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // This code only runs AFTER payment is verified and settled
  
  const weatherData = {
    location: 'San Francisco',
    temperature: 72,
    condition: 'Sunny',
    humidity: 65,
    windSpeed: 10,
    forecast: [
      { day: 'Monday', high: 73, low: 58, condition: 'Partly Cloudy' },
      { day: 'Tuesday', high: 70, low: 55, condition: 'Rainy' },
      { day: 'Wednesday', high: 75, low: 60, condition: 'Sunny' },
      { day: 'Thursday', high: 74, low: 59, condition: 'Sunny' },
      { day: 'Friday', high: 71, low: 56, condition: 'Cloudy' },
      { day: 'Saturday', high: 72, low: 57, condition: 'Partly Cloudy' },
      { day: 'Sunday', high: 76, low: 61, condition: 'Sunny' }
    ],
    premium: true,
    timestamp: new Date().toISOString()
  };
  
  return NextResponse.json(weatherData);
}
```

## Step 5: Test It

### Start the dev server:

```bash
npm run dev
```

### Test without payment (should get 402):

```bash
curl http://localhost:3000/api/premium/weather
```

**Expected response:**
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

### Test with payment:

See [Quickstart for Buyers](../getting-started/quickstart-buyers.md) for how to make the payment.

## Complete Files

### package.json

```json
{
  "name": "simple-seller",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@adipundir/aptos-x402": "^0.1.3",
    "@aptos-labs/ts-sdk": "^1.26.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

## Variations

### Multiple Endpoints

```typescript
export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/weather': {
      price: '1000000',  // 0.01 APT
      config: { description: 'Weather data' }
    },
    '/api/premium/stocks': {
      price: '5000000',  // 0.05 APT
      config: { description: 'Stock data' }
    },
    '/api/premium/analytics': {
      price: '10000000',  // 0.1 APT
      config: { description: 'Analytics' }
    }
  },
  { url: process.env.FACILITATOR_URL! }
);
```

### Different Networks

```typescript
// Accept testnet OR mainnet
'/api/premium/weather': {
  price: '1000000',
  network: 'testnet',  // or 'mainnet'
}
```

## Next Steps

- [Deploy to production](../guides/facilitator-setup.md)
- [Add your own facilitator](../guides/facilitator-setup.md)
- [Switch to mainnet](../core-concepts/network-token-support.md)
 - Switch to mainnet when ready

## Source Code

Full source code: [examples/simple-seller](https://github.com/adipundir/aptos-x402/tree/main/examples/simple-seller)

---

**Back to:** [Examples](#)

