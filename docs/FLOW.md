# x402 Payment Protocol - Complete Flow Documentation

## Architecture Overview

The x402 payment protocol for Aptos consists of three main components:

```
┌─────────────────┐
│     Client      │  - Creates and signs transactions
│  (Browser/App)  │  - Initiates requests
└────────┬────────┘
         │
         │ HTTP Requests
         │
         ▼
┌─────────────────┐
│ Protected API   │  - Protects resources with middleware
│  (Your Server)  │  - Manages payment requirements
└────────┬────────┘
         │
         │ Verify/Settle
         │
         ▼
┌─────────────────┐
│  Facilitator    │  - Verifies transactions
│    Service      │  - Submits to blockchain
└─────────────────┘
         │
         │ Submit TX
         │
         ▼
┌─────────────────┐
│ Aptos Blockchain│  - Records transactions
│                 │  - Processes payments
└─────────────────┘
```

## Complete Payment Flow

### Step-by-Step Process

```
┌─────────┐         ┌──────────────┐         ┌─────────────┐         ┌─────────┐
│ Client  │         │ Protected API│         │ Facilitator │         │ Aptos   │
└────┬────┘         └──────┬───────┘         └──────┬──────┘         └────┬────┘
     │                     │                        │                      │
     │ 1. GET /weather    │                        │                      │
     ├──────────────────>│                        │                      │
     │                     │                        │                      │
     │                     │ No X-PAYMENT header   │                      │
     │                     │ Route is protected    │                      │
     │                     │                        │                      │
     │ 2. 402 Response    │                        │                      │
     │<──────────────────┤                        │                      │
     │ {                  │                        │                      │
     │   "x402Version": 1 │                        │                      │
     │   "accepts": [{    │                        │                      │
     │     "scheme": "exact"                       │                      │
     │     "network": "aptos-testnet"              │                      │
     │     "maxAmountRequired": "1000000"          │                      │
     │     "payTo": "0x..."                        │                      │
     │   }]               │                        │                      │
     │ }                  │                        │                      │
     │                     │                        │                      │
     │ 3. Build TX        │                        │                      │
     │ (Client-side only) │                        │                      │
     │ - Build transfer   │                        │                      │
     │ - Sign with key    │                        │                      │
     │ - Serialize BCS    │                        │                      │
     │ - Encode base64    │                        │                      │
     │                     │                        │                      │
     │ 4. Retry + Payment │                        │                      │
     ├──────────────────>│                        │                      │
     │ X-PAYMENT: base64  │                        │                      │
     │                     │                        │                      │
     │                     │ 5. Parse & Verify     │                      │
     │                     ├──────────────────────>│                      │
     │                     │ POST /verify          │                      │
     │                     │ {                      │                      │
     │                     │   "paymentHeader",    │                      │
     │                     │   "paymentRequirements"                      │
     │                     │ }                      │                      │
     │                     │                        │                      │
     │                     │                        │ Decode BCS          │
     │                     │                        │ Check signature     │
     │                     │                        │ Check amount        │
     │                     │                        │ Check recipient     │
     │                     │                        │ (NO blockchain)     │
     │                     │                        │                      │
     │                     │ 6. Valid ✓            │                      │
     │                     │<──────────────────────┤                      │
     │                     │ { "isValid": true }   │                      │
     │                     │                        │                      │
     │                     │ 7. Settle Payment     │                      │
     │                     ├──────────────────────>│                      │
     │                     │ POST /settle          │                      │
     │                     │                        │                      │
     │                     │                        │ 8. Submit TX        │
     │                     │                        ├────────────────────>│
     │                     │                        │ aptos.transaction   │
     │                     │                        │   .submit.simple()  │
     │                     │                        │                      │
     │                     │                        │                      │ Execute
     │                     │                        │                      │ Transfer
     │                     │                        │                      │ Update
     │                     │                        │                      │ Balances
     │                     │                        │                      │
     │                     │                        │ 9. TX Hash          │
     │                     │                        │<────────────────────┤
     │                     │                        │ { "hash": "0x..." } │
     │                     │                        │                      │
     │                     │ 10. Settlement Result │                      │
     │                     │<──────────────────────┤                      │
     │                     │ {                      │                      │
     │                     │   "success": true,    │                      │
     │                     │   "txHash": "0x..."   │                      │
     │                     │ }                      │                      │
     │                     │                        │                      │
     │ 11. Resource + TX  │                        │                      │
     │<──────────────────┤                        │                      │
     │ 200 OK             │                        │                      │
     │ X-Payment-Response │                        │                      │
     │ {                  │                        │                      │
     │   "temperature": 72│                        │                      │
     │ }                  │                        │                      │
     │                     │                        │                      │
```

