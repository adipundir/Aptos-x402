# Simple Seller Integration Example

This example shows how to integrate `@adipundir/aptos-x402` into your Next.js application to protect API routes with payments.

## Installation

```bash
npm install @adipundir/aptos-x402 @aptos-labs/ts-sdk
```

## Configuration

### 1. Set up environment variables

Create a `.env.local` file:

```env
# Your Aptos wallet address (receives payments)
PAYMENT_RECIPIENT_ADDRESS=0x1234567890abcdef...

# Facilitator URL (REQUIRED)
FACILITATOR_URL=https://your-app.com/api/facilitator
```

### 2. Create middleware.ts

```typescript
import { paymentMiddleware } from '@adipundir/aptos-x402';

export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/weather': {
      price: '1000000',  // 0.01 APT
      network: 'testnet',
      config: {
        description: 'Premium weather data',
      },
    },
  },
  {
    url: process.env.FACILITATOR_URL!,
  }
);

export const config = {
  matcher: ['/api/premium/:path*'],
};
```

### 3. Create your API route

```typescript
// app/api/premium/weather/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Payment already verified by middleware!
  // Just return your data
  return NextResponse.json({
    location: 'San Francisco',
    temperature: 72,
    premium: true,
  });
}
```

## That's it!

The middleware automatically:
 - Returns 402 Payment Required for requests without payment
 - Verifies payment signatures
 - Settles payments on the blockchain
 - Only allows access after successful payment
 - Adds payment receipt headers to the response

Your API routes stay clean and focused on business logic!

## How it works

1. **Client makes request** → `GET /api/premium/weather`
2. **Server returns 402** → With payment requirements
3. **Client signs transaction** → Using their Aptos wallet
4. **Client retries with X-PAYMENT header** → Contains signed transaction
5. **Middleware verifies** → Fast cryptographic validation
6. **Middleware settles** → Submits transaction to blockchain
7. **Server returns resource** → After payment confirmed

## Facilitator Options

You need to provide a facilitator URL. Options:

### Option 1: Use the public demo facilitator (easiest)

```env
FACILITATOR_URL=https://aptos-x402.vercel.app/api/facilitator
```

Perfect for development and testing!

### Option 2: Deploy your own (recommended for production)

Copy the facilitator routes from the repository and deploy to your own infrastructure:

```typescript
// app/api/facilitator/verify/route.ts
// app/api/facilitator/settle/route.ts
```

See the main repository for full facilitator implementation.

## Network Configuration

- `testnet`: For development and testing
- `mainnet`: For production (use real APT)

The middleware automatically maps `testnet` → `aptos-testnet` and `mainnet` → `aptos-mainnet` per the x402 spec.

