# SDK Exports - Buyer and Seller Functions

## Overview

The `@adipundir/aptos-x402` SDK provides functions for both **buyers** (consuming paid APIs) and **sellers** (creating paid APIs).

---

## For Buyers (Consuming Paid APIs)

### **Recommended: `x402axios`**

The simplest way to access x402-protected APIs. Just provide your private key and URL!

```typescript
import { x402axios } from '@adipundir/aptos-x402';

// Make a request - payment handled automatically!
const response = await x402axios({
  privateKey: '0x...',
  url: 'https://api.example.com/protected/data'
});

console.log(response.data);
console.log(response.paymentInfo); // { transactionHash, amount, ... }
```

**Features:**
- Automatically detects 402 responses
- Extracts payment requirements from response
- Builds and signs transaction
- Retries with payment
- Returns data + payment info

**Types:**
```typescript
interface WithPaymentInterceptorOptions {
  privateKey?: string;           // Private key OR
  account?: Account;             // Aptos account
  url: string;                   // Required
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

interface X402Response<T = any> {
  status: number;
  data: T;
  headers: Record<string, string>;
  paymentInfo?: {
    transactionHash: string;
    amount: string;
    recipient: string;
    settled: boolean;
  };
}
```

### **Helper: `decodeXPaymentResponse`**

Decode the X-Payment-Response header to get payment settlement details.

```typescript
import { decodeXPaymentResponse } from '@adipundir/aptos-x402';

const paymentResponse = decodeXPaymentResponse(
  response.headers['x-payment-response']
);

console.log(paymentResponse?.settlement?.txHash);
```

---

## For Sellers (Creating Paid APIs)

### **Recommended: `paymentMiddleware`**

Create payment-protected API routes in Next.js with simple configuration.

```typescript
import { paymentMiddleware } from '@adipundir/aptos-x402';

export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/weather': {
      price: '1000000',  // 0.01 APT (in Octas)
      network: 'testnet',
      config: { description: 'Premium weather data' },
    },
  },
  { 
    url: 'https://your-domain.com/api/facilitator'
  }
);

export const config = {
  matcher: ['/api/premium/:path*'],
};
```

**Features:**
- Automatically returns 402 for unpaid requests
- Verifies payment signatures
- Settles payments on blockchain
- Returns protected resources
- Adds transaction hash to response headers

**Types:**
```typescript
interface RouteConfig {
  price: string;              // Amount in Octas
  network?: string;           // e.g. 'testnet' | 'mainnet' | 'devnet' (default: 'testnet')
  config?: {
    description?: string;
    mimeType?: string;
    outputSchema?: Record<string, any>;
    maxTimeoutSeconds?: number;
  };
}

interface FacilitatorConfig {
  url: string;                // Base facilitator URL
}
```

### **Advanced: Facilitator Functions**

For custom implementations, use these low-level functions:

```typescript
import { 
  verifyPaymentSimple, 
  settlePaymentSimple,
  createPaymentResponse 
} from '@adipundir/aptos-x402';

// Verify a payment (checks signature only, no blockchain)
const facilitatorBaseUrl = 'https://your-domain.com/api/facilitator';
const signedTransaction = paymentHeader; // base64 X-PAYMENT header value

const verification = await verifyPaymentSimple(
  facilitatorBaseUrl,
  signedTransaction,
  '0xEXPECTED_RECIPIENT',
  '1000000',
  'testnet'
);

// Settle a payment (submit to blockchain)
const settlement = await settlePaymentSimple(
  facilitatorBaseUrl,
  signedTransaction,
  'testnet'
);

// Create X-Payment-Response header payload from settlement result
const header = createPaymentResponse(settlement);
```

---

## Utility Functions

For advanced use cases, the SDK also exports Aptos utilities:

```typescript
import {
  getAptosClient,
  getAccountFromPrivateKey,
  signAndSubmitPayment,
  getAccountBalance,
} from '@adipundir/aptos-x402';

// Get Aptos client
const aptos = getAptosClient('testnet');

// Get account from private key
const account = getAccountFromPrivateKey('0x...');

// Check balance
const balance = await getAccountBalance(aptos, accountAddress);

// Sign and submit payment
const txHash = await signAndSubmitPayment(
  aptos,
  account,
  '0x...', // recipient
  '1000000' // amount
);
```

---

## Complete Export List

### **Buyer Functions**
- `x402axios` - Make paid API requests (RECOMMENDED)
- `decodeXPaymentResponse` - Decode payment response headers

### **Seller Functions**
- `paymentMiddleware` - Next.js middleware for protected routes (RECOMMENDED)
- `verifyPaymentSimple` - Verify payment signatures
- `settlePaymentSimple` - Submit payments to blockchain
- `createPaymentResponse` - Create payment response headers

### **Utilities**
- `getAptosClient` - Get configured Aptos client
- `getAccountFromPrivateKey` - Create account from key
- `signAndSubmitPayment` - Sign and submit transactions
- `getAccountBalance` - Check account balance

### **Types**
- `WithPaymentInterceptorOptions` - Options for buyer requests
- `X402Response` - Response with payment info
- `X402PaymentResponse` - Payment response header structure
- `RouteConfig` - Middleware route configuration
- `FacilitatorConfig` - Facilitator endpoint configuration

---

## Quick Start Examples

### **Buyer Example**
```typescript
import { x402axios } from '@adipundir/aptos-x402';

const response = await x402axios({
  privateKey: process.env.PRIVATE_KEY!,
  url: 'https://api.example.com/premium/data'
});
console.log(response.data);
```

### **Seller Example**
```typescript
import { paymentMiddleware } from '@adipundir/aptos-x402';

export const middleware = paymentMiddleware(
  process.env.RECIPIENT_ADDRESS!,
  { '/api/premium/data': { price: '1000000', network: 'testnet' } },
  { url: process.env.FACILITATOR_URL! }
);
```

---

## Summary

**Buyers need:**
- `x402axios` - One function to rule them all!

**Sellers need:**
- `paymentMiddleware` - One middleware to protect all routes!

That's it! Both sides have simple, one-line solutions.