## Detailed Component Behavior

### 1. Client (Browser/Application)

#### Responsibilities:
- Make HTTP requests to protected resources
- Detect 402 Payment Required responses
- Build and sign payment transactions
- Retry requests with payment headers

#### Transaction Building Process:

```typescript
// Step 1: Build transaction
const transaction = await aptos.transaction.build.simple({
  sender: account.accountAddress,
  data: {
    function: "0x1::aptos_account::transfer",
    functionArguments: [recipientAddress, amountOctas]
  }
});

// Step 2: Sign transaction (creates AccountAuthenticator)
const senderAuthenticator = aptos.transaction.sign({
  signer: account,
  transaction
});

// Step 3: Serialize separately (Aptos x402 format)
const transactionBytes = transaction.bcsToBytes();      // BCS
const signatureBytes = senderAuthenticator.bcsToBytes(); // BCS

// Step 4: Encode for HTTP transport
const transactionBase64 = Buffer.from(transactionBytes).toString('base64');
const signatureBase64 = Buffer.from(signatureBytes).toString('base64');

// Step 5: Create x402 PaymentPayload
const paymentPayload = {
  x402Version: 1,
  scheme: "exact",
  network: "aptos-testnet",
  payload: {
    transaction: transactionBase64,  // Separate!
    signature: signatureBase64       // Separate!
  }
};

// Step 6: Encode entire payload as base64
const X_PAYMENT = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
```

**Key Points:**
- Transaction and signature are serialized **separately** (like Sui)
- Uses BCS (Binary Canonical Serialization) - Aptos standard
- Transaction is **signed but NOT submitted** by client
- Client never touches the blockchain directly

### 2. Protected API (Middleware)

#### Responsibilities:
- Intercept requests to protected routes
- Return 402 with payment requirements
- Forward payments to facilitator for verification
- Forward payments to facilitator for settlement
- Return resources only after successful settlement

#### Middleware Flow:

```typescript
export function paymentMiddleware(
  recipientAddress: string,
  routes: Record<string, RouteConfig>,
  facilitatorConfig: FacilitatorConfig
) {
  return async function middleware(request: NextRequest) {
    // 1. Check if route is protected
    const routeConfig = routes[request.nextUrl.pathname];
    if (!routeConfig) {
      return NextResponse.next(); // Not protected, pass through
    }

    // 2. Check for X-PAYMENT header
    const paymentHeader = request.headers.get("X-PAYMENT");
    
    if (!paymentHeader) {
      // Return 402 with payment requirements
      return NextResponse.json({
        x402Version: 1,
        accepts: [{
          scheme: "exact",
          network: "aptos-testnet",
          maxAmountRequired: routeConfig.price,
          payTo: recipientAddress,
          // ... other fields
        }]
      }, { status: 402 });
    }

    // 3. Verify payment (fast, no blockchain)
    const verification = await fetch(`${facilitatorUrl}/verify`, {
      method: "POST",
      body: JSON.stringify({
        x402Version: 1,
        paymentHeader,
        paymentRequirements
      })
    });
    
    if (!verification.isValid) {
      return NextResponse.json({ error: "Invalid payment" }, { status: 403 });
    }

    // 4. Settle payment (slow, blockchain submission)
    const settlement = await fetch(`${facilitatorUrl}/settle`, {
      method: "POST",
      body: JSON.stringify({
        x402Version: 1,
        paymentHeader,
        paymentRequirements
      })
    });
    
    if (!settlement.success) {
      return NextResponse.json({ error: "Settlement failed" }, { status: 402 });
    }

    // 5. Payment settled! Execute route handler
    const response = await NextResponse.next();
    
    // 6. Add payment response header
    response.headers.set(
      "X-Payment-Response",
      Buffer.from(JSON.stringify({ settlement })).toString('base64')
    );
    
    return response;
  };
}
```

