# HTTP 402 Protocol

The x402 protocol standardizes how web services can require payment for resources using the HTTP 402 Payment Required status code.

## Protocol Overview

HTTP status code 402 was reserved in the original HTTP specification (RFC 2616, 1999) but never standardized. The x402 protocol brings this reserved status code to life with blockchain-powered implementation for machine-to-machine micropayments.

## Protocol Flow

1. **Client requests resource** → Server responds 402 with payment requirements
2. **Client signs transaction** → Creates USDC transfer with fee payer placeholder
3. **Client retries with payment** → Includes `PAYMENT-SIGNATURE` header
4. **Server verifies** → Checks transaction matches requirements
5. **Facilitator sponsors & settles** → Geomi pays gas, submits to blockchain
6. **Server delivers resource** → Returns data with `PAYMENT-RESPONSE` header

### Example Flow

```http
GET /api/premium/data HTTP/1.1
Host: api.example.com

→ 402 Payment Required
{
  "x402Version": 2,
  "accepts": [{
    "scheme": "exact",
    "network": "aptos:2",
    "amount": "1000",
    "asset": "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832",
    "payTo": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "maxTimeoutSeconds": 60,
    "extra": { "sponsored": true }
  }]
}
```

Client signs and retries:

```http
GET /api/premium/data HTTP/1.1
Host: api.example.com
PAYMENT-SIGNATURE: {"x402Version":2,"resource":{"url":"..."},"accepted":{...},"payload":{"transaction":"..."}}

→ 200 OK
PAYMENT-RESPONSE: eyJzdWNjZXNzIjp0cnVlLCJ0cmFuc2FjdGlvbiI6IjB4Li4uIn0=
{ "data": "..." }
```

## Response Structure (402)

```typescript
interface PaymentRequiredResponse {
  x402Version: 2;
  accepts: PaymentRequirements[];
}

interface PaymentRequirements {
  scheme: "exact";
  network: string;              // CAIP-2: "aptos:1" or "aptos:2"
  amount: string;               // USDC atomic units (6 decimals)
  asset: string;                // USDC metadata address
  payTo: string;                // Recipient address
  maxTimeoutSeconds: number;
  extra?: {
    sponsored?: boolean;        // Gas sponsorship enabled
  };
}
```

## Payment Header (PAYMENT-SIGNATURE)

Clients include payment as JSON (not base64):

```typescript
interface PaymentPayload {
  x402Version: 2;
  resource: {
    url: string;
    description?: string;
  };
  accepted: PaymentRequirements;
  payload: {
    transaction: string;        // Base64 BCS-encoded transaction
  };
}
```

The transaction is a USDC transfer via `0x1::primary_fungible_store::transfer` with fee payer set to `0x0` (placeholder for Geomi sponsorship).

## Response Header (PAYMENT-RESPONSE)

Base64-encoded JSON with settlement details:

```typescript
interface PaymentResponse {
  success: boolean;
  transaction: string | null;   // Transaction hash
  network: string | null;       // "aptos:1" or "aptos:2"
  payer: string | null;         // Fee payer address
  error?: string;
}
```

## USDC Addresses

| Network | Address |
|---------|---------|
| **Mainnet** (`aptos:1`) | `0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b` |
| **Testnet** (`aptos:2`) | `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832` |

## Security Model

- Private keys never leave the client
- Transactions are signed locally
- Facilitator only verifies and submits pre-signed transactions
- Geomi sponsors gas without access to user funds
- All payments are verifiable on-chain

## Next Steps

- [Client / Server Architecture](client-server.md)
- [Facilitator](facilitator.md)
