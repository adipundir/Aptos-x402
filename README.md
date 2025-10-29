# aptos-x402

> x402 Payment Protocol SDK for Aptos blockchain

HTTP 402 Payment Required for machine-to-machine micropayments on Aptos.

[![npm version](https://img.shields.io/npm/v/aptos-x402.svg)](https://www.npmjs.com/package/aptos-x402)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎮 Try the Interactive Demo

See x402 in action with our interactive CLI demo:

```bash
# Clone the repo
git clone https://github.com/adipundir/aptos-x402
cd aptos-x402

# Install dependencies
npm install

# Start the server
npm run dev

# In another terminal, run the demo
npx tsx scripts/test-x402-axios.ts
```

The demo will:
1. Ask for your Aptos private key (testnet)
2. Check your balance
3. Make a request to a protected API endpoint
4. **Automatically handle the payment** using x402-axios
5. Show you the response and transaction details

**Don't have testnet APT?** Generate an account and fund it:
```bash
npx tsx scripts/generate-account.ts
npx tsx scripts/fund-account.ts <your-address>
```

## Quick Start (5 Minutes)

Add cryptocurrency payments to your Next.js API in just 3 steps:

### Step 1: Install the Package

```bash
npm install aptos-x402
```

## 🛒 For Buyers (Consuming Paid APIs)

Access paid APIs with automatic payment handling using our **axios-compatible** interface:

```typescript
import { x402axios } from 'aptos-x402';

// Works exactly like axios - payment handled automatically!
const response = await x402axios.get('https://api.example.com/premium/data', {
  privateKey: '0x...'  // Your Aptos private key
});

console.log(response.data);              // API response data
console.log(response.paymentInfo);       // { transactionHash, amount, ... }
```

### Full Axios Compatibility

x402axios supports all standard axios methods and features:

```typescript
// GET request
const response = await x402axios.get('https://api.example.com/data', {
  privateKey: '0x...',
  timeout: 5000,
  headers: { 'Authorization': 'Bearer token' }
});

// POST request
const response = await x402axios.post('https://api.example.com/analyze', 
  { text: 'Hello world' },
  { 
    privateKey: '0x...',
    headers: { 'Content-Type': 'application/json' }
  }
);

// Create instance with defaults
const api = x402axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  privateKey: '0x...'  // Default for all requests
});

const response = await api.get('/premium/data');
```

**What happens automatically:**
1. Makes initial request to the protected API
2. Detects 402 Payment Required response
3. Extracts payment requirements (amount, recipient, network)
4. Builds and signs Aptos transaction
5. Retries request with payment
6. Returns data + payment info

## 🏪 For Sellers (Creating Paid APIs)

### Step 2: Create `middleware.ts` in Your Project Root

Create a file called `middleware.ts` in the root of your Next.js project (same level as `app/` or `pages/`):

```typescript
// middleware.ts
import { paymentMiddleware } from 'aptos-x402';

export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    // Configure which routes require payment
    '/api/premium/weather': {
      price: '1000000',  // 0.01 APT (in Octas)
      network: 'testnet',
      config: { description: 'Premium weather data' },
    },
  },
  { 
    // Use public facilitator (perfect for testing)
    url: 'https://aptos-x402.vercel.app/api/facilitator'
  }
);

export const config = {
  matcher: ['/api/premium/:path*'],  // Apply to all /api/premium/* routes
};
```

### Step 3: Set Environment Variable

Create `.env.local` in your project root:

```env
# Your Aptos wallet address (where payments go)
PAYMENT_RECIPIENT_ADDRESS=0xYOUR_WALLET_ADDRESS_HERE
```

**How to get your wallet address:**
1. Install [Petra Wallet](https://petra.app/) or [Martian Wallet](https://martianwallet.xyz/)
2. Create a new wallet
3. Copy your address (starts with `0x`)
4. Paste it in `.env.local`

**That's it!** Your API routes under `/api/premium/*` now require payment.

### Your API Routes Stay Clean

**Important:** You don't need to change anything in your API routes! The middleware handles everything.

```typescript
// app/api/premium/weather/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // This code only runs AFTER payment is verified and settled!
  // No payment logic needed here.
  
  return NextResponse.json({
    location: 'San Francisco',
    temperature: 72,
    condition: 'Sunny',
  });
}
```

The middleware automatically:
- Returns 402 for requests without payment
- Verifies payment signatures
- Settles payments on Aptos blockchain
- Only allows API execution after successful payment
- Adds payment receipt headers to responses

### Next.js Requirements

- **Next.js 15+** with App Router
- TypeScript (recommended)
- Node.js 20+

### Complete Project Structure

After setup, your Next.js project should look like this:

```
my-nextjs-app/
├── middleware.ts              ← Payment middleware (created in Step 2)
├── .env.local                 ← Environment variables (created in Step 3)
├── app/
│   └── api/
│       └── premium/           ← Protected routes (payment required)
│           └── weather/
│               └── route.ts   ← Your API route (no payment code needed!)
├── package.json
└── next.config.js
```

**Key Points:**
- `middleware.ts` must be in the project root (not inside `app/`)
- Applies to all routes matching `/api/premium/*` (configurable)
- Your API routes need **zero** payment code
- Works automatically on every request

### Testing Your Setup

After setup, test that payment protection is working:

**1. Start your Next.js dev server:**
```bash
npm run dev
```

**2. Try accessing your protected route without payment:**
```bash
curl http://localhost:3000/api/premium/weather
```

**Expected Response (402 Payment Required):**
```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "aptos-testnet",
    "maxAmountRequired": "1000000",
    "payTo": "0xYOUR_WALLET_ADDRESS",
    "description": "Premium weather data",
    "resource": "http://localhost:3000/api/premium/weather"
  }]
}
```

If you see this 402 response, your middleware is working perfectly!

**3. For full payment testing:**
- Use our [live demo](https://aptos-x402.vercel.app) to see the complete flow
- Or implement client-side payment signing (see [Client Integration](#client-integration) below)

## What is x402?

[x402](https://github.com/coinbase/x402) is an open protocol by Coinbase for machine-to-machine micropayments using HTTP 402 status code. This SDK implements x402 for the Aptos blockchain.

### Use Cases

- **Pay-per-API-call** - Monetize your APIs without subscriptions
- **AI Agent Payments** - Let AI agents pay for resources automatically
- **Metered Services** - Charge exactly for what's consumed
- **Decentralized Access Control** - No API keys, just payments
- **Micropayments** - Enable sub-cent transactions economically

## Features

 - **Axios-compatible** - Drop-in replacement for axios with x402 payment support
 - **Zero payment logic in your code** - Middleware handles everything
 - **Aptos native** - Built on Aptos's fast finality (~1-3s)
 - **Type-safe** - Full TypeScript support with proper interfaces
 - **x402 compliant** - Follows official Coinbase specification
 - **Next.js optimized** - Designed for Next.js 15+ (more frameworks coming)
 - **Production ready** - Comprehensive error handling and logging
 - **Backward compatible** - Old interface still works alongside new axios interface

## How It Works

```
┌─────────┐                  ┌─────────┐                  ┌────────────┐
│ Client  │                  │  Your   │                  │   Aptos    │
│         │                  │  API    │                  │ Blockchain │
└────┬────┘                  └────┬────┘                  └─────┬──────┘
     │                            │                              │
     │  1. GET /api/premium      │                              │
     │──────────────────────────>│                              │
     │                            │                              │
     │  2. 402 Payment Required  │                              │
     │<──────────────────────────│                              │
     │   {accepts: [...]}         │                              │
     │                            │                              │
     │  3. Sign Transaction       │                              │
     │   (client-side)            │                              │
     │                            │                              │
     │  4. GET /api/premium      │                              │
     │     X-PAYMENT: <signed>   │                              │
     │──────────────────────────>│                              │
     │                            │  5. Verify (fast)            │
     │                            │──────────────┐               │
     │                            │              │               │
     │                            │<─────────────┘               │
     │                            │                              │
     │                            │  6. Settle (submit tx)       │
     │                            │─────────────────────────────>│
     │                            │                              │
     │                            │  7. Confirmed                │
     │                            │<─────────────────────────────│
     │                            │                              │
     │  8. 200 OK + Resource     │                              │
     │<──────────────────────────│                              │
     │   X-Payment-Response       │                              │
```

## Installation & Setup

### 1. Install Dependencies

```bash
npm install aptos-x402 @aptos-labs/ts-sdk next
```

### 2. Environment Variables

```env
# Your wallet address (receives payments)
PAYMENT_RECIPIENT_ADDRESS=0xYOUR_WALLET_ADDRESS_HERE

# Facilitator URL (required)
# Option 1: Use public demo facilitator (easiest for testing)
FACILITATOR_URL=https://aptos-x402.vercel.app/api/facilitator

# Option 2: Deploy your own for production
# FACILITATOR_URL=https://yourdomain.com/api/facilitator
```

### 3. Create Middleware

```typescript
// middleware.ts
import { paymentMiddleware } from 'aptos-x402';

export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    // Configure your protected routes
    '/api/premium/weather': {
      price: '1000000',  // 0.01 APT
      network: 'testnet',
      config: {
        description: 'Premium weather data',
        mimeType: 'application/json',
      },
    },
    '/api/premium/stocks': {
      price: '5000000',  // 0.05 APT
      network: 'testnet',
      config: {
        description: 'Real-time stock data',
      },
    },
  },
  {
    // Facilitator handles blockchain interactions
    url: process.env.FACILITATOR_URL!,
  }
);

export const config = {
  matcher: ['/api/premium/:path*'],
};
```

### 4. Create Your API Route

```typescript
// app/api/premium/weather/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Payment already verified & settled by middleware!
  // Just return your premium data
  
  return NextResponse.json({
    location: 'San Francisco',
    temperature: 72,
    forecast: '5-day detailed forecast',
    premium: true,
  });
}
```

### 5. Set Up Facilitator

The facilitator handles blockchain interactions. You need to deploy facilitator endpoints:

```typescript
// app/api/facilitator/verify/route.ts
// app/api/facilitator/settle/route.ts
```

See the [full facilitator implementation](https://github.com/adipundir/aptos-x402/tree/main/app/api/facilitator) in the repository.

## API Reference

### `paymentMiddleware(recipientAddress, routes, facilitatorConfig)`

Creates x402 payment middleware for Next.js.

#### Parameters

- **`recipientAddress`** (string, required): Your Aptos wallet address
- **`routes`** (object, required): Route configuration mapping
  - **`path`** (string): API route path
  - **`config`** (RouteConfig):
    - `price` (string): Payment amount in Octas (1 APT = 100,000,000 Octas)
    - `network` (string): `'testnet'` or `'mainnet'`
    - `config.description` (string, optional): Resource description
    - `config.mimeType` (string, optional): Response MIME type
    - `config.maxTimeoutSeconds` (number, optional): Max timeout
- **`facilitatorConfig`** (object, required):
  - `url` (string): Facilitator base URL

#### Returns

Next.js middleware function

## TypeScript Types

```typescript
import type {
  PaymentRequiredResponse,
  PaymentRequirements,
  PaymentPayload,
  RouteConfig,
  FacilitatorConfig,
} from 'aptos-x402/types';
```

### Core Types

```typescript
interface RouteConfig {
  price: string;              // Amount in Octas
  network?: string;           // 'testnet' | 'mainnet'
  config?: {
    description?: string;
    mimeType?: string;
    outputSchema?: Record<string, any>;
    maxTimeoutSeconds?: number;
  };
}

interface FacilitatorConfig {
  url: string;  // Required facilitator URL
}

interface PaymentRequiredResponse {
  x402Version: number;
  accepts: PaymentRequirements[];
  error?: string;
}
```

## Client Integration

### Simple Approach: Use x402axios

The easiest way to consume protected APIs is with our **axios-compatible** wrapper:

```typescript
import { x402axios } from 'aptos-x402';

// Automatic payment handling - works exactly like axios!
const response = await x402axios.get('https://api.example.com/premium/data', {
  privateKey: '0x...'  // Your Aptos private key
});

console.log(response.data);              // API response data
console.log(response.paymentInfo);       // Payment details
```

### Advanced: Manual Implementation

If you need more control, you can implement the payment flow manually:

```typescript
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

async function callProtectedAPI(url: string, privateKey: string) {
  // Step 1: Try without payment
  let response = await fetch(url);
  
  if (response.status === 402) {
    // Step 2: Parse payment requirements
    const paymentReqs = await response.json();
    const requirement = paymentReqs.accepts[0];
    
    // Step 3: Initialize Aptos client
    const config = new AptosConfig({ 
      network: requirement.network === 'aptos-testnet' ? Network.TESTNET : Network.MAINNET 
    });
    const aptos = new Aptos(config);
    
    // Step 4: Create account and build transaction
    const account = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(privateKey)
    });
    
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: '0x1::aptos_account::transfer',
        functionArguments: [requirement.payTo, requirement.maxAmountRequired]
      }
    });
    
    // Step 5: Sign and create payment header
    const authenticator = aptos.transaction.sign({ signer: account, transaction });
    
    const paymentPayload = {
      x402Version: 1,
      scheme: requirement.scheme,
      network: requirement.network,
      payload: {
        signature: Buffer.from(authenticator.bcsToBytes()).toString('base64'),
        transaction: Buffer.from(transaction.bcsToBytes()).toString('base64')
      }
    };
    
    // Step 6: Retry with payment
    response = await fetch(url, {
      headers: {
        'X-PAYMENT': Buffer.from(JSON.stringify(paymentPayload)).toString('base64')
      }
    });
  }
  
  // Step 11: Get the data
  const data = await response.json();
  console.log('Success!', data);
  
  // Step 12: Check payment receipt (optional)
  const paymentResponse = response.headers.get('x-payment-response');
  if (paymentResponse) {
    const receipt = JSON.parse(Buffer.from(paymentResponse, 'base64').toString());
    console.log('Payment settled:', receipt.settlement.txHash);
  }
  
  return data;
}

// Usage
await callProtectedAPI(
  'http://localhost:3000/api/premium/weather',
  '0xYOUR_PRIVATE_KEY_HERE'
);
```

### Quick Test with curl

**1. Get payment requirements:**
```bash
curl http://localhost:3000/api/premium/weather
```

**Response:**
```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "aptos-testnet",
    "maxAmountRequired": "1000000",
    "payTo": "0xYOUR_WALLET_ADDRESS",
    "resource": "http://localhost:3000/api/premium/weather"
  }]
}
```

**2. Make payment request:**
```bash
curl http://localhost:3000/api/premium/weather \
  -H "X-PAYMENT: eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoi..."
```

### Browser Integration

For browser applications, you can use wallet integrations:

```typescript
// Using Petra Wallet
const { signTransaction } = usePetraWallet();
const signedTx = await signTransaction(transaction);
```

### AI Agent Integration

```typescript
import { x402axios } from 'aptos-x402';

// Agent automatically handles payments
const response = await x402axios.get('https://api.example.com/premium/data', {
  privateKey: process.env.AGENT_KEY!
});

const data = response.data;
```

## Examples

### Example Projects in This Repo

- **[examples/simple-seller/](./examples/simple-seller/)** - Basic middleware configuration
- **[examples/facilitator/](./examples/facilitator/)** - Facilitator setup guide  
- **[app/](./app/)** - Complete working demo with frontend

### Live Demo

Visit **https://aptos-x402.vercel.app** to see the complete payment flow in action:
- Try requesting without payment (gets 402)
- Sign transaction with demo account
- See payment verification and settlement
- View transaction on Aptos Explorer

## Facilitator Setup

The facilitator is a critical component that handles blockchain interactions (verify and settle operations).

### Why Separate Facilitator?

- **Security**: Keeps blockchain keys separate from app servers
- **Scalability**: Can be shared across multiple services
- **x402 Compliance**: Follows the official protocol architecture

### Options

#### 1. Use Public Demo Facilitator (Easiest)

```env
FACILITATOR_URL=https://aptos-x402.vercel.app/api/facilitator
```

Perfect for:
- Development and testing
- Proof of concepts
- Learning x402 protocol

**Note**: For production, deploy your own for better control and reliability.

#### 2. Deploy Your Own (Production)

Copy the facilitator implementation from the repository:
- `app/api/facilitator/verify/route.ts`
- `app/api/facilitator/settle/route.ts`

Deploy to:
- Same Next.js app (simplest)
- Separate microservice (recommended for scale)
- Serverless functions (Vercel, AWS Lambda, etc.)

See [Facilitator Guide](https://github.com/adipundir/aptos-x402/blob/main/examples/facilitator) for full setup instructions.

## FAQ

### Why not just use API keys?

- **No key management** - No secrets to rotate or leak
- **Pay-per-use** - No subscriptions or upfront costs
- **Decentralized** - No central auth server
- **Monetization built-in** - Get paid automatically

### How fast are payments?

- **Verification**: < 50ms (cryptographic validation only)
- **Settlement**: 1-3 seconds (Aptos blockchain finality)
- **Total**: ~1-3 seconds for full payment confirmation

### What are the costs?

- **Client pays**: Transaction gas (~0.0001 APT) + your API price
- **Server pays**: Nothing! Just host the facilitator
- **Protocol fees**: None, x402 is free and open source

### Can I use this with other blockchains?

This package is Aptos-specific. For other chains:
- Ethereum: `@x402/ethereum` (coming soon)
- Solana: `@x402/solana` (coming soon)
- Sui: `@x402/sui` (coming soon)

### Is this production-ready?

Yes! The protocol is designed for production use. However:
- ⚠️ Start with testnet for development
- ⚠️ Test thoroughly before mainnet deployment
- ⚠️ Monitor facilitator health and security

## Contributing

Contributions welcome! Feel free to open issues or submit pull requests.

## License

MIT © Aditya Pundir

## Links

- [GitHub Repository](https://github.com/adipundir/aptos-x402)
- [NPM Package](https://www.npmjs.com/package/aptos-x402)
- [x402 Protocol Spec](https://github.com/coinbase/x402)
- [Aptos Developer Docs](https://aptos.dev)

## Support

- 🐛 [Report Issues](https://github.com/adipundir/aptos-x402/issues)
- 💬 [Discussions](https://github.com/adipundir/aptos-x402/discussions)
- 🐦 Twitter: [@adipundir](https://x.com/adipundir)

---

Built with ❤️ for the Aptos ecosystem