**Key Points:**
- Verification is **fast** (signature check only, no blockchain)
- Settlement is **slow** (submits to blockchain, waits for confirmation)
- Resource is delivered **only after** successful settlement
- Settlement info is returned in `X-Payment-Response` header

### 3. Facilitator Service

The facilitator has two main endpoints:

#### /verify Endpoint (Fast)

**Purpose:** Validate transaction without submitting to blockchain

```typescript
POST /api/facilitator/verify
{
  "x402Version": 1,
  "paymentHeader": "base64...",
  "paymentRequirements": {
    "scheme": "exact",
    "network": "aptos-testnet",
    "maxAmountRequired": "1000000",
    "payTo": "0x..."
  }
}
```

**Process:**
1. Decode base64 payment header
2. Parse PaymentPayload JSON
3. Decode transaction and signature from base64
4. Verify BCS format is valid
5. Check scheme matches ("exact")
6. Check network matches ("aptos-testnet")
7. **Does NOT submit to blockchain**

**Response:**
```typescript
{
  "isValid": true,
  "invalidReason": null
}
```

**Timing:** ~50-100ms (no blockchain interaction)

#### /settle Endpoint (Slow)

**Purpose:** Submit transaction to blockchain and wait for confirmation

```typescript
POST /api/facilitator/settle
{
  "x402Version": 1,
  "paymentHeader": "base64...",
  "paymentRequirements": { /* same as verify */ }
}
```

**Process:**
1. Parse payment payload (same as verify)
2. Decode BCS bytes
3. **Deserialize** back to SDK objects:
   ```typescript
   const txDeserializer = new Deserializer(transactionBytes);
   const transaction = SimpleTransaction.deserialize(txDeserializer);
   
   const authDeserializer = new Deserializer(signatureBytes);
   const senderAuthenticator = AccountAuthenticator.deserialize(authDeserializer);
   ```
4. **Submit** to blockchain:
   ```typescript
   const committed = await aptos.transaction.submit.simple({
     transaction,
     senderAuthenticator
   });
   ```
5. **Wait** for confirmation:
   ```typescript
   await aptos.waitForTransaction({ transactionHash: committed.hash });
   ```
6. Verify transaction succeeded on blockchain

**Response:**
```typescript
{
  "success": true,
  "error": null,
  "txHash": "0x2e39909...",
  "networkId": "aptos-testnet"
}
```

**Timing:** ~2-5 seconds (includes blockchain confirmation)

### 4. Aptos Blockchain

**Role:** Execute and record transactions

**Process:**
1. Receive transaction from facilitator
2. Validate signature
3. Check sender has sufficient balance
4. Execute `0x1::aptos_account::transfer`
5. Deduct from sender balance
6. Add to recipient balance
7. Update sender sequence number
8. Record in blockchain ledger
9. Return transaction hash

**Transaction Structure:**
```rust
// Aptos Move function being called
public entry fun transfer(
    sender: &signer,
    to: address,
    amount: u64
)
```

## Transaction Format Deep Dive

### Why Separate Transaction and Signature?

Aptos uses a two-part format similar to Sui:

```typescript
{
  "transaction": "base64...",  // Serialized SimpleTransaction
  "signature": "base64..."      // Serialized AccountAuthenticator
}
```

**Benefits:**
1. **Flexibility**: Can inspect transaction without signature
2. **Security**: Signature can be validated independently
3. **Compatibility**: Matches Aptos SDK architecture
4. **Standard**: Follows Aptos BCS serialization patterns

### BCS Serialization

**BCS (Binary Canonical Serialization)** is Aptos's standard for data serialization:

- **Deterministic**: Same data always produces same bytes
- **Compact**: Efficient binary format
- **Type-safe**: Preserves type information
- **Standard**: Used throughout Aptos ecosystem

```typescript
// Serialization
const bytes = transaction.bcsToBytes();  // Uint8Array

// Deserialization
const deserializer = new Deserializer(bytes);
const transaction = SimpleTransaction.deserialize(deserializer);
```

## Timing Breakdown

Typical request timing:

