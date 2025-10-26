# HTTP 402 Protocol

The x402 protocol standardizes how web services can require payment for resources using the HTTP 402 Payment Required status code.

## Understanding HTTP 402

HTTP status code 402 was reserved in the original HTTP specification (RFC 2616, 1999) with the designation "Payment Required" but was never standardized or widely implemented. The specification simply noted that this code was reserved for future use, leaving its practical application undefined for over two decades.

The x402 protocol brings this reserved status code to life with a practical, blockchain-powered implementation that enables machine-to-machine micropayments over standard HTTP.

## Why 402 Remained Unused

Traditional online payment systems in 1999 lacked the characteristics necessary for the envisioned HTTP 402 use case. Credit card processing required days for settlement, imposed fees of 2-3% plus fixed costs, demanded merchant accounts and PCI compliance infrastructure, and provided no mechanism for programmatic payment by machines.

These limitations made HTTP 402 impractical for its intended purpose of enabling automated micropayments between systems. The overhead of traditional payment processing made small transactions economically infeasible.

## The x402 Solution

Blockchain technology provides the missing infrastructure to make HTTP 402 practical. Aptos blockchain enables payment settlement in 1-3 seconds with transaction costs around $0.0001. Anyone can accept payments without special merchant accounts or compliance overhead. The programmable nature of blockchain transactions makes automated payment flows straightforward to implement.

## Protocol Flow

The x402 protocol follows a simple request-response pattern. When a client requests a protected resource, the server responds with HTTP 402 and includes payment requirements in the response body. The client creates and signs a blockchain transaction offline, encodes it in an X-PAYMENT header, and retries the request. The server verifies the payment structure, settles it on the blockchain, and delivers the resource only after successful settlement.

A standard HTTP request proceeds normally:

```http
GET /api/data HTTP/1.1
Host: api.example.com

→ 200 OK
{ "data": "..." }
```

With x402 protection, the flow changes to include payment:

```http
GET /api/premium/data HTTP/1.1
Host: api.example.com

→ 402 Payment Required
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "aptos-testnet",
    "maxAmountRequired": "1000000",
    "payTo": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "description": "Premium data access",
    "resource": "https://api.example.com/api/premium/data"
  }]
}
```

The client then signs a payment transaction and retries:

```http
GET /api/premium/data HTTP/1.1
Host: api.example.com
X-PAYMENT: eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoi...

→ 200 OK
X-PAYMENT-RESPONSE: eyJzZXR0bGVtZW50Ijp7InR4SGFzaCI6Ij...
{ "data": "..." }
```

## Response Structure

The 402 response body contains versioning information and an array of acceptable payment methods. Each payment option specifies the scheme, network, amount, recipient, and additional metadata about the protected resource.

The required response format includes:

```typescript
{
  x402Version: number,           // Protocol version (currently 1)
  accepts: PaymentRequirement[]  // Array of payment options
}
```

Each payment requirement describes one acceptable payment method:

```typescript
{
  scheme: string,                // Payment scheme ("exact" for Aptos)
  network: string,               // Blockchain network identifier  
  maxAmountRequired: string,     // Amount in smallest unit (Octas)
  payTo: string,                 // Recipient address
  description?: string,          // Human-readable description
  resource: string,              // Full URL being accessed
  mimeType?: string,             // Expected response content type
  outputSchema?: object,         // JSON schema of response
  maxTimeoutSeconds?: number     // Max wait time for response
}
```

Servers can offer multiple payment options, allowing clients to choose their preferred network or payment method. This flexibility enables graceful handling of multi-chain scenarios and future protocol extensions.

## The X-PAYMENT Header

Clients include payment information in the X-PAYMENT header as a base64-encoded JSON payload:

```typescript
{
  x402Version: number,           // Protocol version
  scheme: string,                // Payment scheme used
  network: string,               // Network used
  payload: {
    transaction: string,         // Base64-encoded BCS transaction
    signature: string            // Base64-encoded BCS signature
  }
}
```

The transaction and signature are separately encoded using Aptos's BCS (Binary Canonical Serialization) format, then base64-encoded for HTTP transport. This structure allows servers to verify payments offline before submitting transactions to the blockchain.

## Payment Receipts

After successful payment settlement, servers include an X-PAYMENT-RESPONSE header with the settlement details. This provides cryptographic proof of payment and enables clients to verify the transaction on-chain.

The receipt format:

```typescript
{
  x402Version: number,
  settlement: {
    txHash: string,              // Blockchain transaction hash
    networkId: string,           // Network where settled
    timestamp?: number,          // Settlement timestamp
    blockHeight?: number         // Block number
  }
}
```

Clients can use the transaction hash to verify settlement on the Aptos blockchain explorer, providing an immutable audit trail of all payments.

## Design Principles

The x402 protocol adheres to several core principles. It remains HTTP-native, using standard status codes, headers, and methods that work with existing tools. The protocol is client-driven, giving clients full visibility into payment amounts and recipients before signing transactions. Server implementations remain stateless, requiring no sessions, cookies, or authentication tokens. The payment and resource delivery process is atomic - payment settles or the request fails, with no partial states. All operations are transparent and verifiable on the blockchain.

## Security Model

The protocol's security derives from blockchain cryptography. Clients sign transactions locally with private keys that never leave their systems. Servers cannot forge payments due to cryptographic signatures. Blockchain confirmation provides final, irreversible settlement. All payments create an auditable trail on-chain.

Payment verification happens in two stages. Quick offline verification checks payment structure and cryptographic validity in under 50 milliseconds. Slower blockchain settlement submits the transaction and waits for confirmation, taking 1-3 seconds on Aptos. This two-stage approach allows servers to reject invalid payments quickly while ensuring final settlement before delivering resources.

## Next Steps

See [Client / Server Architecture](client-server.md) for implementation patterns and [Facilitator](facilitator.md) for handling blockchain operations.
