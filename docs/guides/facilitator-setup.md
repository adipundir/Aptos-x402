# Setting Up Your Own Facilitator

This guide walks through deploying a production-ready facilitator service for x402 payment processing.

## Public Facilitator (Free)

**Before setting up your own facilitator**, note that we provide a **free public facilitator** at `https://aptos-x402.vercel.app/api/facilitator` that works on both **testnet and mainnet**. 

This service is:
- **Completely free** (currently and for the foreseeable future)
- **Production-ready** for most use cases
- **Zero setup required** - just use it in your configuration
- **No authentication needed**

**You only need to set up your own facilitator if you require:**
- Guaranteed uptime SLAs
- Custom rate limits or higher throughput
- Private infrastructure
- Full control over blockchain node selection
- Custom monitoring and logging

For most users, especially those getting started, the free public facilitator is sufficient even for production use.

## When to Deploy Your Own

Your own deployment provides control over uptime and performance, eliminates dependency on shared infrastructure, allows customization for specific requirements, and enables proper monitoring and alerting.

Consider self-hosting if you expect very high transaction volumes or need guaranteed service levels for mission-critical applications.

## Prerequisites

You need a Next.js 15+ environment with TypeScript support, Node.js 20 or higher, and access to deploy web services (Vercel, AWS, Google Cloud, or similar platforms). Familiarity with the Aptos SDK and basic DevOps practices will help with deployment and monitoring.

## Implementation

The facilitator consists of two API endpoints that handle verification and settlement. Both endpoints are standard Next.js API routes that can be deployed anywhere Next.js runs.

### Verify Endpoint

Create the verification endpoint at `app/api/facilitator/verify/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentHeader, paymentRequirements } = body;
    
    const paymentPayload = JSON.parse(
      Buffer.from(paymentHeader, 'base64').toString()
    );
    
    if (!paymentPayload.payload?.transaction || 
        !paymentPayload.payload?.signature) {
      return NextResponse.json({
        isValid: false,
        invalidReason: 'Missing transaction or signature'
      });
    }
    
    if (paymentPayload.scheme !== paymentRequirements.scheme) {
      return NextResponse.json({
        isValid: false,
        invalidReason: 'Scheme mismatch'
      });
    }
    
    if (paymentPayload.network !== paymentRequirements.network) {
      return NextResponse.json({
        isValid: false,
        invalidReason: 'Network mismatch'
      });
    }
    
    return NextResponse.json({
      isValid: true,
      invalidReason: null
    });
    
  } catch (error) {
    return NextResponse.json({
      isValid: false,
      invalidReason: error.message
    }, { status: 400 });
  }
}
```

This endpoint performs structural validation without touching the blockchain. It confirms the payment has the required components, matches the expected scheme and network, and is properly formatted. Returning quickly allows servers to reject invalid payments before attempting settlement.

### Settle Endpoint

Create the settlement endpoint at `app/api/facilitator/settle/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { 
  Aptos, 
  AptosConfig, 
  Network,
  Deserializer,
  SimpleTransaction,
  AccountAuthenticator
} from '@aptos-labs/ts-sdk';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentHeader, paymentRequirements } = body;
    
    const paymentPayload = JSON.parse(
      Buffer.from(paymentHeader, 'base64').toString()
    );
    
    const network = paymentRequirements.network === 'aptos-testnet' 
      ? Network.TESTNET 
      : Network.MAINNET;
    const config = new AptosConfig({ network });
    const aptos = new Aptos(config);
    
    const txBytes = Buffer.from(
      paymentPayload.payload.transaction, 
      'base64'
    );
    const sigBytes = Buffer.from(
      paymentPayload.payload.signature, 
      'base64'
    );
    
    const transaction = SimpleTransaction.deserialize(
      new Deserializer(txBytes)
    );
    const authenticator = AccountAuthenticator.deserialize(
      new Deserializer(sigBytes)
    );
    
    const result = await aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator: authenticator
    });
    
    await aptos.waitForTransaction({
      transactionHash: result.hash
    });
    
    return NextResponse.json({
      success: true,
      txHash: result.hash,
      networkId: paymentRequirements.network,
      error: null
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      txHash: null,
      networkId: paymentRequirements.network,
      error: error.message
    }, { status: 400 });
  }
}
```

This endpoint deserializes the payment components, submits the transaction to Aptos, and waits for confirmation. Error handling captures common issues like insufficient balance or invalid signatures, returning descriptive messages to help with debugging.

## Deployment Options

### Same Application Deployment

The simplest deployment includes facilitator endpoints in your main Next.js application. Create the facilitator routes as shown above, ensure your application has the Aptos SDK installed, and configure your middleware to use the local facilitator URL.

