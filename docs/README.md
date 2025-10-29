# Aptos x402 Documentation

## Introduction

**Aptos x402** is a production-ready TypeScript SDK that implements the [x402 payment protocol](https://github.com/coinbase/x402) for the Aptos blockchain. Enable your APIs to require cryptocurrency payments before serving responses using the standardized HTTP 402 status code.

### What is x402?

x402 is an open protocol specification by Coinbase that standardizes payment-required HTTP responses. When a client requests a protected resource, the server responds with **402 Payment Required** and includes payment instructions. The client signs a blockchain transaction and retries with payment, receiving the resource after successful settlement.

### Why Aptos?

Aptos provides an optimal foundation for micropayment APIs:

| Feature | Benefit |
|---------|---------|
| **Fast Finality** | 1-3 second transaction confirmation |
| **Low Costs** | ~$0.0001 per transaction |
| **High Throughput** | Thousands of TPS |
| **Developer Experience** | Modern SDK with TypeScript support |

These characteristics make Aptos practical for per-API-call charging, unlike blockchains where fees or settlement times make micropayments economically infeasible.

## Key Capabilities

### For API Providers (Sellers)

- **Zero-Code Protection** - Middleware handles all payment logic
- **Flexible Pricing** - Configure different prices per endpoint
- **Automatic Settlement** - Payments verified and settled before API execution
- **Production Ready** - Comprehensive error handling and monitoring

### For API Consumers (Buyers)

- **Axios-Compatible** - Drop-in replacement with automatic payment handling
- **Client-Side Signing** - Private keys never leave your machine
- **Auto Network Detection** - Automatically uses correct network (testnet/mainnet)
- **AI Agent Ready** - Perfect for autonomous agent-to-agent payments

## Architecture

The x402 implementation uses a clean three-tier architecture:

1. **Client** - Signs transactions locally, never exposing private keys
2. **API Server** - Enforces payment via middleware, executes business logic
3. **Facilitator** - Handles blockchain verification and settlement
4. **Aptos Network** - Provides final settlement and immutable audit trail

This separation ensures security, scalability, and maintainability.

## Quick Start

Choose your role to get started:

### 🏪 API Providers

Protect your Next.js API routes with x402 middleware in 3 steps:

1. Configure environment variables
2. Create middleware file
3. Build your API routes (no payment code needed)

→ **[Quickstart for Sellers](getting-started/quickstart-sellers.md)**

### 🛒 API Consumers

Access x402-protected APIs with automatic payment handling:

1. Install the SDK
2. Use `x402axios` like regular axios
3. Payments handled automatically

→ **[Quickstart for Buyers](getting-started/quickstart-buyers.md)**

## Free Public Facilitator

Start building immediately with our **free public facilitator**:

```
https://aptos-x402.vercel.app/api/facilitator
```

**Features:**
- Free for all users
- Testnet and mainnet support
- Zero configuration
- Production-suitable

For custom requirements (SLAs, private infrastructure), you can self-host the facilitator service.

## Documentation Structure

### Getting Started
- **[Quickstart for Sellers](getting-started/quickstart-sellers.md)** - Protect your APIs with x402 middleware
- **[Quickstart for Buyers](getting-started/quickstart-buyers.md)** - Consume x402-protected APIs

### Core Concepts
- **[HTTP 402 Protocol](core-concepts/http-402.md)** - Understanding the x402 specification
- **[Client/Server Architecture](core-concepts/client-server.md)** - How components interact
- **[Facilitator](core-concepts/facilitator.md)** - Blockchain interaction service

### Guides
- **[Facilitator Setup](guides/facilitator-setup.md)** - Deploy your own facilitator service

### API Reference
- **[Server API](api-reference/server-api.md)** - Middleware and server-side functions
- **[Types](api-reference/types.md)** - TypeScript type definitions

### Examples
- **[Simple Seller](examples/simple-seller.md)** - Basic implementation example

## Additional Resources

| Resource | Link |
|----------|------|
| **Live Demo** | [aptos-x402.vercel.app](https://aptos-x402.vercel.app) |
| **GitHub Repository** | [github.com/adipundir/aptos-x402](https://github.com/adipundir/aptos-x402) |
| **NPM Package** | [npmjs.com/package/aptos-x402](https://www.npmjs.com/package/aptos-x402) |
| **x402 Protocol Spec** | [github.com/coinbase/x402](https://github.com/coinbase/x402) |
| **Aptos Docs** | [aptos.dev](https://aptos.dev) |

## Support

- 🐛 **Issues:** [github.com/adipundir/aptos-x402/issues](https://github.com/adipundir/aptos-x402/issues)
- 💬 **Discussions:** [github.com/adipundir/aptos-x402/discussions](https://github.com/adipundir/aptos-x402/discussions)
- 🐦 **Twitter:** [@aptos-x402](https://x.com/aptosx402)
