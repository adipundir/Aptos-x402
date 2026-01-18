# Scheme: `exact` on `Aptos` - x402 v2

## Summary

The `exact` scheme on Aptos transfers a specific amount of a stablecoin (such as USDC) or native APT from the payer to the resource server using Aptos's fungible asset framework. The approach requires the payer to construct a complete signed transaction ensuring that the facilitator cannot alter the transaction or redirect funds to any address other than the one specified by the resource server in paymentRequirements.

## Protocol Sequencing

The protocol flow for `exact` on Aptos is client-driven. When the facilitator supports sponsorship, it sets `extra.sponsored` to `true` in the payment requirements. This signals to the client that sponsored (gasless) transactions are available.

```
1. Client makes a request to a `resource server` and receives a `402 Payment Required` response
   - Payment requirements are in the `PAYMENT-REQUIRED` header (Base64 JSON)
   - The `extra.sponsored` field indicates sponsorship is available
2. Client constructs a fee payer transaction to transfer the fungible asset
   - Fee payer address field is set to `0x0` as a placeholder
3. Client signs the transaction (covers payload but not fee payer address)
4. Client serializes the signed transaction using BCS and encodes as Base64
5. Client resends the request with payment in `PAYMENT-SIGNATURE` header
6. Resource server passes payment payload to facilitator for verification
7. Facilitator validates transaction structure, signature, and payment details
8. Resource server fulfills the request
9. Resource server requests settlement from facilitator
10. Facilitator sponsors (adds fee payer signature) and submits to Aptos network
11. Facilitator reports back the result with transaction hash
12. Resource server returns response with `PAYMENT-RESPONSE` header
```

**Security Note:** The sponsorship mechanism does not give the fee payer possession or ability to alter the client's transaction. The client's signature covers the entire transaction payload (recipient, amount, asset). The fee payer can only add its own signature.

## Network Format

X402 v2 uses CAIP-2 format for network identifiers:

- **Mainnet:** `aptos:1` (CAIP-2 format using Aptos chain ID 1)
- **Testnet:** `aptos:2` (CAIP-2 format using Aptos chain ID 2)

## `PaymentRequirements` for `exact`

In addition to the standard x402 `PaymentRequirements` fields, the `exact` scheme on Aptos requires:

```json
{
  "scheme": "exact",
  "network": "aptos:1",
  "amount": "1000000",
  "asset": "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b",
  "payTo": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "maxTimeoutSeconds": 60,
  "extra": {
    "sponsored": true
  }
}
```

### Field Descriptions

- `scheme`: Always `"exact"` for this scheme
- `network`: CAIP-2 network identifier - `aptos:1` (mainnet) or `aptos:2` (testnet)
- `amount`: The exact amount to transfer in atomic units (e.g., `"1000000"` = 1 USDC)
- `asset`: The metadata address of the fungible asset
  - For native APT: `"0x1::aptos_coin::AptosCoin"`
  - For USDC on mainnet: `"0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b"`
- `payTo`: The recipient address (32-byte hex string with `0x` prefix)
- `maxTimeoutSeconds`: Maximum time in seconds before the payment expires
- `extra.sponsored`: Boolean indicating whether the facilitator will sponsor gas fees

## PaymentPayload Structure (v2)

The `payload` field of the `PaymentPayload` for v2 contains:

```json
{
  "x402Version": 2,
  "resource": {
    "url": "https://example.com/weather",
    "description": "Access to protected content",
    "mimeType": "application/json"
  },
  "accepted": {
    "scheme": "exact",
    "network": "aptos:1",
    "amount": "1000000",
    "asset": "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b",
    "payTo": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "maxTimeoutSeconds": 60,
    "extra": {
      "sponsored": true
    }
  },
  "payload": {
    "transaction": "AQDy8fLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vIC..."
  }
}
```

### Transaction Encoding (v2)

The `transaction` field contains a Base64-encoded combined buffer:

