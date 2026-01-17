# Client and Server

This page covers what you implement on the client and server when using this SDK.

## What You Build

- **Client:** Makes requests and pays when a 402 is returned
- **Server:** Protects routes and enforces payment with middleware

## Client (Buyer)

Use `x402axios` - it detects 402, builds/signs the transaction, retries with payment, and returns the response.

```typescript
import { x402axios } from 'aptos-x402';

const res = await x402axios.get('https://api.example.com/premium/weather', {
  privateKey: process.env.PRIVATE_KEY!
});

console.log(res.status, res.data);
console.log(res.paymentInfo);
// { transactionHash, amount, recipient, network, payer }
```

**Key behavior:**
1. First request → server responds 402 with payment requirements
2. SDK builds USDC transfer transaction (with fee payer placeholder)
3. Signs locally and retries with `PAYMENT-SIGNATURE` header
4. Facilitator sponsors gas and submits
5. Response includes `PAYMENT-RESPONSE` header

## Server (Seller)

Add middleware and declare which paths require payment:

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
      price: '1000',              // 0.001 USDC
      network: process.env.APTOS_NETWORK!,  // "aptos:2"
      asset: USDC,
      config: { description: 'Premium weather data' }
    }
  },
  { url: process.env.FACILITATOR_URL! }
);

export const config = { matcher: ['/api/premium/:path*'] };
```

**What the middleware does:**
1. No `PAYMENT-SIGNATURE` → returns 402 with PaymentRequirements
2. With `PAYMENT-SIGNATURE`:
   - POST to `<FACILITATOR_URL>/verify`
   - If invalid → 403
   - POST to `<FACILITATOR_URL>/settle`
   - Facilitator sponsors gas and submits
   - Success → continues to your handler, adds `PAYMENT-RESPONSE` header

## Request/Response Contract

### 402 Response Body

```json
{
  "x402Version": 2,
  "accepts": [{
    "scheme": "exact",
    "network": "aptos:2",
    "amount": "1000",
    "asset": "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832",
    "payTo": "0x...",
    "maxTimeoutSeconds": 60,
    "extra": { "sponsored": true }
  }]
}
```

### PAYMENT-SIGNATURE Header (JSON)

```json
{
  "x402Version": 2,
  "resource": { "url": "..." },
  "accepted": { ... },
  "payload": { "transaction": "base64..." }
}
```

### PAYMENT-RESPONSE Header (Base64 JSON)

```json
{
  "success": true,
  "transaction": "0x...",
  "network": "aptos:2",
  "payer": "geomi-sponsored"
}
```

## Status Codes

| Code | Meaning |
|------|---------|
| **402** | Payment required |
| **403** | Verification failed |
| **400** | Malformed payment |
| **500** | Server/facilitator error |

## USDC Addresses

| Network | Address |
|---------|---------|
| **Mainnet** | `0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b` |
| **Testnet** | `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832` |

## Next Steps

- [Types Reference](../api-reference/types.md)
- [Quickstart for Sellers](../getting-started/quickstart-sellers.md)
- [Quickstart for Buyers](../getting-started/quickstart-buyers.md)
