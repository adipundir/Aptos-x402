# Client and Server

This page focuses only on what you implement on the client and the server when using this SDK. No extras, no speculation.

## What you build

- Client: makes requests and pays when a 402 is returned.
- Server: protects routes and enforces payment with middleware.

## Client (buyer)

Use the single helper provided by this SDK. It detects 402, builds and signs the transaction, retries with X-PAYMENT, and returns the final response plus payment info.

```typescript
import { x402axios } from '@adipundir/aptos-x402';

const res = await x402axios.get('https://api.example.com/premium/weather', {
	privateKey: process.env.PRIVATE_KEY!
});

console.log(res.status, res.data);
console.log(res.paymentInfo); // { transactionHash, amount, recipient, settled }
```

Key behavior:
- First request → server responds 402 with payment requirements
- SDK builds/signs Aptos transfer, sets X-PAYMENT header, and retries
- Response includes `x-payment-response` header; `res.paymentInfo` is derived from it

## Server (seller)

Add the middleware and declare which paths are paid. No payment logic inside your route handlers.

```typescript
// middleware.ts
import { paymentMiddleware } from '@adipundir/aptos-x402';

export const middleware = paymentMiddleware(
	process.env.PAYMENT_RECIPIENT_ADDRESS!,
	{
		'/api/premium/weather': {
			price: '1000000', // Octas (0.01 APT)
			network: 'testnet',
			config: { description: 'Premium weather data' }
		}
	},
	{ url: process.env.FACILITATOR_URL! }
);

export const config = { matcher: ['/api/premium/:path*'] };
```

What the middleware does:
- No X-PAYMENT → returns 402 with PaymentRequirements
- With X-PAYMENT →
	- POST to `<FACILITATOR_URL>/verify`
	- If invalid → 403
	- Else POST to `<FACILITATOR_URL>/settle`
	- If success → continues to your handler, adds `X-Payment-Response` header

Tip: For testing, you may point `FACILITATOR_URL` to the public demo facilitator:

```
https://aptos-x402.vercel.app/api/facilitator
```
Don’t use this shared service for production.

## Request/response contract

- 402 body: `{ x402Version: 1, accepts: PaymentRequirements[] }`
- X-PAYMENT header (base64 JSON): `{ x402Version, scheme: 'exact', network, payload: { signature, transaction } }`
- X-Payment-Response header (base64 JSON): `{ settlement: { success, txHash|null, networkId|null, error|null } }`

## Status codes you’ll see

- 402 Payment Required: no or failed settlement
- 403 Forbidden: verification failed
- 400 Bad Request: malformed payment payload
- 500 Internal Server Error: facilitator or processing error

For deeper type shapes, see the Types page; for end‑to‑end code, see the Quickstarts. This page stays focused on the essentials to wire up client and server.
