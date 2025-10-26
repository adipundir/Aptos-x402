# Types Reference

Complete TypeScript type definitions for x402.

## Import Types

```typescript
import type {
  // Server types
  RouteConfig,
  FacilitatorConfig,
  
  // Protocol types
  PaymentRequiredResponse,
  PaymentRequirements,
  PaymentPayload,
  PaymentReceipt,
  
  // Client types
  X402ClientOptions,
  RequestOptions
} from '@adipundir/aptos-x402/types';
```

## Server Types

### RouteConfig

Configuration for a protected route.

```typescript
interface RouteConfig {
  price: string;                      // Amount in Octas (smallest unit)
  network?: 'testnet' | 'mainnet';    // Default: 'testnet'
  config?: {
    description?: string;              // Human-readable description
    mimeType?: string;                 // Response MIME type
    outputSchema?: Record<string, any>; // JSON schema of response
    maxTimeoutSeconds?: number;        // Max processing time
  };
}
```

### FacilitatorConfig

Facilitator service configuration.

```typescript
interface FacilitatorConfig {
  url: string;  // Base URL (e.g., 'https://example.com/api/facilitator')
}
```

## Protocol Types

### PaymentRequiredResponse

402 response body format.

```typescript
interface PaymentRequiredResponse {
  x402Version: number;                  // Protocol version (1)
  accepts: PaymentRequirements[];       // Payment options
  error?: string;                       // Error message if applicable
}
```

### PaymentRequirements

Payment requirements for a specific option.

```typescript
interface PaymentRequirements {
  scheme: string;                       // Payment scheme ('exact')
  network: string;                      // Network ID ('aptos-testnet')
  maxAmountRequired: string;            // Amount in smallest unit
  payTo: string;                        // Recipient address
  description?: string;                 // Description
  resource: string;                     // Resource URL
  mimeType?: string;                    // Response type
  outputSchema?: Record<string, any>;   // Response schema
  maxTimeoutSeconds?: number;           // Max timeout
}
```

### PaymentPayload

Client payment payload structure.

```typescript
interface PaymentPayload {
  x402Version: number;                  // Protocol version
  scheme: string;                       // Scheme used
  network: string;                      // Network used
  payload: {
    transaction: string;                // Base64-encoded BCS transaction
    signature: string;                  // Base64-encoded BCS signature
  };
}
```

### PaymentReceipt

Server payment receipt structure.

```typescript
interface PaymentReceipt {
  x402Version: number;                  // Protocol version
  settlement: {
    txHash: string;                     // Transaction hash
    networkId: string;                  // Network where settled
    timestamp?: number;                 // Settlement timestamp
    blockHeight?: number;               // Block number
  };
}
```

## Client Types

### X402ClientOptions

Options for X402Client constructor.

```typescript
interface X402ClientOptions {
  privateKey: string;                   // Aptos private key
  network: 'testnet' | 'mainnet';       // Network to use
  maxRetries?: number;                  // Max retry attempts (default: 3)
  timeout?: number;                     // Request timeout in ms (default: 30000)
}
```

### RequestOptions

Options for client request methods.

```typescript
interface RequestOptions {
  headers?: Record<string, string>;     // Additional headers
  signal?: AbortSignal;                 // Abort signal
  cache?: 'default' | 'no-cache' | 'force-cache';  // Cache policy
}
```

## Facilitator Types

### VerifyRequest

Request to facilitator verify endpoint.

```typescript
interface VerifyRequest {
  x402Version: number;
  paymentHeader: string;                // Base64 payment payload
  paymentRequirements: PaymentRequirements;
}
```

### VerifyResponse

Response from facilitator verify endpoint.

```typescript
interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
}
```

### SettleRequest

Request to facilitator settle endpoint.

```typescript
interface SettleRequest {
  x402Version: number;
  paymentHeader: string;
  paymentRequirements: PaymentRequirements;
}
```

### SettleResponse

Response from facilitator settle endpoint.

```typescript
interface SettleResponse {
  success: boolean;
  txHash: string | null;
  networkId: string;
  error?: string;
}
```

## Aptos-Specific Types

### AptosPaymentPayload

Aptos-specific payment payload format.

```typescript
interface AptosPaymentPayload extends PaymentPayload {
  scheme: 'exact';
  network: 'aptos-testnet' | 'aptos-mainnet';
  payload: {
    transaction: string;  // Base64 BCS-serialized SimpleTransaction
    signature: string;    // Base64 BCS-serialized AccountAuthenticator
  };
}
```

## Constants

### APTOS_DECIMALS

```typescript
const APTOS_DECIMALS = 8;
const OCTAS_PER_APT = 100_000_000;
```

### Networks

```typescript
type AptosNetwork = 'aptos-testnet' | 'aptos-mainnet';
```

### Schemes

```typescript
type PaymentScheme = 'exact';  // More schemes coming
```

## Utility Types

### OctasAmount

Type-safe representation of Aptos amounts.

```typescript
type OctasAmount = string;  // Always string to avoid precision loss

// Helpers
function aptToOctas(apt: number): OctasAmount;
function octasToApt(octas: OctasAmount): number;
```

### NetworkConfig

```typescript
interface NetworkConfig {
  network: AptosNetwork;
  rpcUrl?: string;
}
```

## Examples

### Server Configuration

```typescript
import type { RouteConfig, FacilitatorConfig } from '@adipundir/aptos-x402/types';

const routes: Record<string, RouteConfig> = {
  '/api/premium/weather': {
    price: '1000000',
    network: 'testnet',
    config: {
      description: 'Premium weather data'
    }
  }
};

const facilitator: FacilitatorConfig = {
  url: 'https://facilitator.example.com/api/facilitator'
};
```

### Client Usage

```typescript
import type { 
  PaymentRequiredResponse, 
  PaymentReceipt 
} from '@adipundir/aptos-x402/types';

const response = await fetch(url);

if (response.status === 402) {
  const paymentReq: PaymentRequiredResponse = await response.json();
  // Handle payment
}

// Extract receipt
const receiptHeader = response.headers.get('x-payment-response');
if (receiptHeader) {
  const receipt: PaymentReceipt = JSON.parse(
    Buffer.from(receiptHeader, 'base64').toString()
  );
}
```

## Next Steps

- [Server API Reference](server-api.md)
- [Client API Reference](client-api.md)
- [Core Concepts](../core-concepts/http-402.md)

---

**Back to:** [API Reference](#)

