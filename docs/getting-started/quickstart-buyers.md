# Quickstart for Buyers

This guide explains how to build clients that can pay for x402-protected APIs automatically.

## Understanding the Client Flow

When your application requests a resource protected by x402, it receives a 402 Payment Required response containing payment instructions. Your client creates and signs an Aptos transaction offline, includes it in a retry request, and receives the resource after successful payment settlement.

The key advantage of this approach is that payment signing happens entirely on the client side. Your private keys never leave your machine, and the transaction is only submitted to the blockchain when the server verifies and settles it.

## Prerequisites

You need Node.js 20 or higher and an Aptos wallet with testnet APT. If you don't have testnet APT, you can get free tokens from the Aptos testnet faucet at aptoslabs.com/testnet-faucet.

## Installation

Install the Aptos SDK:

```bash
npm install @aptos-labs/ts-sdk
```

## Creating a Test Wallet

For development, generate a test wallet programmatically:

```typescript
import { Account } from '@aptos-labs/ts-sdk';

const account = Account.generate();
console.log('Address:', account.accountAddress.toString());
console.log('Private Key:', account.privateKey.toString());
```

Save the private key securely. You'll need it to sign transactions. Fund this address with testnet APT from the faucet before making paid requests.

## Complete Payment Flow Example

Here's a full implementation showing how to detect 402 responses and handle payment:

```typescript
import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey
} from '@aptos-labs/ts-sdk';

async function callProtectedAPI(url: string, privateKey: string) {
  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);
  
  const account = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(privateKey)
  });
  
  let response = await fetch(url);
  
  if (response.status === 402) {
    const paymentReqs = await response.json();
    const requirement = paymentReqs.accepts[0];
    
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function: '0x1::aptos_account::transfer',
        functionArguments: [
          requirement.payTo,
          requirement.maxAmountRequired
        ]
      }
    });
    
    const authenticator = aptos.transaction.sign({
      signer: account,
      transaction
    });
    
    const txBytes = transaction.bcsToBytes();
    const sigBytes = authenticator.bcsToBytes();
    
    const paymentPayload = {
      x402Version: 1,
      scheme: requirement.scheme,
      network: requirement.network,
      payload: {
        transaction: Buffer.from(txBytes).toString('base64'),
        signature: Buffer.from(sigBytes).toString('base64')
      }
    };
    
    const paymentHeader = Buffer.from(
      JSON.stringify(paymentPayload)
    ).toString('base64');
    
    response = await fetch(url, {
      headers: { 'X-PAYMENT': paymentHeader }
    });
  }
  
  return response.json();
}

const data = await callProtectedAPI(
  'http://localhost:3000/api/premium/weather',
  '0x...'
);
```

## Understanding the Payment Payload

The X-PAYMENT header contains a base64-encoded JSON object with the transaction and signature, both separately encoded in BCS (Binary Canonical Serialization) format. This structure allows the server to verify the payment offline before submitting it to the blockchain.

The transaction specifies the exact recipient, amount, and network. The signature proves that the transaction was authorized by the holder of the private key. Together, they form a complete but unsubmitted blockchain transaction.

## Handling Payment Receipts

After successful payment, the server includes an X-PAYMENT-RESPONSE header with settlement details:

```typescript
const receiptHeader = response.headers.get('x-payment-response');
if (receiptHeader) {
  const receipt = JSON.parse(
    Buffer.from(receiptHeader, 'base64').toString()
  );
  console.log('Transaction Hash:', receipt.settlement.txHash);
  console.log('Network:', receipt.settlement.networkId);
}
```

The transaction hash can be used to verify the payment on the Aptos blockchain explorer. This provides cryptographic proof that payment occurred and was settled successfully.

## Error Handling

Common errors you might encounter:

**Insufficient Balance**: The account doesn't have enough APT to cover both the payment amount and transaction gas fees. Fund the account from the testnet faucet.

**Sequence Number Errors**: Each transaction can only be used once. If you receive this error, create a new transaction rather than reusing the old one.

**Invalid Signature**: Usually indicates a problem with how the transaction was signed or serialized. Verify that you're using the correct private key and following the BCS encoding properly.

## Browser Integration

For browser applications, you can integrate with Aptos wallets like Petra:

```typescript
import { useWallet } from '@petra/wallet-adapter-react';

function PaidAPICall() {
  const { signTransaction, account } = useWallet();
  
  async function callAPI() {
    const response = await fetch(url);
    
    if (response.status === 402) {
      const reqs = await response.json();
      const tx = await buildTransaction(reqs.accepts[0]);
      const signed = await signTransaction(tx);
      // Retry with signed transaction...
    }
  }
}
```

Wallet integrations handle key management and transaction signing through a user interface, making it easier to build consumer-facing applications.

## Testing Your Implementation

To test locally, you'll need both a funded testnet account and a running x402-protected API. Start the API server, make a request, verify you receive a 402 response, then retry with a properly formatted payment header.

Monitor the Aptos testnet explorer to confirm your transactions are being submitted and confirmed successfully. Each payment should appear as a transfer from your address to the API provider's address.

## Next Steps

You now understand how to build clients that can pay for protected APIs. For production use:

- Implement proper error handling and retry logic
- Cache payment receipts for audit purposes
- Monitor your account balance to ensure sufficient funds
- Consider implementing automatic balance top-ups for long-running services

See [HTTP 402](../core-concepts/http-402.md) for deeper protocol understanding.
