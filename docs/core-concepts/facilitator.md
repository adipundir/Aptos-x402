# Facilitator

A facilitator is a specialized service that handles blockchain interactions for x402 servers, acting as an intermediary between your API server and the Aptos blockchain.

## Purpose and Architecture

The facilitator separates blockchain operations from your main application logic. When your server receives a payment, it forwards the payment details to the facilitator for verification and settlement. This architectural separation provides several advantages: it isolates blockchain complexity, allows multiple APIs to share infrastructure, and maintains security by keeping blockchain operations in a dedicated service.

Your API server focuses on business logic while the facilitator handles the technical details of transaction verification, blockchain submission, and settlement confirmation.

## Core Responsibilities

The facilitator performs two primary operations: payment verification and payment settlement. These operations occur sequentially, with verification happening first to provide fast rejection of invalid payments before any blockchain interaction occurs.

### Payment Verification

Verification validates the payment structure without touching the blockchain. The facilitator receives the payment header and requirements from your server, decodes the base64-encoded payment payload, and checks that the structure matches the protocol specification. It validates that the payment scheme and network match requirements, confirms that transaction and signature components are present and properly encoded, and verifies the payment targets the correct recipient with the correct amount.

This verification completes in 10-50 milliseconds because it involves only local cryptographic operations and structural validation. No network calls or blockchain queries occur during verification.

### Payment Settlement

Settlement submits the transaction to the Aptos blockchain and waits for confirmation. The facilitator deserializes the BCS-encoded transaction and signature, reconstructs the complete transaction using the Aptos SDK, submits it to the blockchain network, and waits for the transaction to be confirmed in a block.

Settlement takes 1-3 seconds on Aptos, dominated by blockchain finality time rather than processing overhead. The facilitator returns the transaction hash and settlement details to your server, which includes them in the response to the client.

## API Endpoints

Facilitators expose two HTTP endpoints that your middleware calls during request processing.

### Verify Endpoint

The verify endpoint accepts a POST request with the payment header and payment requirements:

```typescript
POST /facilitator/verify

{
  "x402Version": 1,
  "paymentHeader": "eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoi...",
  "paymentRequirements": {
    "scheme": "exact",
    "network": "aptos-testnet",
    "maxAmountRequired": "1000000",
    "resource": "https://api.example.com/api/premium/data",
    "description": "Premium data access",
    "mimeType": "application/json",
    "outputSchema": null,
    "payTo": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "maxTimeoutSeconds": 60
  }
}
```

It returns a validation result:

```typescript
{
  "isValid": true,
  "invalidReason": null
}
```

If validation fails, the response includes a reason describing why the payment was rejected. Common reasons include scheme mismatch, network mismatch, missing components, or invalid encoding.

### Settle Endpoint

The settle endpoint accepts the same request format but performs full blockchain settlement:

```typescript
POST /facilitator/settle

{
  "x402Version": 1,
  "paymentHeader": "eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoi...",
  "paymentRequirements": { /* same as verify */ }
}
```

It returns settlement details:

```typescript
{
  "success": true,
  "txHash": "0x5f2e8a9b3c7d1e4f6a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
  "networkId": "aptos-testnet",
  "error": null
}
```

Failed settlements include an error message explaining the failure, such as insufficient balance, invalid signature, or network errors.

## Implementation Patterns

Facilitators can be deployed in several configurations depending on your requirements.

### Public Facilitator

We provide a free public facilitator hosted at `https://aptos-x402.vercel.app/api/facilitator` that is available for use on both **testnet and mainnet** networks. This service is currently **completely free** for all users and requires no authentication or setup.

Current Status: The public facilitator is free for production use. We may introduce usage-based pricing in the future based on factors such as:
- Transaction volume
- Network usage (testnet vs mainnet)
- Response time SLAs
- Dedicated support requirements

However, any future monetization will be introduced with advance notice, and a free tier will remain available for development and testing purposes.

