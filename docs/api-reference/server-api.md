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

Your Aptos wallet address that will receive USDC payments.

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
    price: '1000',                    // 0.001 USDC
    network: 'aptos:2',               // CAIP-2 format
    asset: '0x69091fbab...',          // USDC address
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
  url: 'https://aptos-x402.org/api/facilitator'
}
```

### RouteConfig

```typescript
interface RouteConfig {
  price: string;                   // Amount in atomic units (USDC has 6 decimals)
  network?: string;                // CAIP-2 format: "aptos:1" or "aptos:2"
  asset: string;                   // USDC fungible asset metadata address (REQUIRED)
  sponsored?: boolean;             // Facilitator sponsors gas (default: true)
  config?: {
    description?: string;          // Human-readable description
    maxTimeoutSeconds?: number;    // Max wait time (default: 60)
  };
}
```

### FacilitatorConfig

```typescript
interface FacilitatorConfig {
  url: string;  // Facilitator URL (without /verify or /settle)
}
```

### Returns

Next.js middleware function for export.

### Example

```typescript
// proxy.ts
import { paymentMiddleware } from 'aptos-x402';

const USDC = process.env.APTOS_NETWORK === "aptos:1"
  ? process.env.USDC_MAINNET_ADDRESS!
  : process.env.USDC_TESTNET_ADDRESS!;

export const proxy = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/weather': {
      price: '1000',
      network: process.env.APTOS_NETWORK!,
      asset: USDC,
      config: { description: 'Weather data' }
    },
    '/api/premium/stocks': {
      price: '5000',
      network: process.env.APTOS_NETWORK!,
      asset: USDC,
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

### Without PAYMENT-SIGNATURE Header

Returns 402 with payment requirements:

```json
{
  "x402Version": 2,
  "accepts": [{
    "scheme": "exact",
    "network": "aptos:2",
    "amount": "1000",
    "asset": "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832",
    "payTo": "0x742d35Cc...",
    "maxTimeoutSeconds": 60,
    "extra": { "sponsored": true }
  }]
}
```

### With Valid PAYMENT-SIGNATURE Header

1. Verifies payment structure via `/verify`
2. Settles payment via `/settle` (facilitator sponsors gas)
3. Calls your API route handler
4. Returns response with `PAYMENT-RESPONSE` header

### With Invalid PAYMENT-SIGNATURE Header

Returns 403 with error details:

```json
{
  "error": "Payment verification failed",
  "message": "Asset mismatch"
}
```

## Response Headers

### PAYMENT-RESPONSE

Base64-encoded settlement details:

```json
{
  "success": true,
  "transaction": "0x5f2e...",
  "network": "aptos:2",
  "payer": "geomi-sponsored"
}
```

### Verification-Time

Payment verification time (milliseconds):

```
Verification-Time: 85
```

### Settlement-Time

Blockchain settlement time (milliseconds):

```
Settlement-Time: 1234
```

## Environment Variables

### Required

```bash
PAYMENT_RECIPIENT_ADDRESS=0xYOUR_ADDRESS
FACILITATOR_URL=https://aptos-x402.org/api/facilitator
APTOS_NETWORK=aptos:2
USDC_MAINNET_ADDRESS=0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b
USDC_TESTNET_ADDRESS=0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832
GEOMI_API_KEY=your_api_key
```

## Error Handling

| Status | Meaning |
|--------|---------|
| **402** | Payment required |
| **403** | Payment verification failed |
| **400** | Malformed payment payload |
| **500** | Internal server error |

## USDC Addresses

| Network | Address |
|---------|---------|
| **Mainnet** (`aptos:1`) | `0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b` |
| **Testnet** (`aptos:2`) | `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832` |

## Next Steps

- [Types Reference](types.md)
- [Quickstart for Sellers](../getting-started/quickstart-sellers.md)
