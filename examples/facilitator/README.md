# Facilitator Implementation (Optional)

## What is a Facilitator?

A facilitator is a service that handles blockchain interactions for x402 payments:
- **Verify endpoint**: Fast validation of signed transactions (no blockchain)
- **Settle endpoint**: Submits transactions to Aptos blockchain

## Do I Need to Deploy a Facilitator?

**No, if you:**
 - Use the public demo facilitator: `https://aptos-x402.org/api/facilitator`
 - Use your company's existing facilitator
 - Just testing/developing

**Yes, if you:**
- Want full control over payment processing in production
- Need to customize verification logic
- Have high-volume requirements
- Need guaranteed uptime SLAs

## How to Use

### Option 1: Use Public Demo Facilitator (Easiest)

```typescript
// middleware.ts
export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  { /* routes */ },
  {
    // Public demo facilitator - perfect for testing!
    url: 'https://aptos-x402.org/api/facilitator'
  }
);
```

### Option 2: Deploy Your Own

Copy the facilitator routes from this repo:

```bash
# Copy these files to your Next.js project:
app/api/facilitator/verify/route.ts
app/api/facilitator/settle/route.ts
lib/aptos-utils.ts  # Helper functions
```

Then configure your middleware to use your local facilitator:

```typescript
{
  url: process.env.NEXT_PUBLIC_URL + '/api/facilitator'
}
```

## Reference Implementation

See the complete facilitator implementation in the demo app:
- `/app/api/facilitator/verify/route.ts` - Verification endpoint
- `/app/api/facilitator/settle/route.ts` - Settlement endpoint
- `/lib/aptos-utils.ts` - Aptos SDK utilities

## Architecture

```
Client Request
     ↓
[Middleware] → [Facilitator /verify] → Fast validation
     ↓                                    ↓ isValid?
     ↓                                    ↓
[Middleware] → [Facilitator /settle] → Submit to Aptos
     ↓                                    ↓ success?
     ↓                                    ↓
[API Route] ← Resource delivered ← Payment confirmed
```

## Security Considerations

- Facilitator can be public (no authentication needed)
- It only processes **already-signed** transactions
- It cannot steal funds (client controls keys)
- Rate limiting recommended for production

## Deployment Options

1. **Same Next.js App**: Deploy facilitator routes alongside your API
2. **Separate Service**: Deploy dedicated facilitator microservice
3. **Shared Service**: Use community-run facilitator (if available)

## Future: Managed Facilitator Services

Eventually, there may be managed x402 facilitator services (like Stripe for payments). For now, most will self-host.