```
[txLen (4 bytes big-endian)] + [transaction BCS bytes] + [signature BCS bytes]
```

This format combines the transaction and signature into a single field for simplicity.

## Construction Steps

### 1. Receive 402 response with `PAYMENT-REQUIRED` header:

The payment requirements are sent in the `PAYMENT-REQUIRED` HTTP header as Base64-encoded JSON:

**Header:** `PAYMENT-REQUIRED: eyJ4NDAyVmVyc2lvbiI6MiwiYWNjZXB0cy...`

**Decoded content:**
```json
{
  "x402Version": 2,
  "accepts": [{
    "scheme": "exact",
    "network": "aptos:2",
    "amount": "1000000",
    "asset": "0x1::aptos_coin::AptosCoin",
    "payTo": "0x1234567890abcdef...",
    "maxTimeoutSeconds": 60,
    "extra": { "sponsored": true }
  }]
}
```

### 2. Build the fee payer transaction:

```typescript
const transaction = await aptos.transaction.build.simple({
  sender: account.accountAddress,
  withFeePayer: true,  // Fee payer transaction
  data: {
    function: "0x1::aptos_account::transfer",
    functionArguments: [
      paymentRequirements.payTo,
      BigInt(paymentRequirements.amount)
    ]
  }
});
```

### 3. Sign the transaction (sender only):

```typescript
const senderAuthenticator = aptos.transaction.sign({ 
  signer: account, 
  transaction 
});
```

### 4. Serialize and combine:

```typescript
const transactionBytes = transaction.bcsToBytes();
const signatureBytes = senderAuthenticator.bcsToBytes();

// Create combined buffer
const txLen = transactionBytes.length;
const combined = new Uint8Array(4 + txLen + signatureBytes.length);
combined[0] = (txLen >> 24) & 0xff;
combined[1] = (txLen >> 16) & 0xff;
combined[2] = (txLen >> 8) & 0xff;
combined[3] = txLen & 0xff;
combined.set(transactionBytes, 4);
combined.set(signatureBytes, 4 + txLen);

const transactionBase64 = Buffer.from(combined).toString('base64');
```

### 5. Create the PaymentPayload:

```typescript
const paymentPayload = {
  x402Version: 2,
  resource: {
    url: resourceUrl,
    description: "Protected resource",
    mimeType: "application/json"
  },
  accepted: paymentRequirements,
  payload: {
    transaction: transactionBase64
  }
};
```

### 6. Send with PAYMENT-SIGNATURE header:

```typescript
fetch(resourceUrl, {
  headers: {
    "PAYMENT-SIGNATURE": JSON.stringify(paymentPayload)
  }
});
```

## Verification

Steps to verify a payment for the `exact` scheme:

1. **Extract requirements**: Use `payload.accepted` to get the payment requirements
2. **Verify version**: `x402Version` is `2`
3. **Verify network**: Matches CAIP-2 format (`aptos:1` or `aptos:2`)
4. **Deserialize**: Decode Base64, extract transaction and signature from combined format
5. **Verify signature**: Validate the BCS signature is valid
6. **Verify balance**: Sender has sufficient balance of the `asset`
7. **Verify function**: Transaction contains valid transfer operation:
   - `0x1::aptos_account::transfer` (for native APT)
   - `0x1::primary_fungible_store::transfer` (for fungible assets)
8. **Verify asset**: Transfer is for the correct asset (matching `requirements.asset`)
9. **Verify amount**: Transfer amount matches `requirements.amount`
10. **Verify recipient**: Transfer recipient matches `requirements.payTo`
11. **Simulate**: Use Aptos REST API to simulate transaction success

## Settlement

Settlement is performed by sponsoring and submitting the transaction:

1. **Deserialize**: Facilitator receives the client-signed transaction
2. **Populate fee payer**: Replace `0x0` placeholder with actual fee payer address
3. **Sign as fee payer**: Add fee payer signature (Geomi Gas Station or local key)
4. **Submit**: Submit fully-signed transaction to Aptos network
5. **Return hash**: Return transaction hash to resource server

