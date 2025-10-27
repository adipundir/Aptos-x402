# Types Reference

Complete, accurate TypeScript types exported by @adipundir/aptos-x402.

## Importing types

Server and protocol types are available from the /types subpath, while client types come from the root package export.

```typescript
// Server + protocol types
import type {
  // Server
  RouteConfig,
  FacilitatorConfig,
  // Protocol
  PaymentRequiredResponse,
  PaymentRequirements,
  PaymentPayload,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  PaymentResponseHeader,
} from '@adipundir/aptos-x402/types';

// Protocol constants (values)
import {
  X402_VERSION,
  APTOS_SCHEME,
  APTOS_MAINNET,
  APTOS_TESTNET,
  APTOS_DEVNET,
} from '@adipundir/aptos-x402/types';

// Client types
import type {
  WithPaymentInterceptorOptions,
  X402Response,
  X402PaymentResponse,
} from '@adipundir/aptos-x402';
```

## Server types

### RouteConfig

Configuration for a protected route.

```typescript
interface RouteConfig {
  price: string;                    // Amount in Octas (smallest unit)
  network?: string;                 // e.g. 'testnet' | 'mainnet' | 'devnet' (default: 'testnet')
  config?: {
    description?: string;           // Human-readable description
    mimeType?: string;              // Response MIME type
    outputSchema?: Record<string, any>; // JSON schema of response
    maxTimeoutSeconds?: number;     // Max processing time
  };
}
```

### FacilitatorConfig

```typescript
interface FacilitatorConfig {
  url: string; // Base URL (e.g., 'https://example.com/api/facilitator')
}
```

## Protocol types

These mirror the official x402 spec and are used by the middleware and facilitator.

### PaymentRequiredResponse

```typescript
interface PaymentRequiredResponse {
  x402Version: number;
  accepts: PaymentRequirements[];
  error?: string | null;
}
```

### PaymentRequirements

```typescript
interface PaymentRequirements {
  scheme: string;                    // 'exact'
  network: string;                   // e.g. 'aptos-testnet'
  maxAmountRequired: string;         // Amount in smallest unit
  resource: string;                  // Resource URL
  description: string;               // Description
  mimeType: string;                  // Response type
  outputSchema?: object | null;      // Response schema
  payTo: string;                     // Recipient address
  maxTimeoutSeconds: number;         // Max timeout
  extra?: object | null;             // Scheme-specific metadata
}
```

### PaymentPayload

```typescript
interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    signature: string;    // Base64 BCS-encoded signature
    transaction: string;  // Base64 BCS-encoded transaction
  };
}
```

### Facilitator requests/responses

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
  error: string | null;
  message?: string;
  txHash: string | null;
  networkId: string | null;
}

interface PaymentResponseHeader {
  settlement: SettleResponse;
}
```

### Constants

```typescript
const X402_VERSION = 1;
const APTOS_SCHEME = 'exact';
const APTOS_MAINNET = 'aptos-mainnet';
const APTOS_TESTNET = 'aptos-testnet';
const APTOS_DEVNET = 'aptos-devnet';
```

## Client types

```typescript
interface WithPaymentInterceptorOptions {
  privateKey?: string;
  account?: Account;
  url: string;
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

interface X402PaymentResponse {
  settlement?: {
    txHash: string;
    networkId: string;
    success: boolean;
  };
}
```

## Examples

### Server configuration

```typescript
import type { RouteConfig, FacilitatorConfig } from '@adipundir/aptos-x402/types';

const routes: Record<string, RouteConfig> = {
  '/api/premium/weather': {
    price: '1000000',
    network: 'testnet',
    config: {
      description: 'Premium weather data',
    },
  },
};

const facilitator: FacilitatorConfig = {
  url: 'https://facilitator.example.com/api/facilitator',
};
```

### Decoding a payment response header

```typescript
import { decodeXPaymentResponse } from '@adipundir/aptos-x402';
import type { X402PaymentResponse } from '@adipundir/aptos-x402';

const header = response.headers.get('x-payment-response');
const parsed: X402PaymentResponse | null = decodeXPaymentResponse(header);
```

## Next steps

- [Server API Reference](server-api.md)
- [SDK Exports](../SDK-EXPORTS.md)
- [HTTP 402 Protocol](../core-concepts/http-402.md)

---

Back to: [API Reference](#)