```
Total Request: 2500ms
├─ Initial 402 Request: 50ms
├─ Transaction Building: 100ms
├─ Transaction Signing: 50ms
├─ Payment Request: 2300ms
   ├─ Network: 50ms
   ├─ Verification: 100ms
   ├─ Settlement: 2000ms
   │  ├─ Blockchain Submit: 500ms
   │  ├─ Confirmation Wait: 1400ms
   │  └─ Verification: 100ms
   ├─ API Processing: 100ms
   └─ Network: 50ms
```

**Optimization:**
- Verification is fast (no blockchain)
- Settlement is slow (blockchain confirmation required)
- API can respond immediately after settlement confirmation

## Security Considerations

### 1. Private Key Protection

Client must protect private key:
- Never expose in logs
- Never send to server
- Store securely (env vars, key management)

### 2. Transaction Replay Protection

Aptos prevents replay attacks via sequence numbers:
- Each account has incrementing sequence number
- Transaction includes sequence number
- Blockchain rejects transactions with old sequence numbers

### 3. Amount Verification

Facilitator verifies payment amount:
```typescript
if (actualAmount < requiredAmount) {
  return { isValid: false, invalidReason: "Insufficient amount" };
}
```

### 4. Recipient Verification

Facilitator verifies recipient address:
```typescript
if (actualRecipient !== expectedRecipient) {
  return { isValid: false, invalidReason: "Wrong recipient" };
}
```

## Error Scenarios

### Scenario 1: Insufficient Balance

```
Client → API: GET /weather
API → Client: 402 Payment Required
Client → API: GET /weather (with payment)
API → Facilitator: Settle
Facilitator → Blockchain: Submit
Blockchain: ❌ INSUFFICIENT_BALANCE
Facilitator → API: { success: false, error: "Insufficient balance" }
API → Client: 402 Payment Required
```

### Scenario 2: Invalid Signature

```
Client → API: GET /weather (with bad signature)
API → Facilitator: Verify
Facilitator: ❌ Invalid signature
Facilitator → API: { isValid: false }
API → Client: 403 Forbidden
```

### Scenario 3: Transaction Expired

```
Client → API: GET /weather (with old transaction)
API → Facilitator: Settle
Facilitator → Blockchain: Submit
Blockchain: ❌ SEQUENCE_NUMBER_TOO_OLD
Facilitator → API: { success: false, error: "Transaction expired" }
API → Client: 409 Conflict
```

## Best Practices

### For API Developers

1. **Always verify before settle**: Catch errors early without blockchain cost
2. **Return detailed errors**: Help clients debug issues
3. **Set reasonable prices**: Balance revenue vs. user friction
4. **Monitor settlement**: Track success rate and failures
5. **Handle retries gracefully**: Same transaction might be sent multiple times

### For Client Developers

1. **Check balance first**: Avoid failed transactions
2. **Cache account objects**: Better performance
3. **Handle all error codes**: 402, 403, 409, 500
4. **Add retry logic**: Network can be unreliable
5. **Show payment confirmation**: Build user trust

### For Facilitator Operators

1. **Rate limit requests**: Prevent abuse
2. **Monitor gas costs**: Settlement consumes gas
3. **Log everything**: Debug issues quickly
4. **Handle sequence conflicts**: Add retry logic
5. **Keep keys secure**: Facilitator handles sensitive operations

## Comparison with Other Schemes

### Exact Scheme (Current Implementation)

- **Pre-signed transaction**: Client signs, facilitator submits
- **Deterministic**: Amount and recipient fixed
- **Simple**: Easy to implement and verify
- **Secure**: Client never reveals private key

### Future Schemes

**Probabilistic**: Small chance of high payment
**Streaming**: Continuous micro-payments
**Subscription**: Recurring payments

## Conclusion

The x402 protocol provides a clean, HTTP-native way to monetize APIs using blockchain payments. The three-component architecture (Client, API, Facilitator) provides:

- **Separation of concerns**: Each component has clear responsibilities
- **Security**: Private keys never leave client
- **Reliability**: Verification before settlement prevents wasted transactions
- **Transparency**: Transaction hashes provide proof of payment
- **Simplicity**: Integrates with standard HTTP/REST patterns

All of this happens automatically when using the provided wrappers (`createX402Fetch`, `createX402Axios`), making micropayments as easy as a regular API call!

