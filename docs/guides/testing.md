# Testing Your x402 Implementation

A comprehensive guide to verifying your x402 payment-protected APIs work correctly.

## Testing Strategy

Effective testing of x402 implementations requires verifying multiple layers of functionality. You need to confirm that middleware correctly enforces payment requirements, that facilitator operations complete successfully, that blockchain settlement works as expected, and that your application logic executes only after payment.

This guide covers testing approaches from development through production deployment.

## Development Environment Setup

Before testing payment flows, establish a proper development environment. Install the Aptos CLI for account management and blockchain interaction. Create test accounts specifically for development purposes. Fund these accounts with testnet APT from the Aptos faucet. Configure your middleware to use testnet rather than mainnet.

Your test environment should mirror production architecture while using test resources that have no real-world value.

## Testing the Middleware

Begin by verifying that your middleware correctly handles requests without payment. Start your development server and make a request to a protected endpoint without any payment header. You should receive a 402 status code with payment requirements in the response body.

Verify the 402 response structure:

```bash
curl http://localhost:3000/api/premium/weather
```

The response should contain version information, payment scheme details, the required amount in Octas, your wallet address as the recipient, and a description of the protected resource.

Check that unprotected routes continue to work normally without payment requirements. Only routes matched by your middleware configuration should return 402 responses.

## Testing Payment Verification

Create a test payment using the Aptos SDK and verify that your facilitator correctly validates it. This requires creating a valid transaction, signing it with a test account, encoding it in the x402 payment format, and submitting it to the verify endpoint.

A complete verification test looks like:

```typescript
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

async function testVerification() {
  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);
  
  const account = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(process.env.TEST_PRIVATE_KEY)
  });
  
  const transaction = await aptos.transaction.build.simple({
    sender: account.accountAddress,
    data: {
      function: '0x1::aptos_account::transfer',
      functionArguments: [
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        '1000000'
      ]
    }
  });
  
  const authenticator = aptos.transaction.sign({
    signer: account,
    transaction
  });
  
  const paymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: 'aptos-testnet',
    payload: {
      transaction: Buffer.from(transaction.bcsToBytes()).toString('base64'),
      signature: Buffer.from(authenticator.bcsToBytes()).toString('base64')
    }
  };
  
  const paymentHeader = Buffer.from(
    JSON.stringify(paymentPayload)
  ).toString('base64');
  
  const response = await fetch('http://localhost:3000/api/facilitator/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paymentHeader,
      paymentRequirements: {
        scheme: 'exact',
        network: 'aptos-testnet',
        maxAmountRequired: '1000000',
        payTo: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
      }
    })
  });
  
  const result = await response.json();
  console.log('Verification result:', result);
}
```

This test should return `isValid: true` for properly formatted payments. Test invalid scenarios by modifying the payment to use wrong networks, incorrect amounts, missing signatures, or malformed encoding. Each should return `isValid: false` with an appropriate error message.

## Testing End-to-End Payment Flow

The complete payment flow tests the entire system from initial request through settlement. Make a request without payment to get requirements. Create and sign a payment transaction. Retry the request with the X-PAYMENT header. Verify you receive the protected resource. Check that the response includes a payment receipt.

A complete end-to-end test:

