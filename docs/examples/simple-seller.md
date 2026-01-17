# Simple Seller Example

Complete example of a payment-protected API using x402.

## Project Structure

```
simple-seller/
├── proxy.ts
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
npm install aptos-x402 @aptos-labs/ts-sdk next
```

## Step 2: Environment Variables

Create `.env.local`:

```bash
# Your wallet address (receives USDC payments)
PAYMENT_RECIPIENT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

# Network (CAIP-2 format)
APTOS_NETWORK=aptos:2

# USDC Addresses (Circle)
USDC_MAINNET_ADDRESS=0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b
USDC_TESTNET_ADDRESS=0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832

# Public facilitator
FACILITATOR_URL=https://aptos-x402.org/api/facilitator

# Geomi API Key (for gas sponsorship)
GEOMI_API_KEY=your_api_key
```

## Step 3: Create Proxy

```typescript
// proxy.ts
import { paymentMiddleware } from 'aptos-x402';

const USDC_ASSET = process.env.APTOS_NETWORK === "aptos:1" 
  ? process.env.USDC_MAINNET_ADDRESS! 
  : process.env.USDC_TESTNET_ADDRESS!;

export const proxy = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/weather': {
      price: '1000',        // 0.001 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      sponsored: true,      // Facilitator sponsors gas (default: true)
      config: {
        description: 'Premium weather data'
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

export async function GET() {
  // This code only runs AFTER payment is verified and settled
  return NextResponse.json({
    location: 'San Francisco',
    temperature: 72,
    condition: 'Sunny',
    forecast: [
      { day: 'Monday', high: 73, low: 58 },
      { day: 'Tuesday', high: 70, low: 55 },
      { day: 'Wednesday', high: 75, low: 60 }
    ],
    timestamp: new Date().toISOString()
  });
}
```

## Step 5: Test

### Start dev server:

```bash
npm run dev
```

### Test without payment (returns 402):

```bash
curl http://localhost:3000/api/premium/weather
```

**Expected response:**
```json
{
  "x402Version": 2,
  "accepts": [{
    "scheme": "exact",
    "network": "aptos:2",
    "amount": "1000",
    "asset": "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832",
    "payTo": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "maxTimeoutSeconds": 60,
    "extra": { "sponsored": true }
  }]
}
```

### Test with payment:

```typescript
import { x402axios } from 'aptos-x402';

const response = await x402axios.get('http://localhost:3000/api/premium/weather', {
  privateKey: process.env.APTOS_PRIVATE_KEY
});

console.log(response.data);
console.log('TX:', response.paymentInfo?.transactionHash);
```

## Complete package.json

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
    "aptos-x402": "^0.2.0",
    "@aptos-labs/ts-sdk": "^1.30.0",
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

## Multiple Endpoints

```typescript
export const proxy = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/weather': {
      price: '1000',         // 0.001 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
    },
    '/api/premium/stocks': {
      price: '5000',         // 0.005 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
    },
    '/api/premium/analytics': {
      price: '10000',        // 0.01 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
    }
  },
  { url: process.env.FACILITATOR_URL! }
);
```

## USDC Addresses

| Network | Address |
|---------|---------|
| **Mainnet** | `0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b` |
| **Testnet** | `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832` |

## Next Steps

- [Deploy to production](../guides/facilitator-setup.md)
- [Geomi Setup](../guides/geomi-setup.md)
