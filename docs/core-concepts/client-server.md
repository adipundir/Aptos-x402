# Client / Server Architecture

Understanding the components and interactions that make up an x402 payment system.

## System Overview

The x402 architecture consists of four primary components that interact to enable payment-protected API access. The client makes requests and submits payments. The server protects resources and enforces payment requirements. The facilitator handles blockchain verification and settlement. The Aptos blockchain provides final payment settlement and immutable records.

These components work together through standard HTTP requests with specialized headers and response codes, requiring minimal integration complexity while maintaining security and reliability.

## Component Roles

### Client

The client is any application or service that needs to access payment-protected resources. This could be a web browser with a wallet extension, a Node.js application with programmatic access to private keys, an AI agent capable of autonomous payment, or a mobile application with integrated wallet functionality.

Clients are responsible for detecting 402 responses that indicate payment is required. They create and sign Aptos transactions offline using their private keys. They encode payments in the X-PAYMENT header format and retry requests with payment included. Finally, they verify payment receipts and store transaction hashes for audit purposes.

The critical security property of the client role is that private keys never leave the client system. All transaction signing happens locally, and only the signed transaction is transmitted to the server.

### Server

The server hosts the API endpoints and enforces payment requirements through middleware. The server implementation requires no payment logic in your actual API routes. The middleware handles all payment operations automatically.

The server's responsibilities include returning 402 responses with payment requirements when requests lack valid payment. It forwards payment information to the facilitator for verification and settlement. It executes API logic only after successful payment settlement. Finally, it includes payment receipts in response headers to provide clients with proof of payment.

Most importantly, the server maintains stateless operation. No sessions, cookies, or authentication tokens are required. Each request is independently evaluated based solely on the payment it includes.

### Facilitator

The facilitator is a specialized service that bridges the server and blockchain. It provides two critical functions: quick offline verification of payment structure and full blockchain settlement of valid payments.

By separating these blockchain operations into a dedicated service, the architecture achieves several benefits. Multiple servers can share a single facilitator, reducing infrastructure overhead. Blockchain complexity remains isolated from application logic. The facilitator can be scaled and monitored independently. Security is enhanced by isolating operations that might require private keys (in future fee-payer implementations).

### Aptos Blockchain

The blockchain serves as the settlement layer, providing final, immutable payment records. Aptos's specific characteristics make it well-suited for x402: transaction finality in 1-3 seconds enables responsive payment flows, transaction costs around $0.0001 make micropayments economically viable, BCS serialization provides efficient transaction encoding, and the parallel execution engine supports high throughput.

The blockchain doesn't require any x402-specific smart contracts or modifications. Payments use standard Aptos coin transfer transactions, making the system simple and auditable.

## Interaction Flow

### Initial Request Without Payment

When a client first requests a protected resource, it sends a standard HTTP GET or POST request with no special headers. The server's middleware intercepts this request, identifies that the route requires payment, and returns a 402 status code with payment requirements in the response body.

The payment requirements specify everything the client needs to create a valid payment: the payment scheme (currently "exact"), the blockchain network (aptos-testnet or aptos-mainnet), the exact amount required in Octas, the recipient address, a human-readable description, and the resource URL being accessed.

This flow completes in milliseconds since no payment processing occurs. The client now has all information needed to decide whether to proceed with payment.

### Payment Creation and Signing

The client examines the payment requirements and decides whether to proceed. If proceeding, it uses the Aptos SDK to create a transfer transaction with the specified recipient and amount. The transaction is signed with the client's private key, producing an AccountAuthenticator.

Both the transaction and authenticator are serialized to BCS format, then base64-encoded for HTTP transport. These components are assembled into a payment payload that includes the protocol version, scheme, network, and the encoded transaction and signature.

The entire payment payload is then base64-encoded and placed in the X-PAYMENT header. This nested encoding allows clean HTTP transport while preserving binary transaction data.

### Request with Payment

The client retries the original request, now including the X-PAYMENT header. The server middleware extracts this header and forwards it to the facilitator's verify endpoint along with the original payment requirements.

The facilitator decodes the payment, validates its structure, and checks that it matches requirements. This verification completes in 10-50 milliseconds. If verification fails, the server returns 402 with an error message. If verification succeeds, the server calls the facilitator's settle endpoint.

Settlement involves deserializing the BCS transaction components, submitting the transaction to Aptos, and waiting for blockchain confirmation. This takes 1-3 seconds. Upon successful settlement, the facilitator returns the transaction hash to the server.

### Resource Delivery

Only after successful settlement does the server allow the API route handler to execute. Your application code runs exactly as it would for any other request, with no awareness of the payment that occurred.

The server includes the transaction hash and settlement details in an X-PAYMENT-RESPONSE header, providing the client with cryptographic proof of payment. The client can verify this transaction on the Aptos blockchain explorer, creating an immutable audit trail.

## Communication Protocols

All communication uses standard HTTP/HTTPS with JSON payloads and custom headers. The server and facilitator communicate over HTTP, typically on a private network or with authentication. The facilitator and blockchain communicate using Aptos's JSON-RPC protocol.

No proprietary protocols or special network configurations are required. The system works with standard load balancers, CDNs, and HTTP proxies, making it straightforward to integrate into existing infrastructure.

## Security Model

Security derives from several layered mechanisms. Private keys remain on client systems and never traverse the network. Transaction signatures provide cryptographic proof that payments were authorized by the key holder. Blockchain settlement ensures payments are final and irreversible. The two-phase verification-then-settlement process allows quick rejection of invalid payments before blockchain submission.

The server trusts only the blockchain. It doesn't trust clients about payment validity and doesn't trust the facilitator beyond correctly implementing the protocol. All payments can be independently verified on-chain.

## Performance Characteristics

A complete payment flow from initial 402 response to resource delivery typically completes in 1-3 seconds. This breaks down into several phases: returning the 402 response takes 10-50 milliseconds, client-side transaction signing takes 50-200 milliseconds, payment verification takes 10-50 milliseconds, blockchain settlement takes 1000-3000 milliseconds, and API processing adds whatever time your business logic requires.

The verification phase is intentionally fast to provide quick feedback on malformed payments. The settlement phase is bounded by blockchain finality rather than processing overhead.

## Deployment Patterns

### Development Pattern

During development, run everything locally: your Next.js application includes both API routes and facilitator endpoints, middleware configuration points to localhost facilitator, and you use the Aptos testnet with free test tokens.

This provides the fastest iteration cycle with minimal infrastructure requirements.

### Production Pattern

For production, separate concerns by deploying API servers as standard web services, running the facilitator as a separate service or serverless functions, implementing load balancing for both API and facilitator layers, and using the Aptos mainnet for real payments.

This separation allows independent scaling of each component and provides better isolation for security and reliability.

## Error Handling and Retry Logic

Clients should implement retry logic for transient errors but not for permanent failures. Network errors, temporary facilitator unavailability, and blockchain congestion merit retries with exponential backoff. However, insufficient balance, invalid signatures, and sequence number conflicts are permanent failures that won't succeed on retry.

Servers should return clear error messages indicating whether failures are temporary or permanent, helping clients make appropriate retry decisions.

## Next Steps

See [Facilitator](facilitator.md) for detailed facilitator architecture and [HTTP 402](http-402.md) for protocol-level details.
