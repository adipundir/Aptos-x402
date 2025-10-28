# Quickstart for Buyers

This guide explains how to consume x402-protected APIs with automatic payment handling.

## Understanding the Client Flow

When your application requests a resource protected by x402, it receives a 402 Payment Required response containing payment instructions. The `x402axios` function automatically handles this entire flow for you - detecting the 402, creating and signing the transaction, and retrying with payment.

The key advantage is that payment signing happens entirely on the client side. Your private keys never leave your machine, and the transaction is only submitted to the blockchain when the server verifies and settles it.

## Prerequisites

You need Node.js 20 or higher and an Aptos wallet with testnet APT. If you don't have testnet APT, get free tokens from the Aptos testnet faucet at [aptoslabs.com/testnet-faucet](https://aptoslabs.com/testnet-faucet).

## Installation

Install the x402 SDK:

```bash
npm install @adipundir/aptos-x402
```

## Simple Usage with x402axios

The easiest way to consume paid APIs is with the `x402axios` function:

```typescript
import { x402axios } from '@adipundir/aptos-x402';

const response = await x402axios({
  privateKey: process.env.PRIVATE_KEY!,
  url: 'https://api.example.com/premium/weather'
});

console.log(response.data);
console.log('TX:', response.paymentInfo?.transactionHash);
```

That's it! The function automatically:
- Detects 402 Payment Required responses
- Extracts payment requirements
- Determines the correct network (testnet/mainnet)
- Builds and signs the payment transaction
- Retries with the X-PAYMENT header
- Returns your data with payment info

## Creating a Test Wallet

For development, generate a test wallet programmatically:

```typescript
import { Account } from '@aptos-labs/ts-sdk';

const account = Account.generate();
console.log('Address:', account.accountAddress.toString());
console.log('Private Key:', account.privateKey.toString());
```

Save the private key securely. You'll need it to sign transactions. Fund this address with testnet APT from the faucet before making paid requests.

## Complete Example

Here's a complete example with error handling:

```typescript
import { x402axios } from '@adipundir/aptos-x402';

async function getPremiumWeather() {
  try {
    const response = await x402axios({
      privateKey: process.env.PRIVATE_KEY!,
      url: 'https://api.example.com/premium/weather',
      method: 'GET'
    });

    console.log('Weather data:', response.data);
    
    if (response.paymentInfo) {
      console.log('Payment made:');
      console.log('  TX:', response.paymentInfo.transactionHash);
      console.log('  Amount:', response.paymentInfo.amount, 'Octas');
      console.log('  To:', response.paymentInfo.recipient);
    }
    
    return response.data;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}
```

## Different HTTP Methods

### GET Request

```typescript
const weather = await x402axios({
  privateKey: process.env.PRIVATE_KEY!,
  url: 'https://api.example.com/weather'
});
```

### POST Request

```typescript
const analysis = await x402axios({
  privateKey: process.env.PRIVATE_KEY!,
  url: 'https://api.example.com/analyze',
  method: 'POST',
  body: { text: 'Analyze this content' }
});
```

### Custom Headers

```typescript
const response = await x402axios({
  privateKey: process.env.PRIVATE_KEY!,
  url: 'https://api.example.com/data',
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

## Using with Aptos Account

Instead of a private key string, you can pass an Aptos Account object:

```typescript
import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import { x402axios } from '@adipundir/aptos-x402';

const privateKey = new Ed25519PrivateKey(process.env.PRIVATE_KEY!);
const account = Account.fromPrivateKey({ privateKey });

const response = await x402axios({
  account: account,  // Use account instead of privateKey
  url: 'https://api.example.com/premium/data'
});
```

## Understanding the Payment Payload

Behind the scenes, `x402axios` creates a payment payload with:

```typescript
{
  x402Version: 1,
  scheme: "exact",
  network: "aptos-testnet",  // or aptos-mainnet
  payload: {
    signature: "base64...",     // BCS-encoded signature
    transaction: "base64..."    // BCS-encoded transaction
  }
}
```

The transaction and signature are separately BCS-encoded (Binary Canonical Serialization), then base64-encoded for HTTP transport. This allows servers to verify payments offline before blockchain submission.

## Handling Payment Receipts

The `paymentInfo` object in the response contains settlement details:

```typescript
const response = await x402axios({
  privateKey: process.env.PRIVATE_KEY!,
  url: 'https://api.example.com/data'
});

if (response.paymentInfo) {
  console.log('TX Hash:', response.paymentInfo.transactionHash);
  console.log('Amount:', response.paymentInfo.amount, 'Octas');
  console.log('Recipient:', response.paymentInfo.recipient);
  console.log('Settled:', response.paymentInfo.settled);
}
```

You can verify the transaction on the Aptos blockchain explorer using the transaction hash.

## Error Handling

Common errors:

**Insufficient Balance**: Your account doesn't have enough APT for payment + gas fees. Fund it from the testnet faucet.

**Invalid Private Key**: The private key format is incorrect. Ensure it starts with `0x` and is a valid hex string.

**Network Errors**: Cannot reach the API or blockchain. Check your internet connection and API availability.

**Payment Failed**: The server rejected the payment. Check the error message for details.

## Free vs Paid Endpoints

`x402axios` handles both automatically:

```typescript
// Free endpoint - no payment made
const free = await x402axios({
  privateKey: process.env.PRIVATE_KEY!,
  url: 'https://api.example.com/free-data'
});
console.log(free.paymentInfo);  // undefined

// Paid endpoint - automatic payment
const paid = await x402axios({
  privateKey: process.env.PRIVATE_KEY!,
  url: 'https://api.example.com/premium-data'
});
console.log(paid.paymentInfo);  // { transactionHash: "0x...", ... }
```

## Network Auto-Detection

The function automatically detects the network from the 402 response:
- `"network": "aptos-testnet"` → uses Testnet
- `"network": "aptos-mainnet"` → uses Mainnet  
- `"network": "aptos-devnet"` → uses Devnet

No manual network configuration needed!

## Next Steps

You now understand how to consume x402-protected APIs with automatic payment handling. For production use:

- Implement proper error handling and retry logic
- Cache payment receipts for audit purposes
- Monitor your account balance to ensure sufficient funds
- Consider implementing automatic balance top-ups for long-running services

See [HTTP 402](../core-concepts/http-402.md) for deeper protocol understanding.
