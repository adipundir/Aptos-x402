# Facilitator Setup Guide

Deploy a production-ready facilitator for x402 payment processing.

## Public Facilitator (Recommended)

Before self-hosting, consider the free public facilitator:

```
FACILITATOR_URL=https://aptos-x402.org/api/facilitator
```

Features:
- Free for all users
- Testnet and mainnet support
- Geomi gas sponsorship included
- Zero configuration

Only self-host if you need guaranteed SLAs, custom rate limits, or private infrastructure.

## Self-Hosting Prerequisites

| Requirement | Version |
|-------------|---------|
| Next.js | 15+ or 16+ |
| Node.js | 20+ |
| Geomi API Key | From [geomi.dev](https://geomi.dev) |

## Step 1: Environment Setup

```bash
# .env.local

# Geomi API Key (REQUIRED for gas sponsorship)
GEOMI_API_KEY=your_api_key_from_geomi_dev

# Network
APTOS_NETWORK=aptos:2

# USDC Addresses
USDC_MAINNET_ADDRESS=0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b
USDC_TESTNET_ADDRESS=0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832
```

## Step 2: Install Dependencies

```bash
npm install aptos-x402 @aptos-labs/ts-sdk @aptos-labs/gas-station-client
```

## Step 3: Create Verify Endpoint

```typescript
// app/api/facilitator/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Aptos, AptosConfig, Network, Deserializer, SimpleTransaction } from '@aptos-labs/ts-sdk';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { paymentHeader, paymentRequirements } = await request.json();
    
    if (!paymentHeader || !paymentRequirements?.asset || !paymentRequirements?.payTo) {
      return NextResponse.json({ isValid: false, invalidReason: "Missing required fields" }, { status: 400 });
    }

    const payload = JSON.parse(paymentHeader);
    if (!payload.payload?.transaction) {
      return NextResponse.json({ isValid: false, invalidReason: "No transaction in payload" });
    }

    // Deserialize and simulate
    const txBytes = Uint8Array.from(atob(payload.payload.transaction), c => c.charCodeAt(0));
    const transaction = SimpleTransaction.deserialize(new Deserializer(txBytes));
    
    const network = paymentRequirements.network === 'aptos:1' ? Network.MAINNET : Network.TESTNET;
    const aptos = new Aptos(new AptosConfig({ network }));
    
    const [simulation] = await aptos.transaction.simulate.simple({
      signerPublicKey: transaction.rawTransaction.sender,
      transaction,
    });
    
    if (!simulation.success) {
      return NextResponse.json({ isValid: false, invalidReason: `Simulation failed: ${simulation.vm_status}` });
    }

    const duration = Date.now() - startTime;
    const response = NextResponse.json({ isValid: true, invalidReason: null });
    response.headers.set('Verification-Time', duration.toString());
    return response;

  } catch (error: any) {
    return NextResponse.json({ isValid: false, invalidReason: error.message }, { status: 500 });
  }
}
```

## Step 4: Create Settle Endpoint

```typescript
// app/api/facilitator/settle/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Aptos, AptosConfig, Network, Deserializer, SimpleTransaction, AccountAuthenticator } from '@aptos-labs/ts-sdk';
import { getGasStation } from 'aptos-x402';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { paymentHeader, paymentRequirements } = await request.json();
    
    const payload = JSON.parse(paymentHeader);
    const network = paymentRequirements.network;
    
    // Deserialize transaction
    const txBytes = Uint8Array.from(atob(payload.payload.transaction), c => c.charCodeAt(0));
    const transaction = SimpleTransaction.deserialize(new Deserializer(txBytes));
    
    // Get sender authenticator
    const senderAuth = (transaction as any).rawTransaction.authenticator || 
                       AccountAuthenticator.deserialize(new Deserializer(txBytes));
    
    // Sponsor and submit via Geomi
    const gasStation = getGasStation();
    if (!gasStation.isConfigured()) {
      return NextResponse.json({
        success: false, transaction: null, network, payer: null,
        error: 'Gas station not configured. Set GEOMI_API_KEY.'
      }, { status: 500 });
    }
    
    const result = await gasStation.sponsorAndSubmitTransaction(transaction, senderAuth);
    
    if (!result.success) {
      return NextResponse.json({
        success: false, transaction: null, network, payer: null, error: result.error
      }, { status: 400 });
    }
    
    const duration = Date.now() - startTime;
    const response = NextResponse.json({
      success: true,
      transaction: result.txHash,
      network,
      payer: 'geomi-sponsored'
    });
    response.headers.set('Settlement-Time', duration.toString());
    return response;

  } catch (error: any) {
    return NextResponse.json({
      success: false, transaction: null, network: null, payer: null, error: error.message
    }, { status: 500 });
  }
}
```

## Step 5: Configure Middleware

```typescript
// proxy.ts
import { paymentMiddleware } from 'aptos-x402';

const USDC = process.env.APTOS_NETWORK === "aptos:1" 
  ? process.env.USDC_MAINNET_ADDRESS! 
  : process.env.USDC_TESTNET_ADDRESS!;

export const proxy = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/data': {
      price: '1000',
      network: process.env.APTOS_NETWORK!,
      asset: USDC,
    }
  },
  {
    url: process.env.FACILITATOR_URL || 'http://localhost:3000/api/facilitator'
  }
);

export const config = { matcher: ['/api/premium/:path*'] };
```

## Deployment

### Vercel

```bash
vercel deploy
vercel env add GEOMI_API_KEY
vercel env add APTOS_NETWORK
vercel env add USDC_TESTNET_ADDRESS
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
ENV GEOMI_API_KEY=your_key
ENV APTOS_NETWORK=aptos:2
CMD ["npm", "start"]
```

## Testing

```bash
# Test verify endpoint
curl -X POST http://localhost:3000/api/facilitator/verify \
  -H "Content-Type: application/json" \
  -d '{"paymentHeader":"...", "paymentRequirements":{...}}'

# Test settle endpoint
curl -X POST http://localhost:3000/api/facilitator/settle \
  -H "Content-Type: application/json" \
  -d '{"paymentHeader":"...", "paymentRequirements":{...}}'
```

## Monitoring

Track these metrics:
- Verification time (<100ms target)
- Settlement time (<3s target)
- Success rate (>95% target)
- Error rates by type

## USDC Addresses

| Network | Address |
|---------|---------|
| **Mainnet** | `0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b` |
| **Testnet** | `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832` |

## Next Steps

- [Geomi Setup](geomi-setup.md) - Configure gas sponsorship
- [HTTP 402 Protocol](../core-concepts/http-402.md) - Protocol details