Your project structure becomes:

```
my-app/
├── app/
│   └── api/
│       ├── facilitator/
│       │   ├── verify/route.ts
│       │   └── settle/route.ts
│       └── premium/
│           └── route.ts
└── middleware.ts
```

Set the facilitator URL to your own domain:

```
FACILITATOR_URL=https://your-app.com/api/facilitator
```

This works well for moderate traffic levels and provides the simplest operational model.

### Separate Service Deployment

For production scale, deploy the facilitator as a standalone service. Create a separate Next.js project containing only the facilitator endpoints, deploy it independently from your API servers, and configure your API middleware to point to the facilitator service URL.

This provides several advantages. The facilitator can scale independently based on transaction volume. Blockchain operations don't compete for resources with API logic. Multiple API services can share one facilitator deployment. Updates to either service can happen independently.

The architecture becomes:

```
API Service (Vercel) → Facilitator Service (Vercel/AWS/GCP) → Aptos
```

### Serverless Deployment

Both deployment patterns work well with serverless platforms like Vercel, AWS Lambda, or Google Cloud Functions. The facilitator's stateless design makes it naturally suited to serverless execution.

Configure appropriate timeouts to accommodate blockchain settlement times. Settlement can take up to 5 seconds during network congestion, so set function timeouts to at least 10 seconds.

## Configuration

### Environment Variables

Configure these variables for your facilitator:

```
APTOS_NODE_URL=https://api.mainnet.aptoslabs.com/v1
```

The node URL is optional. Without it, the Aptos SDK uses default public RPC endpoints. For production, consider using your own RPC node or a service like Alchemy or QuickNode for better reliability and rate limits.

### Network Selection

Support both testnet and mainnet by checking the network in payment requirements and initializing the appropriate Aptos client. The example settle endpoint shows this pattern.

Never hardcode the network. Always respect the network specified in payment requirements to allow clients to choose between test and production networks.

## Production Considerations

### Rate Limiting

Implement rate limiting to prevent abuse. A simple implementation:

```typescript
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}
```

Apply rate limiting before processing requests. This prevents resource exhaustion from malicious clients attempting to overwhelm your facilitator with invalid payments.

### Monitoring

Track key metrics to ensure healthy operation. Monitor verification latency (should average under 50ms), settlement latency (should average 1-3 seconds), success rates for both operations (should exceed 95%), and error rates by type.

Log all operations with sufficient detail for debugging but without exposing sensitive information. Include timestamps, operation types, network, amounts, and outcome. Never log private keys or complete transaction details.

### Error Handling

Return clear, actionable error messages that help clients understand failures. Common errors include insufficient balance, invalid signature, sequence number conflicts, network connectivity issues, and RPC rate limiting.

Implement exponential backoff for blockchain submission during periods of network congestion. This prevents cascading failures when the blockchain is slow or unavailable.

### Security

Validate all inputs before processing. Check that amounts are positive numbers, addresses are valid format, networks match supported values, and payload sizes are reasonable.

For production deployments, consider requiring authentication from API servers. This prevents unauthorized use of your facilitator by external parties.

### High Availability

Deploy multiple facilitator instances behind a load balancer for production systems. Configure health checks that verify both API responsiveness and blockchain connectivity. Implement automatic failover if an instance becomes unhealthy.

Maintain multiple Aptos RPC endpoints and implement failover between them. Public RPC endpoints occasionally experience issues, and having backups ensures continued operation.

## Testing Your Facilitator

Verify correct operation before directing production traffic to your facilitator. Test the verify endpoint with valid and invalid payloads. Test the settle endpoint with testnet transactions. Verify error handling for malformed requests. Check that logging and monitoring work as expected.

Use the Aptos testnet for testing. Create test accounts, fund them from the faucet, and submit real transactions. Verify that transaction hashes appear in the Aptos explorer and that settlement completes within expected time bounds.

## Cost Considerations

Running your own facilitator incurs minimal costs. Serverless deployments on platforms like Vercel typically cost under $20/month for moderate traffic. Compute costs scale with transaction volume but remain low due to the efficiency of the operations. No blockchain transaction fees apply to the facilitator itself (clients pay all gas fees).

For high-volume deployments, dedicated infrastructure may prove more cost-effective than serverless platforms. Evaluate your traffic patterns and costs once your service reaches scale.

## Next Steps

Once your facilitator is deployed and tested, update your API middleware to use it, monitor operation in production, and implement alerting for errors or performance degradation. As your service grows, consider scaling the facilitator independently from your API tier.

Monitor your facilitator's performance metrics, error rates, and transaction success rates to ensure smooth operation.
