# Quickstart for Sellers

Add payment requirements to your Next.js API in 5 minutes with x402 middleware.

## Prerequisites

| Requirement | Version |
|-------------|---------|
| **Next.js** | 15.0.0+ with App Router |
| **Node.js** | 20.0.0+ |
| **TypeScript** | 5.x (recommended) |

## Installation

```bash
npm install aptos-x402
```

> The Aptos SDK (`@aptos-labs/ts-sdk`) is included as a peer dependency.

## Step 1: Configure Wallet Address

You need an Aptos wallet address to receive payments. The private key stays in your wallet - only the address is needed on your server.

### Option A: Use Existing Wallet

If you have [Petra Wallet](https://petra.app/) or [Martian Wallet](https://martianwallet.xyz/), copy your address (starts with `0x`).

### Option B: Generate Programmatically

```bash
npx tsx -e "import { Account } from '@aptos-labs/ts-sdk'; const acc = Account.generate(); console.log('Address:', acc.accountAddress.toString());"
```

## Step 2: Configure Environment

Create `.env.local` in your project root:

```env
PAYMENT_RECIPIENT_ADDRESS=0xYOUR_WALLET_ADDRESS
FACILITATOR_URL=https://aptos-x402.vercel.app/api/facilitator
```

| Variable | Description |
|----------|-------------|
| `PAYMENT_RECIPIENT_ADDRESS` | Your Aptos wallet address (receives payments) |
| `FACILITATOR_URL` | Service that handles blockchain operations |

> **Note:** The public facilitator URL shown above is free and works on both testnet and mainnet. You can optionally [self-host](../guides/facilitator-setup.md) for custom requirements.

## Step 3: Create Middleware

Create `middleware.ts` in your project root (same level as `app/` directory):

```typescript
import { paymentMiddleware } from 'aptos-x402';

export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/weather': {
      price: '1000000',  // 0.01 APT
      network: 'testnet',
      config: {
        description: 'Premium weather data with 7-day forecast',
        mimeType: 'application/json'
      }
    },
    '/api/premium/stocks': {
      price: '5000000',  // 0.05 APT
      network: 'testnet',
      config: {
        description: 'Real-time stock market data'
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

### Configuration Explained

| Field | Purpose |
|-------|---------|
| **Route path** | Exact API endpoint path (e.g., `/api/premium/weather`) |
| **price** | Payment amount in Octas |
| **network** | Blockchain network (`'testnet'` or `'mainnet'`) |
| **description** | Human-readable resource description |
| **matcher** | Pattern for routes the middleware applies to |

### Octas Pricing Reference

Aptos uses **Octas** as the smallest unit (like satoshis or wei):

```
1 APT = 100,000,000 Octas

Common prices:
  $0.01 equivalent → ~100,000 Octas    (0.001 APT)
  $0.10 equivalent → ~1,000,000 Octas  (0.01 APT)
  $1.00 equivalent → ~10,000,000 Octas (0.1 APT)
```

## Step 4: Create API Routes

Your API routes require **zero payment logic** - write them as normal:

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
      { day: 'Tuesday', high: 70, low: 55 },
      { day: 'Wednesday', high: 68, low: 54 }
    ],
    premium: true
  });
}
```

### Payment Flow

The middleware automatically handles:

1. **No Payment** → Returns 402 with payment instructions
2. **Invalid Payment** → Returns 403 with error details
3. **Valid Payment** → Verifies → Settles → Executes your route → Returns 200

## Step 5: Test Your Setup

### Test Without Payment

```bash
npm run dev

# In another terminal
curl http://localhost:3000/api/premium/weather
```

Expected 402 response:
```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "aptos-testnet",
    "maxAmountRequired": "1000000",
    "payTo": "0xYOUR_WALLET_ADDRESS",
    "description": "Premium weather data with 7-day forecast",
    "resource": "http://localhost:3000/api/premium/weather"
  }]
}
```

If you see this 402 response, your middleware is working correctly!

### Test With Payment

Use the client from [Quickstart for Buyers](quickstart-buyers.md):

```typescript
import { x402axios } from 'aptos-x402';

const response = await x402axios.get('http://localhost:3000/api/premium/weather', {
  privateKey: process.env.APTOS_PRIVATE_KEY
});

console.log(response.data);
console.log('Paid:', response.paymentInfo?.transactionHash);
```

## Response Headers

Successful payments include these headers:

| Header | Description |
|--------|-------------|
| `X-PAYMENT-RESPONSE` | Payment receipt with transaction hash |
| `X-Verification-Time` | Milliseconds for payment verification |
| `X-Settlement-Time` | Milliseconds for blockchain settlement |

## Next Steps

### For Development

- Use testnet for all testing
- Get free testnet APT from [faucet](https://aptoslabs.com/testnet-faucet)
- Monitor transaction on [Aptos Explorer](https://explorer.aptoslabs.com/)

### For Production

1. **Deploy Own Facilitator** - See [Facilitator Setup](../guides/facilitator-setup.md)
2. **Switch to Mainnet** - Change `network: 'mainnet'` in configuration
3. **Monitor Performance** - Track verification and settlement times
4. **Implement Error Handling** - Handle payment failures gracefully

## Additional Resources

- [Quickstart for Buyers](quickstart-buyers.md) - Consume your protected API
- [HTTP 402 Protocol](../core-concepts/http-402.md) - Deep dive into the protocol
- [Facilitator Guide](../guides/facilitator-setup.md) - Self-hosting options
