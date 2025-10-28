# Scheme: `exact` on `Aptos`

## Summary

The `exact` scheme on Aptos enables exact-amount payments on the Aptos blockchain for access to protected resources. This scheme is designed for use cases where a resource server requires a specific, predetermined amount of APT (Aptos native token) in exchange for access to a resource.

**Key characteristics:**
- Payments are made in APT (Aptos native token, measured in Octas where 1 APT = 100,000,000 Octas)
- The payment amount is exact and predetermined by the resource server
- Payments use the built-in `0x1::aptos_account::transfer` function
- The client signs the transaction but does not submit it; the facilitator broadcasts it to the blockchain
- The client pays for gas fees (Pattern A: "Sender signs, anyone can submit")
- Settlement is atomic with resource delivery
- BCS (Binary Canonical Serialization) is used for transaction encoding

**Example use cases:**
- Pay-per-API-call services (e.g., $0.01 per weather data request)
- Premium content access (e.g., 0.1 APT per article)
- AI agent micropayments (e.g., 1000 Octas per LLM inference request)
- Metered resource access (e.g., exact payment per compute unit)

## `X-Payment` header payload

The `X-Payment` header contains a base64-encoded JSON object conforming to the `PaymentPayload` structure:

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "aptos-testnet" | "aptos-mainnet",
  "payload": {
    "signature": "99X8xzbQkOBY3yUnaeCvDslpGdMfB81aqEf7QQC8RhXJ6rripVz2Z21Vboc/CAmodHZkcDjiraFbJlzqQJKkBQ==",
    "transaction": "AAAIAQDi1HwjSnS6M+WGvD73iEyUY2FRKNj0MlRp7+3SHZM3xCvMdB0AAAAAIFRgPKOstGBLCnbcyGoOXugUYAWwVzNrpMjPCzXK4KQW..."
  }
}
```

**Note:** The `signature` and `transaction` fields contain base64-encoded BCS (Binary Canonical Serialization) bytes:
- `signature`: BCS-encoded `AccountAuthenticator` (contains the Ed25519 signature)
- `transaction`: BCS-encoded `RawTransaction` (contains all transaction details: sender, sequence number, gas, payload, etc.)

### Construction steps:

1. **Receive 402 response** with `paymentRequirements`:
   ```json
   {
     "x402Version": 1,
     "accepts": [{
       "scheme": "exact",
       "network": "aptos-testnet",
       "maxAmountRequired": "1000000",
       "payTo": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
       "resource": "https://api.example.com/weather",
       "description": "Access to weather data API",
       "mimeType": "application/json",
       "maxTimeoutSeconds": 60
     }]
   }
   ```

2. **Build the transaction** using Aptos SDK:
   ```typescript
   const transaction = await aptos.transaction.build.simple({
     sender: account.accountAddress,
     data: {
       function: "0x1::aptos_account::transfer",
       functionArguments: [
         paymentRequirements.payTo,
         paymentRequirements.maxAmountRequired
       ]
     }
   });
   ```

3. **Sign the transaction** (but do NOT submit):
   ```typescript
   const authenticator = aptos.transaction.sign({ 
     signer: account, 
     transaction 
   });
   ```

4. **Serialize to BCS and base64 encode**:
   ```typescript
   // Serialize transaction and signature separately to BCS bytes
   const transactionBytes = transaction.bcsToBytes();
   const signatureBytes = authenticator.bcsToBytes();
   
   // Base64 encode both
   const transactionBase64 = Buffer.from(transactionBytes).toString('base64');
   const signatureBase64 = Buffer.from(signatureBytes).toString('base64');
   
   // Construct the payload
   const signedTxPayload = {
     signature: signatureBase64,
     transaction: transactionBase64,
   };
   ```

5. **Create the PaymentPayload**:
   ```typescript
   const paymentPayload = {
     x402Version: 1,
     scheme: "exact",
     network: paymentRequirements.network,
     payload: signedTxPayload
   };
   ```

6. **Base64 encode** and set as X-PAYMENT header:
   ```typescript
   const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
   
   fetch(resourceUrl, {
     headers: {
       "X-PAYMENT": paymentHeader
     }
   });
   ```

## Verification

The facilitator's `/verify` endpoint performs the following validation steps **without** submitting the transaction to the blockchain:

### 1. Protocol Validation
- Verify `x402Version` matches supported version (currently 1)
- Verify `scheme` is `"exact"`
- Verify `network` is a valid Aptos network (`aptos-testnet`, `aptos-mainnet`, or `aptos-devnet`)

### 2. Payload Structure Validation
- Verify `payload` contains both `signature` and `transaction` fields (base64-encoded BCS bytes)
- Decode both from base64 to ensure valid encoding
- Verify both have non-zero length

### 3. Payment Parameters Validation
- **Recipient verification**: Ensure `transaction.payload.arguments[0]` matches `paymentRequirements.payTo`
- **Amount verification**: Ensure `transaction.payload.arguments[1]` matches `paymentRequirements.maxAmountRequired`
- **Sender verification**: Ensure `transaction.sender` is a valid Aptos address

### 4. Signature Validation (TODO - Future Enhancement)
- Deserialize the signature from `signature.signature`
- Verify the signature is valid for the transaction using `signature.public_key`
- Ensure the public key derives the sender address

### Response Format

**Success:**
```json
{
  "isValid": true,
  "invalidReason": null
}
```

**Failure:**
```json
{
  "isValid": false,
  "invalidReason": "Payment amount mismatch: expected 1000000, got 500000"
}
```

### Verification characteristics:
- ⚡ **Fast**: No blockchain interaction, purely cryptographic and structural validation
- 💰 **Free**: No gas costs incurred
- 🔒 **Secure**: Validates payment correctness before resource delivery
- 🚫 **Non-binding**: Verification alone does not move funds

## Settlement

The facilitator's `/settle` endpoint performs the following steps to execute the payment on the Aptos blockchain:

### 1. Parse Payment Payload
- Decode the base64-encoded `X-PAYMENT` header
- Extract the `payload.signature` and `payload.transaction` (both base64-encoded BCS bytes)
- Validate the scheme and network (same as verification)

### 2. Deserialize BCS to SDK Objects
Convert the BCS bytes back into Aptos SDK objects:

```typescript
import { SimpleTransaction, AccountAuthenticator, Deserializer } from "@aptos-labs/ts-sdk";

