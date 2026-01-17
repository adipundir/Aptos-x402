# SDK Exports

## Overview

The `aptos-x402` SDK provides functions for both **buyers** (consuming paid APIs) and **sellers** (creating paid APIs).

---

## For Buyers (Consuming Paid APIs)

### **Recommended: `x402axios`**

The simplest way to access x402-protected APIs with automatic payment handling.

```typescript
import { x402axios } from 'aptos-x402';

// Payment handled automatically!
const response = await x402axios.get('https://api.example.com/protected/data', {
  privateKey: '0x...'
});

console.log(response.data);
console.log(response.paymentInfo); // { transactionHash, amount, ... }
```

**Features:**
- Axios-compatible - Drop-in replacement
- Automatically detects 402 responses
- Builds and signs transactions (gasless!)
- Retries with payment
- Returns data + payment info

**Types:**
```typescript
interface X402RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  privateKey?: string;
  account?: Account;
}

interface X402Response<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  paymentInfo?: {
    transactionHash: string;
    amount: string;
    recipient: string;
    network: string;
    payer: string;
  };
}
```

---

## For Sellers (Creating Paid APIs)

### **Recommended: `paymentMiddleware`**

Create payment-protected API routes in Next.js.

```typescript
import { paymentMiddleware } from 'aptos-x402';

export const proxy = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/protected/weather': {
      price: '1000',           // USDC amount (6 decimals)
      network: 'aptos:2',      // CAIP-2 format
      asset: process.env.USDC_TESTNET_ADDRESS!,
    },
  },
  { url: process.env.FACILITATOR_URL! }
);

export const config = {
  matcher: ['/api/protected/:path*'],
};
```

**Types:**
```typescript
interface RouteConfig {
  price: string;              // Amount in atomic units
  network?: string;           // CAIP-2 format (aptos:1, aptos:2)
  asset: string;              // Fungible asset metadata address
  sponsored?: boolean;        // Enable gas sponsorship (default: true)
  config?: {
    description?: string;
    maxTimeoutSeconds?: number;
  };
}

interface FacilitatorConfig {
  url: string;
}
```

---

## Utility Functions

```typescript
import {
  getAptosClient,
  getAccountFromPrivateKey,
  getFungibleAssetBalance,
  getChainId,
} from 'aptos-x402';

// Get Aptos client
const aptos = getAptosClient('aptos:2');

// Get account from private key
const account = getAccountFromPrivateKey('0x...');

// Check USDC balance
const balance = await getFungibleAssetBalance(aptos, address, usdcMetadata);
```

---

## Gas Sponsorship (Geomi)

```typescript
import { getGasStation, initGasStation } from 'aptos-x402';

// Uses GEOMI_API_KEY from environment
const gasStation = getGasStation();

// Or initialize with custom config
initGasStation({ apiKey: 'your-key', network: Network.TESTNET });
```

---

## ARC-8004 Trust Layer

```typescript
import {
  IdentityRegistry,
  ReputationRegistry,
  ValidationRegistry,
  createAgentCard,
  calculateTrustLevel,
  TrustLevel,
} from 'aptos-x402';
```

---

## Complete Export List

### **Buyer Functions**
- `x402axios` - HTTP client with automatic payment
- `decodePaymentResponse` - Decode payment response headers

### **Seller Functions**
- `paymentMiddleware` - Next.js middleware for protected routes

### **Protocol Constants**
- `X402_VERSION` - Protocol version (2)
- `APTOS_SCHEME` - Payment scheme ("exact")
- `APTOS_MAINNET` - Mainnet identifier ("aptos:1")
- `APTOS_TESTNET` - Testnet identifier ("aptos:2")
- `PAYMENT_HEADER` - Request header name
- `PAYMENT_RESPONSE_HEADER` - Response header name
- `KNOWN_ASSETS` - Known asset addresses (USDC)

### **Utilities**
- `getAptosClient` - Get configured Aptos client
- `getAccountFromPrivateKey` - Create account from key
- `getFungibleAssetBalance` - Check fungible asset balance
- `accountExists` - Check if account exists
- `getChainId` - Get chain ID from network
- `validateCAIP2Network` - Validate network format
- `parseCAIP2Network` - Parse CAIP-2 network

### **Gas Sponsorship**
- `GeomiGasStation` - Gas station class
- `getGasStation` - Get singleton instance
- `initGasStation` - Initialize with config
- `getFeePayerPlaceholder` - Get placeholder address
- `isPlaceholderFeePayer` - Check if placeholder

### **Types**
- `X402RequestConfig`, `X402Response`, `X402PaymentResponse`
- `RouteConfig`, `FacilitatorConfig`
- `PaymentRequirements`, `PaymentPayload`
- `VerifyRequest`, `VerifyResponse`
- `SettleRequest`, `SettleResponse`
- `GasStationConfig`, `SponsorResult`

---

## Quick Start

### **Buyer**
```typescript
import { x402axios } from 'aptos-x402';

const response = await x402axios.get('https://api.example.com/data', {
  privateKey: process.env.PRIVATE_KEY!
});
console.log(response.data);
```

### **Seller**
```typescript
import { paymentMiddleware } from 'aptos-x402';

export const proxy = paymentMiddleware(
  process.env.RECIPIENT!,
  { '/api/data': { price: '1000', network: 'aptos:2', asset: USDC } },
  { url: process.env.FACILITATOR_URL! }
);
```
