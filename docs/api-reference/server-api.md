# Server API Reference

Complete API reference for the server-side x402 SDK.

## `paymentMiddleware()`

Creates Next.js middleware that protects routes with x402 payment requirements.

### Signature

```typescript
function paymentMiddleware(
  recipientAddress: string,
  routes: Record<string, RouteConfig>,
  facilitatorConfig: FacilitatorConfig
): NextMiddleware
```

### Parameters

#### `recipientAddress` (string, required)

Your Aptos wallet address that will receive payments.

```typescript
paymentMiddleware(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  // ...
)
```

#### `routes` (Record<string, RouteConfig>, required)

Map of route paths to their payment configurations.

```typescript
{
  '/api/premium/weather': {
    price: '1000000',
    network: 'testnet',
    config: {
      description: 'Premium weather data'
    }
  }
}
```

#### `facilitatorConfig` (FacilitatorConfig, required)

Facilitator service configuration.

```typescript
{
  url: 'https://facilitator.example.com/api/facilitator'
}
```

### RouteConfig

```typescript
interface RouteConfig {
  price: string;                   // Amount in Octas
  network?: string;                // e.g. 'testnet' | 'mainnet' | 'devnet' (default: 'testnet')
  config?: {
    description?: string;          // Human-readable description
    mimeType?: string;             // Response content type
    outputSchema?: Record<string, any>; // Optional JSON schema of response
    maxTimeoutSeconds?: number;    // Max wait time
  };
}
```

### FacilitatorConfig

```typescript
interface FacilitatorConfig {
  url: string;  // Base facilitator URL (without /verify or /settle)
}
```

### Returns

Next.js middleware function that can be exported as `middleware`.

### Example

```typescript
// middleware.ts
import { paymentMiddleware } from 'aptos-x402';

export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/weather': {
      price: '1000000',
      network: 'testnet',
      config: { description: 'Weather data' }
    },
    '/api/premium/stocks': {
      price: '5000000',
      network: 'testnet',
      config: { description: 'Stock data' }
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

## Middleware Behavior

### Without X-PAYMENT Header

Returns 402 with payment requirements:

```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "aptos-testnet",
    "maxAmountRequired": "1000000",
    "payTo": "0x742d35Cc...",
    "description": "Weather data",
    "resource": "http://localhost:3000/api/premium/weather"
  }]
}
```

### With Valid X-PAYMENT Header

1. Verifies payment structure
2. Settles payment on blockchain
3. Calls your API route handler
4. Returns response with X-PAYMENT-RESPONSE header

### With Invalid X-PAYMENT Header

Returns 403 with error details:

```json
{
  "error": "Payment verification failed",
  "message": "Invalid signature"
}
```

## Response Headers

### X-PAYMENT-RESPONSE

Included in successful responses with settlement details:

```
X-PAYMENT-RESPONSE: eyJzZXR0bGVtZW50Ijp7InR4SGFzaCI6Ij...
```

Decoded:
```json
{
  "settlement": {
    "success": true,
    "txHash": "0x5f2e...",
    "networkId": "aptos-testnet",
    "error": null
  }
}
```

### X-Verification-Time

Time taken for payment verification (milliseconds):

```
X-Verification-Time: 45
```

### X-Settlement-Time

Time taken for blockchain settlement (milliseconds):

```
X-Settlement-Time: 1234
```

## Environment Variables

### Required

```
PAYMENT_RECIPIENT_ADDRESS=0xYOUR_ADDRESS
FACILITATOR_URL=https://facilitator.example.com/api/facilitator
```

### Optional

None.

### Public test facilitator

For development and quick testing, you can point your middleware to the public demo facilitator:

```
FACILITATOR_URL=https://aptos-x402.vercel.app/api/facilitator
```

Note: This shared service is for demos only. Don’t use it for production.

## Error Handling

The middleware handles errors gracefully and returns appropriate status codes:

- **402**: Payment required or payment failed
- **403**: Payment verification failed
- **400**: Malformed payment payload
- **500**: Internal server error (facilitator unreachable, etc.)

## Type Exports

Import types for TypeScript:

```typescript
import type {
  RouteConfig,
  FacilitatorConfig,
  PaymentRequiredResponse,
  PaymentRequirements
} from 'aptos-x402/types';
```

## Next Steps

- [Types Reference](types.md)
- [Quickstart for Sellers](../getting-started/quickstart-sellers.md)
- [Quickstart for Buyers](../getting-started/quickstart-buyers.md)

---

**Back to:** [API Reference](#)

