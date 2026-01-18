# Quickstart for Buyers

Access x402-protected APIs with automatic payment handling using x402 v2 compliant client.

## Overview

The `x402axios` client provides an axios-compatible interface that automatically:

1. Detects 402 Payment Required responses
2. Builds and signs Aptos transactions locally
3. Retries requests with payment headers
4. Returns data + payment receipts

**Key Features:**
- All signing happens client-side - your private keys never leave your machine
- **Gasless transactions** - Gas fees are sponsored by the facilitator
- Pay with **USDC** (fungible assets)

## Prerequisites

| Requirement | Details |
|-------------|---------|
| **Node.js** | 20.0.0+ |
| **Aptos Wallet** | With USDC balance |
| **Private Key** | For transaction signing |

## Installation

```bash
npm install aptos-x402
```

## Basic Usage

```typescript
import { x402axios } from 'aptos-x402';

const response = await x402axios.get('https://api.example.com/premium/weather', {
  privateKey: process.env.APTOS_PRIVATE_KEY
});

// Access response data
console.log(response.data);

// Payment details
if (response.paymentInfo) {
  console.log('Transaction:', response.paymentInfo.transactionHash);
  console.log('Amount:', response.paymentInfo.amount);
  console.log('Network:', response.paymentInfo.network);  // "aptos:1" or "aptos:2"
  console.log('Payer:', response.paymentInfo.payer);      // "geomi-sponsored" for gasless
}
```

## What Happens Automatically

| Step | Description |
|------|-------------|
| **1. Initial Request** | Sends GET to protected endpoint |
| **2. Detect 402** | Receives payment requirements |
| **3. Extract Details** | Parses amount, recipient, network, asset |
| **4. Build Transaction** | Constructs USDC transfer (gasless) |
| **5. Sign Locally** | Signs with your private key |
| **6. Retry with Payment** | Includes PAYMENT-SIGNATURE header |
| **7. Geomi Sponsors Gas** | Facilitator pays gas fees |
| **8. Return Data** | Receives response + payment receipt |

## Wallet Setup

### Generate Test Wallet

```bash
npx tsx -e "import { Account } from '@aptos-labs/ts-sdk'; const acc = Account.generate(); console.log('Address:', acc.accountAddress.toString()); console.log('Private Key:', acc.privateKey.toString());"
```

### Get Testnet USDC

1. Fund your wallet with testnet APT from [aptoslabs.com/testnet-faucet](https://aptoslabs.com/testnet-faucet)
2. Swap APT for testnet USDC on a testnet DEX

**Testnet USDC Address:** `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832`

## HTTP Methods

### GET Request

```typescript
const response = await x402axios.get('https://api.example.com/data', {
  privateKey: process.env.APTOS_PRIVATE_KEY
});
```

### POST with Body

```typescript
const analysis = await x402axios.post(
  'https://api.example.com/analyze', 
  { text: 'Content to analyze' },
  { privateKey: process.env.APTOS_PRIVATE_KEY }
);
```

### PUT, PATCH, DELETE

```typescript
await x402axios.put('/resource/123', data, { privateKey: '0x...' });
await x402axios.patch('/resource/123', updates, { privateKey: '0x...' });
await x402axios.delete('/resource/123', { privateKey: '0x...' });
```

### Custom Headers

```typescript
const response = await x402axios.get('https://api.example.com/data', {
  privateKey: process.env.APTOS_PRIVATE_KEY,
  headers: {
    'Client-Version': '1.0.0',
    'Authorization': 'Bearer token'
  }
});
```

## Using Aptos Account Objects

```typescript
import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import { x402axios } from 'aptos-x402';

const privateKey = new Ed25519PrivateKey(process.env.APTOS_PRIVATE_KEY!);
const account = Account.fromPrivateKey({ privateKey });

const response = await x402axios.get('https://api.example.com/data', {
  account  // Use account object instead of privateKey string
});
```

## Payment Receipts

```typescript
const response = await x402axios.get('https://api.example.com/data', {
  privateKey: process.env.APTOS_PRIVATE_KEY
});

if (response.paymentInfo) {
  console.log('Transaction Hash:', response.paymentInfo.transactionHash);
  console.log('Amount:', response.paymentInfo.amount);
  console.log('Recipient:', response.paymentInfo.recipient);
  console.log('Network:', response.paymentInfo.network);
  console.log('Payer:', response.paymentInfo.payer);
  
  // View on explorer
  const network = response.paymentInfo.network === 'aptos:1' ? 'mainnet' : 'testnet';
  console.log(`https://explorer.aptoslabs.com/txn/${response.paymentInfo.transactionHash}?network=${network}`);
}
```

## Error Handling

```typescript
try {
  const response = await x402axios.get('https://api.example.com/data', {
    privateKey: process.env.APTOS_PRIVATE_KEY
  });
  console.log('Data:', response.data);
} catch (error) {
  if (error.message.includes('INSUFFICIENT_BALANCE')) {
    console.error('Not enough USDC for payment');
  } else if (error.message.includes('Asset not specified')) {
    console.error('Server did not specify payment asset');
  } else {
    console.error('Request failed:', error.message);
  }
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| **Insufficient Balance** | Not enough USDC | Get testnet USDC |
| **Invalid Private Key** | Malformed key | Ensure starts with `0x` |
| **Asset not specified** | Old server config | Server needs asset field |
| **Network Errors** | Cannot reach API | Check connectivity |

## Mixed Free/Paid Endpoints

Handles both seamlessly:

```typescript
// Free endpoint - no payment made
const free = await x402axios.get('https://api.example.com/free', {
  privateKey: process.env.APTOS_PRIVATE_KEY
});
console.log(free.paymentInfo);  // undefined

// Paid endpoint - automatic payment
const paid = await x402axios.get('https://api.example.com/premium', {
  privateKey: process.env.APTOS_PRIVATE_KEY
});
console.log(paid.paymentInfo);  // { transactionHash, amount, ... }
```

## USDC Addresses

| Network | USDC Address |
|---------|--------------|
| **Mainnet** | `0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b` |
| **Testnet** | `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832` |

## Next Steps

- **[Quickstart for Sellers](quickstart-sellers.md)** - Build your own paid API
- **[HTTP 402 Protocol](../core-concepts/http-402.md)** - Understand the specification
- **[API Reference](../api-reference/types.md)** - Complete type definitions