```typescript
async function testFullFlow() {
  const apiUrl = 'http://localhost:3000/api/premium/weather';
  
  let response = await fetch(apiUrl);
  console.log('Initial status:', response.status);
  
  if (response.status === 402) {
    const requirements = await response.json();
    console.log('Payment required:', requirements);
    
    const paymentHeader = await createPayment(requirements.accepts[0]);
    
    response = await fetch(apiUrl, {
      headers: { 'X-PAYMENT': paymentHeader }
    });
    
    console.log('After payment status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Resource data:', data);
      
      const receiptHeader = response.headers.get('x-payment-response');
      if (receiptHeader) {
        const receipt = JSON.parse(
          Buffer.from(receiptHeader, 'base64').toString()
        );
        console.log('Transaction hash:', receipt.settlement.txHash);
        console.log('View on explorer:', 
          `https://explorer.aptoslabs.com/txn/${receipt.settlement.txHash}?network=testnet`
        );
      }
    }
  }
}
```

Run this test and verify each step completes successfully. Check the transaction on the Aptos explorer to confirm blockchain settlement occurred. Verify the payment amount and recipient match your expectations.

## Testing Error Conditions

Robust implementations handle errors gracefully. Test common error scenarios to ensure your implementation provides appropriate feedback.

Test insufficient balance by attempting payment from an account with inadequate funds. The facilitator should return an error indicating insufficient balance, and your middleware should return 402 with this error message.

Test invalid signatures by corrupting the signature bytes before encoding. This should fail verification with an invalid signature error.

Test sequence number conflicts by attempting to reuse a transaction. The blockchain will reject it, and the facilitator should return an appropriate error.

Test network errors by temporarily blocking access to the Aptos RPC endpoint. Your facilitator should handle this gracefully and return a descriptive error.

## Testing Transaction Uniqueness

Each transaction can only be used once due to sequence number management. Verify that attempting to reuse a payment transaction fails appropriately. Submit a valid payment and receive the resource. Attempt to use the same payment header for a second request. The second request should fail because the transaction has already been executed.

This prevents payment replay attacks where an attacker might try to intercept and reuse valid payments.

## Performance Testing

Measure the performance characteristics of your implementation under various conditions. Time how long verification takes (should be under 50ms). Measure settlement duration (should be 1-3 seconds on testnet). Test throughput by making multiple simultaneous requests. Monitor resource usage during sustained load.

Performance testing helps establish baselines for production monitoring and identifies potential bottlenecks before they impact users.

## Integration Testing

If your application has multiple payment-protected endpoints, test that each enforces its own payment requirements correctly. Verify that a payment for one endpoint doesn't grant access to a different endpoint. Check that varying price points work as configured.

Test the interaction between payment protection and other middleware like authentication, rate limiting, or CORS. Ensure these systems work together without conflicts.

## Manual Testing with Browser Wallets

For browser-based applications, test the complete flow using a wallet extension like Petra. Connect your wallet to the test application. Attempt to access a protected resource. Confirm the wallet prompts you to sign a transaction. Approve the transaction and verify you receive the resource.

This tests the real user experience and ensures wallet integrations work correctly.

## Automated Testing

Create automated tests that run in your CI/CD pipeline. These should verify middleware configuration correctness, facilitator endpoint functionality, payment format validation, and error handling paths.

Example test structure using a testing framework:

```typescript
describe('x402 Payment Protection', () => {
  it('returns 402 without payment', async () => {
    const response = await fetch('/api/premium/test');
    expect(response.status).toBe(402);
  });
  
  it('accepts valid payment', async () => {
    const payment = await createTestPayment();
    const response = await fetch('/api/premium/test', {
      headers: { 'X-PAYMENT': payment }
    });
    expect(response.status).toBe(200);
  });
  
  it('rejects invalid payment', async () => {
    const response = await fetch('/api/premium/test', {
      headers: { 'X-PAYMENT': 'invalid' }
    });
    expect(response.status).toBe(402);
  });
});
```

Run these tests on every commit to catch regressions early.

## Production Smoke Tests

After deploying to production, run smoke tests to verify basic functionality. Use a dedicated test account with small amounts of mainnet APT. Make a test purchase through your production API. Verify the transaction settles correctly on mainnet. Check that monitoring and logging capture the transaction.

Keep these tests lightweight and run them after each deployment to catch configuration issues early.

## Monitoring in Production

Beyond testing, implement ongoing monitoring to detect issues in production. Track payment success rates, verification latency, settlement latency, error rates by type, and blockchain transaction confirmations.

Set up alerts for degraded success rates, elevated error rates, slow settlement times, and facilitator unavailability.

## Common Issues and Solutions

During testing, you may encounter common issues. If you see "Transaction already used" errors, remember each transaction is single-use and create new transactions for each test. For "Insufficient balance" errors, verify your test account has both the payment amount and gas fees available. "Network mismatch" errors indicate configuration misalignment between client and server network settings. "Invalid signature" errors usually indicate problems with transaction signing or BCS serialization.

Most issues can be diagnosed by examining the error messages returned by the facilitator and checking the Aptos explorer for transaction details.

## Next Steps

With thorough testing complete, you're ready to deploy to production with confidence. Monitor your metrics closely during initial rollout, and be prepared to quickly address any issues that arise in the production environment.

See [Facilitator Setup](facilitator-setup.md) for deployment guidance.
