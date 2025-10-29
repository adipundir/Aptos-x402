# Aptos x402

<div align="center">

**HTTP 402 Payment Protocol SDK for Aptos Blockchain**

[![npm version](https://img.shields.io/npm/v/aptos-x402.svg)](https://www.npmjs.com/package/aptos-x402)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)](https://nextjs.org/)

[Documentation](https://aptos-x402.vercel.app/docs) • [API Reference](#api-reference) • [Demo](https://aptos-x402.vercel.app)

</div>

---

## Overview

**Aptos x402** is a TypeScript SDK implementing the [x402 payment protocol](https://github.com/coinbase/x402) for the Aptos blockchain. Enable your APIs to require cryptocurrency payments before serving responses using the standardized HTTP 402 status code.

Built for **machine-to-machine micropayments**, this SDK provides zero-friction payment integration for Next.js applications with automatic payment handling, cryptographic verification, and sub-3-second settlement times.

<!-- ## Key Features

-  **Sub-3s Settlement** - Aptos blockchain finality in 1-3 seconds
-  **Cryptographically Secure** - Client-side signing, no key exposure
-  **Axios-Compatible Client** - Drop-in replacement with automatic payment handling
- 🛡️ **Zero-Config Middleware** - Protect Next.js routes without touching API code
- 🤖 **AI Agent Ready** - Perfect for autonomous machine-to-machine payments
- 📦 **TypeScript Native** - Fully typed with comprehensive IntelliSense
- 🌐 **Production Ready** - Battle-tested with comprehensive error handling
- 💰 **Free Public Facilitator** - Start building immediately, no infrastructure required -->

## Use Cases

| Use Case | Description |
|----------|-------------|
| **Pay-per-API-Call** | Monetize APIs without subscriptions or rate limits |
| **AI Agent Payments** | Enable autonomous agents to pay for resources |
| **Metered Services** | Charge exactly for what's consumed in real-time |
| **Micropayments** | Enable sub-cent transactions economically |
| **Decentralized Access** | Replace API keys with cryptographic payments |

## Quick Start

### Installation

```bash
npm install aptos-x402
```

### Requirements

- **Next.js:** 15.0.0 or higher
- **Node.js:** 20.0.0 or higher
- **TypeScript:** 5.x (recommended)
- **Aptos SDK:** 1.26.0 or higher (included as peer dependency)

---

## 🛒 Client Integration (Consuming Paid APIs)

Access x402-protected APIs with zero configuration. The `x402axios` client automatically detects payment requirements, builds transactions, and handles the entire payment flow.

### Basic Usage

```typescript
import { x402axios } from 'aptos-x402';

const response = await x402axios.get('https://api.example.com/premium/data', {
  privateKey: process.env.APTOS_PRIVATE_KEY
});

// Access response data
console.log(response.data);

// Verify payment details
console.log('Transaction:', response.paymentInfo?.transactionHash);
console.log('Amount:', response.paymentInfo?.amount);
```

### Supported HTTP Methods

```typescript
// GET with parameters
await x402axios.get('/data', {
  privateKey: process.env.APTOS_PRIVATE_KEY,
  params: { filter: 'active' }
});

// POST with body
await x402axios.post('/analyze', 
  { text: 'Content to analyze' },
  { privateKey: process.env.APTOS_PRIVATE_KEY }
);

// PUT, PATCH, DELETE
await x402axios.put('/resource/123', data, { privateKey: '0x...' });
await x402axios.patch('/resource/123', updates, { privateKey: '0x...' });
await x402axios.delete('/resource/123', { privateKey: '0x...' });
```

### Instance Configuration

```typescript
// Create configured instance
const api = x402axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  privateKey: process.env.APTOS_PRIVATE_KEY,
  headers: { 'X-Client-Version': '1.0.0' }
});

// Use instance for all requests
const weather = await api.get('/premium/weather');
const stocks = await api.get('/premium/stocks');
```

### How It Works

The client automatically handles the complete payment flow:

1. **Initial Request** - Sends HTTP request to protected endpoint
2. **402 Detection** - Identifies payment requirement from response
3. **Transaction Building** - Constructs Aptos transfer transaction
4. **Client Signing** - Signs transaction locally (keys never leave client)
5. **Payment Retry** - Resubmits request with X-PAYMENT header
6. **Settlement** - Server verifies and submits to blockchain
7. **Response** - Receives data after confirmed payment

---

## 🏪 Server Integration (Monetizing Your APIs)

Protect Next.js API routes with x402 middleware - zero payment code required in your route handlers.

### Step 1: Configure Environment

Create `.env.local` in your project root:

```env
PAYMENT_RECIPIENT_ADDRESS=0xYOUR_APTOS_WALLET_ADDRESS
FACILITATOR_URL=https://aptos-x402.vercel.app/api/facilitator
```

> **Getting a Wallet Address:**  
> Install [Petra Wallet](https://petra.app/) or generate programmatically with `@aptos-labs/ts-sdk`

### Step 2: Create Middleware

Create `middleware.ts` in your project root (same level as `app/` directory):

```typescript
import { paymentMiddleware } from 'aptos-x402';

export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/weather': {
      price: '1000000',  // 0.01 APT (1 APT = 100,000,000 Octas)
      network: 'testnet',
      config: {
        description: 'Premium weather data access',
        mimeType: 'application/json'
      }
    },
    '/api/premium/stocks': {
      price: '5000000',  // 0.05 APT
      network: 'testnet',
      config: { description: 'Real-time stock data' }
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

### Step 3: Create Protected Routes

Your API routes require **zero payment logic** - the middleware handles everything:

```typescript
// app/api/premium/weather/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Execution only reaches here AFTER successful payment settlement
  
  return NextResponse.json({
    location: 'San Francisco',
    temperature: 72,
    condition: 'Sunny',
    forecast: '7-day detailed forecast data...'
  });
}
```

### Middleware Behavior

| Scenario | Response |
|----------|----------|
| No payment header | **402 Payment Required** with payment instructions |
| Invalid payment | **403 Forbidden** with error details |
| Valid payment | **Verifies → Settles → Executes route → 200 OK** |

### Price Configuration

Aptos uses **Octas** as the smallest unit (like satoshis or wei):

```typescript
1 APT = 100,000,000 Octas

Common prices:
  0.001 APT = 100,000 Octas
  0.01 APT  = 1,000,000 Octas
  0.1 APT   = 10,000,000 Octas
  1 APT     = 100,000,000 Octas
```

### Testing Your Integration

Start your development server and verify payment protection:

```bash
npm run dev

# Test without payment (should return 402)
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
    "description": "Premium weather data access",
    "resource": "http://localhost:3000/api/premium/weather"
  }]
}
```

Test with payment using the client:
```typescript
import { x402axios } from 'aptos-x402';

const response = await x402axios.get('http://localhost:3000/api/premium/weather', {
  privateKey: process.env.APTOS_PRIVATE_KEY
});
```

---

## Architecture

### Protocol Flow

```
┌──────────┐                 ┌──────────┐              ┌────────────┐         ┌───────────┐
│  Client  │                 │   API    │              │ Facilitator│         │   Aptos   │
│  (Buyer) │                 │ (Seller) │              │  Service   │         │Blockchain │
└────┬─────┘                 └────┬─────┘              └─────┬──────┘         └─────┬─────┘
     │                            │                          │                      │
     │ GET /api/premium/data      │                          │                      │
     │───────────────────────────>│                          │                      │
     │                            │                          │                      │
     │ 402 Payment Required       │                          │                      │
     │<───────────────────────────│                          │                      │
     │ {scheme, amount, payTo}    │                          │                      │
     │                            │                          │                      │
     │ [Build & Sign Transaction] │                          │                      │
     │ (Client-side, offline)     │                          │                      │
     │                            │                          │                      │
     │ GET /api/premium/data      │                          │                      │
     │ X-PAYMENT: <signed_tx>     │                          │                      │
     │───────────────────────────>│                          │                      │
     │                            │                          │                      │
     │                            │ POST /verify             │                      │
     │                            │─────────────────────────>│                      │
     │                            │ {isValid: true}          │                      │
     │                            │<─────────────────────────│                      │
     │                            │                          │                      │
     │                            │ POST /settle             │                      │
     │                            │─────────────────────────>│                      │
     │                            │                          │ Submit Transaction  │
     │                            │                          │────────────────────>│
     │                            │                          │ Confirmed (1-3s)     │
     │                            │                          │<────────────────────│
     │                            │ {success, txHash}        │                      │
     │                            │<─────────────────────────│                      │
     │                            │                          │                      │
     │ 200 OK + Data              │                          │                      │
     │<───────────────────────────│                          │                      │
     │ X-PAYMENT-RESPONSE: {...}  │                          │                      │
     │                            │                          │                      │
```

### Components

| Component | Responsibility | Location |
|-----------|----------------|----------|
| **Client** | Request resources, sign transactions | Your application/agent |
| **Middleware** | Intercept requests, enforce payment | Your Next.js server |
| **Facilitator** | Verify & settle payments | Shared service or self-hosted |
| **Aptos Blockchain** | Final settlement & verification | Decentralized network |

### Key Design Principles

- **Client-Side Signing** - Private keys never leave the client
- **Stateless Protocol** - No sessions, cookies, or stored state
- **Atomic Operations** - Payment settles or request fails (no partial states)
- **Transparent** - All transactions verifiable on-chain
- **HTTP Native** - Uses standard status codes and headers

---

## API Reference

### Server-Side API

#### `paymentMiddleware()`

Creates Next.js middleware for x402 payment enforcement.

**Signature:**
```typescript
function paymentMiddleware(
  recipientAddress: string,
  routes: Record<string, RouteConfig>,
  facilitatorConfig: FacilitatorConfig
): NextMiddleware
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `recipientAddress` | `string` | Aptos wallet address to receive payments |
| `routes` | `Record<string, RouteConfig>` | Map of route paths to payment configs |
| `facilitatorConfig` | `FacilitatorConfig` | Facilitator service configuration |

**RouteConfig:**
```typescript
interface RouteConfig {
  price: string;                    // Amount in Octas
  network?: 'testnet' | 'mainnet';  // Default: 'testnet'
  config?: {
    description?: string;           // Human-readable description
    mimeType?: string;              // Response content type
    outputSchema?: object;          // Optional JSON schema
    maxTimeoutSeconds?: number;     // Request timeout
  };
}
```

**FacilitatorConfig:**
```typescript
interface FacilitatorConfig {
  url: string;  // Base URL (e.g., 'https://example.com/api/facilitator')
}
```

### Client-Side API

#### `x402axios`

Axios-compatible HTTP client with automatic x402 payment handling.

**Methods:**
```typescript
x402axios.get(url, config?)
x402axios.post(url, data?, config?)
x402axios.put(url, data?, config?)
x402axios.patch(url, data?, config?)
x402axios.delete(url, config?)
x402axios.request(config)
x402axios.create(defaultConfig)
```

**Configuration:**
```typescript
interface X402AxiosConfig extends AxiosRequestConfig {
  privateKey?: string;    // Aptos private key (hex string)
  account?: Account;      // Or Aptos Account object
}
```

**Response:**
```typescript
interface X402Response<T = any> extends AxiosResponse<T> {
  paymentInfo?: {
    transactionHash: string;
    amount: string;
    recipient: string;
    network: string;
    settled: boolean;
  };
}
```

### TypeScript Types

Import types for full type safety:

```typescript
import type {
  RouteConfig,
  FacilitatorConfig,
  PaymentRequiredResponse,
  PaymentRequirements,
  PaymentPayload
} from 'aptos-x402/types';
```

---

## Advanced Usage

### Manual Payment Flow

For full control over the payment process:

```typescript
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

async function manualPaymentFlow(url: string, privateKey: string) {
  // 1. Request without payment
  let response = await fetch(url);
  
  if (response.status === 402) {
    const paymentReqs = await response.json();
    const requirement = paymentReqs.accepts[0];
    
    // 2. Initialize Aptos client
    const config = new AptosConfig({ 
      network: requirement.network === 'aptos-testnet' ? Network.TESTNET : Network.MAINNET 
    });
    const aptos = new Aptos(config);
    const account = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(privateKey)
    });
    
    // 3. Build and sign transaction
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: '0x1::aptos_account::transfer',
        functionArguments: [requirement.payTo, requirement.maxAmountRequired]
      }
    });
    
    const authenticator = aptos.transaction.sign({ signer: account, transaction });
    
    // 4. Create payment payload
    const paymentPayload = {
      x402Version: 1,
      scheme: requirement.scheme,
      network: requirement.network,
      payload: {
        signature: Buffer.from(authenticator.bcsToBytes()).toString('base64'),
        transaction: Buffer.from(transaction.bcsToBytes()).toString('base64')
      }
    };
    
    // 5. Retry with payment
    response = await fetch(url, {
      headers: {
        'X-PAYMENT': Buffer.from(JSON.stringify(paymentPayload)).toString('base64')
      }
    });
  }
  
  return await response.json();
}
```

### Wallet Integration

For browser applications, integrate with Aptos wallets:

```typescript
// Petra Wallet
import { useWallet } from '@aptos-labs/wallet-adapter-react';

const { signTransaction } = useWallet();
const signedTx = await signTransaction(transaction);
```

---

## Examples & Demo

### Interactive Demo

Try the complete payment flow: **[aptos-x402.vercel.app](https://aptos-x402.vercel.app)**

### Example Code

| Example | Description | Path |
|---------|-------------|------|
| **Simple Seller** | Basic middleware setup | [`examples/simple-seller/`](./examples/simple-seller/) |
| **Facilitator** | Self-hosted facilitator guide | [`examples/facilitator/`](./examples/facilitator/) |
| **Full Demo** | Complete implementation | [`app/`](./app/) |

### CLI Demo

```bash
git clone https://github.com/adipundir/aptos-x402
cd aptos-x402
npm install
npm run dev  # In one terminal

# In another terminal
npx tsx scripts/test-x402-axios.ts
```

## Facilitator

The facilitator handles blockchain operations (verification and settlement) separately from your API server.

### Options

| Option | Best For | Setup |
|--------|----------|-------|
| **Public Facilitator** | Development, testing, POCs | `FACILITATOR_URL=https://aptos-x402.vercel.app/api/facilitator` |
| **Self-Hosted (Same App)** | Small to medium deployments | Copy facilitator routes to your Next.js app |
| **Self-Hosted (Separate)** | Production, high scale | Deploy as standalone service |

### Why Separate?

- **Security** - Isolate blockchain operations
- **Scalability** - Share across multiple APIs
- **Flexibility** - Upgrade independently

See [Facilitator Setup Guide](./docs/guides/facilitator-setup.md) for detailed deployment instructions.

## FAQ

<details>
<summary><strong>Why use x402 instead of API keys?</strong></summary>

- No secrets to manage, rotate, or leak
- True pay-per-use with no subscriptions
- Decentralized with no auth server
- Instant monetization without payment processors

</details>

<details>
<summary><strong>How fast are payments?</strong></summary>

| Operation | Time |
|-----------|------|
| Verification | < 50ms |
| Settlement | 1-3 seconds |
| **Total** | **~1-3 seconds** |

</details>

<details>
<summary><strong>What are the costs?</strong></summary>

| Party | Cost |
|-------|------|
| **Client** | Gas (~$0.0001) + API price |
| **Server** | Facilitator hosting only |
| **Protocol** | Free, open source |

</details>

<details>
<summary><strong>Is this production-ready?</strong></summary>

Yes, with proper testing:
-  Start on testnet for development
-  Thorough testing before mainnet
-  Monitor facilitator health
-  Implement error handling

</details>

<details>
<summary><strong>Can I use other blockchains?</strong></summary>

This SDK is Aptos-specific. x402 protocol supports any blockchain. Other implementations coming soon.

</details>

<details>
<summary><strong>Do I need a blockchain wallet?</strong></summary>

**Sellers:** Need wallet address to receive payments (no private key on server)  
**Buyers:** Need funded wallet to make payments

Generate testnet wallets: `npx tsx scripts/generate-account.ts`

</details>

<details>
<summary><strong>How do AI agents use this?</strong></summary>

Agents can autonomously make payments:
```typescript
const agent = createAgent({ privateKey: process.env.AGENT_KEY });
const data = await x402axios.get(apiUrl, { privateKey: agent.key });
```

No human intervention required.

</details>

---

## Resources

### Documentation
- [Full Documentation](https://aptos-x402.vercel.app/docs)
- [API Reference](./docs/api-reference/server-api.md)
- [Protocol Specification](https://github.com/coinbase/x402)

### Links
- [GitHub Repository](https://github.com/adipundir/aptos-x402)
- [NPM Package](https://www.npmjs.com/package/aptos-x402)
- [Aptos Developer Docs](https://aptos.dev)

### Support
- [Report Issues](https://github.com/adipundir/aptos-x402/issues)
- [Discussions](https://github.com/adipundir/aptos-x402/discussions)
- [Twitter: @aptos-x402](https://x.com/aptosx402)

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## License

MIT © Aditya Pundir

---

<div align="center">

**Built for the Aptos Ecosystem**

[Documentation](https://aptos-x402.vercel.app) • [GitHub](https://github.com/adipundir/aptos-x402) • [NPM](https://www.npmjs.com/package/aptos-x402)

</div>