### Geomi Gas Station Integration

For production sponsorship, integrate with [Geomi's Gas Station](https://geomi.dev/docs/gas-stations):

```typescript
import { getGasStation } from 'aptos-x402';

const gasStation = getGasStation(); // Uses GEOMI_API_KEY from env

const result = await gasStation.sponsorAndSubmitTransaction(
  transaction,
  senderAuthenticator
);

if (result.success) {
  console.log('TX Hash:', result.txHash);
}
```

## `PAYMENT-RESPONSE` Header Payload

The `PAYMENT-RESPONSE` header is Base64 encoded JSON:

```json
{
  "success": true,
  "transaction": "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
  "network": "aptos:1",
  "payer": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
}
```

### Field Descriptions

- `success`: Boolean indicating whether settlement was successful
- `transaction`: Transaction hash (64 hex characters with `0x` prefix)
- `network`: CAIP-2 network identifier
- `payer`: Address of the payer's wallet (sender or fee payer)

## Appendix

### Sponsored Transactions

When `extra.sponsored` is `true`, the facilitator pays gas fees using Aptos's native fee payer mechanism.

**Fee Payer Placeholder:** Client sets fee payer address to `0x0`. The facilitator replaces this during settlement.

**Implementation:**

Gas sponsorship is provided by Geomi Gas Station. Set `GEOMI_API_KEY` in your environment.

### Non-Sponsored Transactions

If `extra.sponsored` is `false`, the client pays their own gas:

1. Client constructs regular transaction (no `withFeePayer`)
2. Client signs transaction normally
3. Facilitator submits directly without additional signing

### Fungible Asset Transfer

Two transfer approaches:

**Option 1: `0x1::primary_fungible_store::transfer`** (recommended)

```move
public entry fun transfer<T: key>(
    sender: &signer,
    metadata: Object<T>,
    recipient: address,
    amount: u64,
)
```

**Option 2: `0x1::aptos_account::transfer`** (native APT only)

```move
public entry fun transfer(
    source: &signer,
    to: address,
    amount: u64,
)
```

### Network Identifiers

| Network | CAIP-2 Format | Chain ID |
|---------|---------------|----------|
| Mainnet | `aptos:1` | 1 |
| Testnet | `aptos:2` | 2 |

### Account Addresses

Aptos addresses are 32-byte hex strings with `0x` prefix (64 hex characters).

### Environment Variables

```env
# Geomi Gas Station (for sponsored transactions)
GEOMI_API_KEY=your-api-key

# Network
APTOS_NETWORK=aptos:2

# USDC Asset Addresses
USDC_TESTNET_ADDRESS=0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832
USDC_MAINNET_ADDRESS=0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b
```

### Migration from v1

| v1 | v2 |
|----|----|
| Requirements in body | Requirements in `PAYMENT-REQUIRED` header |
| `X-PAYMENT` header | `PAYMENT-SIGNATURE` header |
| `X-PAYMENT-RESPONSE` header | `PAYMENT-RESPONSE` header |
| `aptos-testnet` network | `aptos:2` network |
| `maxAmountRequired` field | `amount` field |
| Separate `signature` and `transaction` | Combined `transaction` field |
| `txHash` in response | `transaction` in response |
| `networkId` in response | `network` in response |

## References

- [Aptos Developer Documentation](https://aptos.dev)
- [Aptos TypeScript SDK](https://github.com/aptos-labs/aptos-ts-sdk)
- [Aptos Sponsored Transactions](https://aptos.dev/build/guides/sponsored-transactions)
- [x402 Protocol Specification](https://github.com/coinbase/x402)
- [CAIP-2 Chain ID Specification](https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md)
- [Geomi Gas Station](https://geomi.dev/docs/gas-station)
