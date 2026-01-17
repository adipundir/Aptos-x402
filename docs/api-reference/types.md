# Types Reference

TypeScript types exported by aptos-x402.

## Importing

```typescript
import {
  // Constants
  X402_VERSION,
  APTOS_SCHEME,
  APTOS_MAINNET,
  APTOS_TESTNET,
  PAYMENT_HEADER,
  PAYMENT_RESPONSE_HEADER,
  KNOWN_ASSETS,
  
  // Client
  x402axios,
  
  // Server
  paymentMiddleware,
  
  // Types
  type PaymentRequirements,
  type PaymentPayload,
  type RouteConfig,
  type X402Response,
} from 'aptos-x402';
```

## Server Types

### RouteConfig

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
```

### FacilitatorConfig

```typescript
interface FacilitatorConfig {
  url: string; // Facilitator URL
}
```

## Protocol Types

### PaymentRequirements

```typescript
interface PaymentRequirements {
  scheme: string;              // "exact"
  network: string;             // CAIP-2 format (e.g., "aptos:2")
  amount: string;              // Amount in atomic units
  asset: string;               // Fungible asset metadata address
  payTo: string;               // Recipient address
  maxTimeoutSeconds: number;
  extra?: {
    sponsored?: boolean;       // Gas sponsorship
  } | null;
}
```

### PaymentPayload

```typescript
interface PaymentPayload {
  x402Version: number;
  resource: { url: string; mimeType?: string };
  accepted: PaymentRequirements;
  payload: {
    transaction: string;       // Base64 encoded BCS transaction
  };
}
```

### Facilitator Types

```typescript
interface VerifyRequest {
  x402Version: number;
  paymentHeader: string;
  paymentRequirements: PaymentRequirements;
}

interface VerifyResponse {
  isValid: boolean;
  invalidReason: string | null;
}

interface SettleRequest {
  x402Version: number;
  paymentHeader: string;
  paymentRequirements: PaymentRequirements;
}

interface SettleResponse {
  success: boolean;
  transaction: string | null;
  network: string | null;
  payer: string | null;
  error?: string | null;
}
```

## Client Types

```typescript
interface X402RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  privateKey?: string;
  account?: Account;
}

interface X402Response<T = any> {
  status: number;
  data: T;
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

## Constants

```typescript
const X402_VERSION = 2;
const APTOS_SCHEME = "exact";
const APTOS_MAINNET = "aptos:1";
const APTOS_TESTNET = "aptos:2";
const PAYMENT_HEADER = "PAYMENT-SIGNATURE";
const PAYMENT_RESPONSE_HEADER = "PAYMENT-RESPONSE";

const KNOWN_ASSETS = {
  USDC_MAINNET: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b",
  USDC_TESTNET: "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832",
};
```

## Examples

### Server Configuration

```typescript
import { paymentMiddleware } from 'aptos-x402';

export const proxy = paymentMiddleware(
  process.env.RECIPIENT!,
  {
    '/api/weather': {
      price: '1000',
      network: 'aptos:2',
      asset: process.env.USDC_TESTNET_ADDRESS!,
    },
  },
  { url: process.env.FACILITATOR_URL! }
);
```

### Client Request

```typescript
import { x402axios } from 'aptos-x402';

const response = await x402axios.get('https://api.example.com/data', {
  privateKey: '0x...'
});

console.log(response.data);
console.log(response.paymentInfo?.transactionHash);
```
