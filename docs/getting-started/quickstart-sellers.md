# Quickstart for Sellers

Add payment requirements to your Next.js API in 5 minutes with **x402 v2 compliant** middleware.

> ✅ **x402 v2 protocol** | ⚠️ v1 is deprecated

## Prerequisites

Next.js 15+ or 16+ with App Router, Node.js 20.9+, TypeScript 5.1+ (recommended).

## Installation

```bash
npm install aptos-x402
```

## Step 1: Configure Environment

Create `.env.local` in your project root:

```bash
# Your Aptos wallet address (receives USDC payments)
PAYMENT_RECIPIENT_ADDRESS=0xYOUR_WALLET_ADDRESS

# Network (CAIP-2 format)
APTOS_NETWORK=aptos:2  # Use aptos:1 for mainnet

# USDC Asset Addresses (Circle)
USDC_MAINNET_ADDRESS=0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b
USDC_TESTNET_ADDRESS=0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832

# Facilitator URL (handles blockchain operations)
FACILITATOR_URL=https://aptos-x402.org/api/facilitator

# Geomi API Key (for gas sponsorship)
GEOMI_API_KEY=your_api_key_from_geomi_dev
```


## Step 2: Create Proxy

Create `proxy.ts` in your project root:

```typescript
// proxy.ts
import { paymentMiddleware } from 'aptos-x402';

// Select USDC address based on network
const USDC_ASSET = process.env.APTOS_NETWORK === "aptos:1" 
  ? process.env.USDC_MAINNET_ADDRESS! 
  : process.env.USDC_TESTNET_ADDRESS!;

export const proxy = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/weather': {
      price: '1000',       // 0.001 USDC (6 decimals)
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      sponsored: true,     // Facilitator sponsors gas (default: true)
      config: {
        description: 'Premium weather data',
      }
    },
    '/api/premium/data': {
      price: '5000',       // 0.005 USDC
      network: process.env.APTOS_NETWORK!,
      asset: USDC_ASSET,
      sponsored: true,     // Facilitator sponsors gas (default: true)
      config: {
        description: 'Premium data API',
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


USDC uses 6 decimals: `1000` = $0.001, `10000` = $0.01, `1000000` = $1.00

## Step 3: Create API Routes

Your routes require **zero payment logic**:

```typescript
// app/api/premium/weather/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // This code ONLY executes after successful payment
  return NextResponse.json({
    location: 'San Francisco',
    temperature: 72,
    condition: 'Sunny',
    forecast: [
      { day: 'Monday', high: 73, low: 58 },
      { day: 'Tuesday', high: 70, low: 55 }
    ]
  });
}
```

## Step 4: Test

### Without Payment

```bash
curl http://localhost:3000/api/premium/weather
```

Expected 402 response:

```json
{
  "x402Version": 2,
  "accepts": [{
    "scheme": "exact",
    "network": "aptos:2",
    "amount": "1000",
    "asset": "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832",
    "payTo": "0xYOUR_WALLET_ADDRESS",
    "maxTimeoutSeconds": 60,
    "extra": { "sponsored": true }
  }]
}
```

### With Payment

```typescript
import { x402axios } from 'aptos-x402';

const response = await x402axios.get('http://localhost:3000/api/premium/weather', {
  privateKey: process.env.APTOS_PRIVATE_KEY
});

console.log(response.data);
console.log('TX:', response.paymentInfo?.transactionHash);
```


## USDC Addresses

| Network | Address |
|---------|---------|
| **Mainnet** | `0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b` |
| **Testnet** | `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832` |

## Next Steps

- [Quickstart for Buyers](quickstart-buyers.md) - Test your API
- [Facilitator Guide](../guides/facilitator-setup.md) - Self-host facilitator
- [Geomi Setup](../guides/geomi-setup.md) - Configure gas sponsorship