// Decode from base64
const signatureBytes = Buffer.from(payload.signature, 'base64');
const transactionBytes = Buffer.from(payload.transaction, 'base64');

// Deserialize BCS bytes back to SDK objects
const transaction = SimpleTransaction.deserialize(new Deserializer(transactionBytes));
const senderAuthenticator = AccountAuthenticator.deserialize(new Deserializer(signatureBytes));
```

### 3. Submit Using SDK Method
The facilitator uses the official Aptos SDK `submit.simple()` method (Pattern A: "Sender signs, anyone can submit"):

```typescript
const committed = await aptos.transaction.submit.simple({
  transaction,           // Deserialized RawTransaction
  senderAuthenticator,   // Deserialized AccountAuthenticator
});

console.log("Transaction hash:", committed.hash);
```

**Important:** The **sender pays gas fees** in this flow. The facilitator only broadcasts the transaction to the network. This is the standard pattern for x402 micropayments where the client has already funded their account.

### 4. Wait for Confirmation
```typescript
await aptos.waitForTransaction({ 
  transactionHash: pendingTx.hash 
});
```

The facilitator waits for the transaction to be confirmed and included in a block.

### 5. Verify Success
```typescript
const txDetails = await aptos.transaction.getTransactionByHash({
  transactionHash: pendingTx.hash
});

