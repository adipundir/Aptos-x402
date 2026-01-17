# Aptos x402

**x402 v2 compliant** HTTP 402 Payment Required implementation for Aptos. Enable pay-per-request API monetization with USDC micropayments.

> ⚠️ **v1 is deprecated.** This package implements x402 v2 protocol only.

## Quick Start

**Sellers** - Protect your API:

```typescript
// proxy.ts
import { paymentMiddleware } from 'aptos-x402';

export const proxy = paymentMiddleware(
  '0xYOUR_WALLET_ADDRESS',  // Your wallet that receives USDC payments
  {
    '/api/data': {
      price: '1000',         // 0.001 USDC (6 decimals)
      network: 'aptos:1',    // aptos:1 = mainnet, aptos:2 = testnet
      asset: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',  // USDC mainnet
      sponsored: true,       // Facilitator pays gas fees (default: true)
    }
  },
  { url: 'https://aptos-x402.org/api/facilitator' }  // Public facilitator
);

export const config = { matcher: ['/api/:path*'] };
```

**Buyers** - Access paid APIs:

```typescript
import { x402axios } from 'aptos-x402';

const response = await x402axios.get('https://api.example.com/data', {
  privateKey: '0xYOUR_PRIVATE_KEY'  // Signs transactions locally, never sent to server
});

console.log(response.data);
console.log(response.paymentInfo?.transactionHash);  // Payment receipt
```

## Why x402?

Pay-per-request instead of subscriptions. Cryptographic signatures instead of API keys. Near-zero fees (~$0.0001) instead of 2.9% + 30¢. One middleware file instead of complex billing integration.

## Why Aptos?

1-3s finality for real-time responses. USDC support for stable pricing. Gas sponsorship for gasless transactions.

## USDC Addresses (Circle)

| Network | Address |
|---------|---------|
| Mainnet (`aptos:1`) | `0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b` |
| Testnet (`aptos:2`) | `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832` |

## Public Facilitator

Use `https://aptos-x402.org/api/facilitator` for development and testing. Gas sponsorships are free as an introductory offer under limited usage.

## Protocol Version

This package implements **x402 v2 protocol only**. If you see references to v1 anywhere, it is deprecated and not supported.

## Documentation

- [Quickstart for Sellers](getting-started/quickstart-sellers.md)
- [Quickstart for Buyers](getting-started/quickstart-buyers.md)
- [HTTP 402 Protocol](core-concepts/http-402.md)
- [API Reference](api-reference/server-api.md)

## Links

- [GitHub](https://github.com/adipundir/aptos-x402)
- [npm](https://www.npmjs.com/package/aptos-x402)
- [x402 Protocol Spec](https://github.com/coinbase/x402)