**Features**:
- Zero configuration required
- Supports both Aptos testnet and mainnet
- Immediate availability for prototyping and production
- Handles verification and settlement operations
- No API keys or registration needed

**Recommendations**:
- **Development/Testing**: Feel free to use the public facilitator without restrictions
- **Production**: The public facilitator is suitable for production use, but consider self-hosting if you need

The public facilitator runs on shared infrastructure, so while we maintain high availability, self-hosting provides additional control and reliability for mission-critical applications.

### Self-Hosted in Same Application

Deploy the facilitator endpoints within your Next.js application alongside your API routes. This provides the simplest deployment model with minimal infrastructure overhead. Your application handles both API logic and blockchain operations in a single service.

The application structure looks like:

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

This pattern works well for small to medium deployments where the additional load from blockchain operations doesn't impact API performance.

### Separate Service

Deploy the facilitator as a standalone service independent of your API servers. This provides the best scalability and isolation. Multiple API servers can share a single facilitator, and blockchain operations don't compete for resources with your API logic.

The architecture becomes:

```
API Server 1 ──┐
API Server 2 ──┼──→ Facilitator Service ──→ Aptos Blockchain
API Server 3 ──┘
```

This pattern is recommended for production deployments, especially when running multiple API services or expecting significant traffic.

## Gas Payment Models

The current implementation uses what we call Pattern A: Sender Pays Gas. In this model, clients sign transactions that include gas fees, and the facilitator submits these pre-signed transactions to the blockchain. The client's account is debited for both the payment amount and the gas fees.

This approach requires no private keys in the facilitator, provides maximum security, and ensures clients control their own gas settings. The downside is that clients must maintain APT balances sufficient for both payments and gas.

A future enhancement, Pattern B: Fee-Payer, will allow the facilitator to pay gas on behalf of clients. This improves user experience by eliminating the need for clients to hold gas tokens, but requires the facilitator to maintain a funded account and manage its own gas budget.

## Performance Characteristics

Verification latency averages 10-50 milliseconds, dominated by JSON parsing and base64 decoding rather than cryptographic operations. Settlement latency averages 1000-3000 milliseconds, dominated by Aptos blockchain finality rather than processing time.

Throughput scales with the number of facilitator instances and the Aptos network's transaction capacity. A single facilitator instance can handle hundreds of verifications per second but is limited to the blockchain's settlement throughput for actual payment processing.

## Error Handling

Common errors and their meanings:

**Insufficient Balance**: The client's account lacks sufficient APT for the payment amount plus gas fees. The client needs to fund their account before retrying.

**Sequence Number Errors**: The transaction has already been used or the sequence number is invalid. Clients must create a new transaction with the current sequence number.

**Invalid Signature**: The signature doesn't match the transaction or was created with the wrong private key. This usually indicates a bug in the client's transaction signing logic.

**Network Errors**: The facilitator couldn't reach the Aptos RPC endpoint. This might be temporary network issues or RPC rate limiting.

## Security Considerations

Facilitators should validate all inputs before processing. Verify that payment amounts match requirements, check that recipients match expected addresses, and ensure networks align with your supported chains. Implement rate limiting to prevent abuse of the verify and settle endpoints.

For production deployments, consider running the facilitator behind authentication to ensure only your servers can access it. Log all verification and settlement attempts for audit purposes. Monitor for unusual patterns that might indicate attacks or abuse.

## Deployment Recommendations

For production use, deploy your own facilitator rather than relying on the public demo. Choose the deployment pattern that matches your scale: self-hosted for simple deployments, separate service for production scale. Implement monitoring to track verification times, settlement times, success rates, and error rates.

Set up alerting for degraded performance, high error rates, and blockchain connectivity issues. Plan for failover by running multiple facilitator instances and having backup RPC endpoints configured.

## Next Steps

See [Facilitator Setup Guide](../guides/facilitator-setup.md) for detailed deployment instructions.