if (!txDetails.success) {
  throw new Error("Transaction failed on blockchain");
}
```

### 6. Return Settlement Response

**Success:**
```json
{
  "success": true,
  "error": null,
  "txHash": "0xabc123...",
  "networkId": "aptos-testnet"
}
```

**Failure:**
```json
{
  "success": false,
  "error": "Transaction failed on blockchain",
  "txHash": "0xabc123...",
  "networkId": "aptos-testnet"
}
```

### Settlement characteristics:
- 🐢 **Slow**: Requires blockchain confirmation (typically 1-3 seconds on Aptos)
- 💰 **Gas costs**: Transaction fees are paid by the sender (client), NOT the facilitator or resource server
 - **Final**: Once settled, the payment is irreversible
- 🔒 **Atomic**: Resource delivery should only occur after successful settlement

### Gas Handling

In the `exact` scheme on Aptos:
- The **client** pays for gas fees (deducted from their account balance)
- Gas fees are separate from the payment amount
- The client must have sufficient balance to cover: `maxAmountRequired + gas_fees`
- Typical gas cost: ~100-500 Octas (negligible compared to payment amounts)

**Gas Payment Patterns:**

This implementation uses **Pattern A** from the Aptos SDK docs:
- **Pattern A (Current)**: "Sender signs, anyone can submit"
  - Client signs transaction and pays gas
  - Facilitator broadcasts using `aptos.transaction.submit.simple()`
  - Simple, no facilitator funds needed
  - Recommended for most x402 use cases

- **Pattern B (Alternative)**: "Fee-payer flow"
  - Client signs transaction but facilitator pays gas
  - Facilitator broadcasts using `aptos.signAndSubmitAsFeePayer()`
  - More complex, requires facilitator to fund gas costs
  - Better for clients without APT balance

### Replay Protection

Aptos provides built-in replay protection through:
- **Sequence numbers**: Each account has a sequence number that increments with each transaction
- **Expiration timestamps**: Transactions expire after `expiration_timestamp_secs`
- Once a transaction is submitted, the sequence number is consumed and cannot be reused

The facilitator does not need to implement additional replay protection beyond validating that settlement has not already occurred.

## Appendix

### Network Configuration

| Network         | Node URL                                      | Chain ID |
|-----------------|-----------------------------------------------|----------|
| aptos-mainnet   | https://fullnode.mainnet.aptoslabs.com/v1     | 1        |
| aptos-testnet   | https://fullnode.testnet.aptoslabs.com/v1     | 2        |
| aptos-devnet    | https://fullnode.devnet.aptoslabs.com/v1      | (varies) |

### Currency Units

- **APT**: The native token of Aptos (similar to ETH on Ethereum)
- **Octas**: The smallest unit of APT
- **Conversion**: 1 APT = 100,000,000 Octas (10^8)

### Example Payment Amounts

| Description          | Octas     | APT    |
|---------------------|-----------|--------|
| Micropayment        | 1,000     | 0.00001|
| Typical API call    | 1,000,000 | 0.01   |
| Premium content     | 10,000,000| 0.1    |
| High-value resource | 100,000,000| 1.0   |

### Transaction Structure Reference

The Aptos transaction structure used in `aptos-exact`:

- `sender`: The Aptos account address sending the payment (0x-prefixed hex)
- `sequence_number`: Anti-replay nonce, auto-incremented per account
- `max_gas_amount`: Maximum gas units willing to spend (typical: 100,000)
- `gas_unit_price`: Price per gas unit in Octas (typical: 100)
- `expiration_timestamp_secs`: Unix timestamp when transaction expires
- `payload.function`: Always `"0x1::aptos_account::transfer"` for this scheme
- `payload.arguments[0]`: Recipient address (must match `paymentRequirements.payTo`)
- `payload.arguments[1]`: Amount in Octas (must match `paymentRequirements.maxAmountRequired`)

### Security Considerations

1. **Trust Model**: 
   - Client trusts the facilitator to submit their signed transaction correctly
   - Resource server trusts the facilitator to verify and settle payments
   - The facilitator CANNOT move funds other than as specified in the signed transaction

2. **Expiration**: 
   - Transactions should have reasonable expiration times (typically 60-600 seconds)
   - Expired transactions will be rejected by the Aptos network

3. **Balance Requirements**: 
   - Clients must maintain sufficient APT balance for: payment amount + gas fees
   - Failed transactions due to insufficient balance will not be retried

4. **Network Selection**: 
   - Always use mainnet for production payments
   - Use testnet only for development and testing
   - Ensure all parties (client, resource server, facilitator) agree on the network

### Future Enhancements

- **Signature verification in /verify**: Fully validate cryptographic signatures before settlement
- **Multi-currency support**: Support for Aptos fungible assets beyond native APT
- **Fee-payer flow (Pattern B)**: Allow facilitator/resource server to pay gas fees using `signAndSubmitAsFeePayer()`
- **Partial payments**: Support for "upto" scheme variant for metered usage
- **Batch payments**: Support for multiple payments in a single transaction

### References

- [Aptos Developer Documentation](https://aptos.dev)
- [Aptos TypeScript SDK](https://github.com/aptos-labs/aptos-ts-sdk)
- [Aptos REST API Specification](https://aptos.dev/apis/fullnode-rest-api)
- [x402 Protocol Specification](https://github.com/coinbase/x402)
- [BCS (Binary Canonical Serialization)](https://docs.rs/bcs/latest/bcs/)

