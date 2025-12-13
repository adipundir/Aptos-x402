# Frequently Asked Questions

## General

<details>
<summary><strong>What is x402?</strong></summary>

x402 is an open protocol specification by Coinbase that enables APIs to require cryptocurrency payments before serving responses. It uses the HTTP 402 Payment Required status code to standardize machine-to-machine micropayments without accounts, API keys, or subscriptions.

**Key Features:**
- Standardized payment protocol
- Blockchain-agnostic specification
- Machine-to-machine payments
- No authentication required

</details>

<details>
<summary><strong>Why Aptos for x402?</strong></summary>

Aptos provides optimal characteristics for micropayments:

| Feature | Benefit |
|---------|---------|
| **Fast Finality** | 1-3 second settlement |
| **Low Costs** | ~$0.0001 per transaction |
| **High Throughput** | Thousands of TPS |
| **Developer Experience** | Modern TypeScript SDK |

These make per-API-call charging economically viable.

</details>

<details>
<summary><strong>How is this different from API keys?</strong></summary>

| Aspect | API Keys | x402 Payments |
|--------|----------|---------------|
| **Authentication** | Secrets to manage | Cryptographic proofs |
| **Billing** | Subscriptions/Tiers | Pay-per-use |
| **Access Control** | Centralized | Decentralized |
| **Monetization** | Payment processors | Direct blockchain |
| **Leakage Risk** | Keys can leak | No secrets shared |

</details>

## Performance

<details>
<summary><strong>How fast are payments?</strong></summary>

| Operation | Latency | Notes |
|-----------|---------|-------|
| **Verification** | < 50ms | Cryptographic validation only |
| **Settlement** | 1-3s | Aptos blockchain finality |
| **Total Flow** | ~1-3s | From 402 to resource delivery |

Fast enough for interactive API calls.

</details>

<details>
<summary><strong>What are the costs?</strong></summary>

**Client Costs:**
- Transaction gas: ~$0.0001 (0.000001 APT)
- API price: Set by provider

**Server Costs:**
- Facilitator hosting only
- No per-transaction fees

**Protocol Costs:**
- Zero - completely open source

</details>

## Implementation

<details>
<summary><strong>Do I need a blockchain wallet?</strong></summary>

**For API Providers (Sellers):**
-  Need wallet address (to receive payments)
-  Don't need private key on server
- Generate: Use Petra/Martian wallet or `Account.generate()`

**For API Consumers (Buyers):**
-  Need funded wallet with private key
-  Must have APT balance for payments + gas
- Get testnet APT: [aptoslabs.com/testnet-faucet](https://aptoslabs.com/testnet-faucet)

</details>

<details>
<summary><strong>Do my API routes need payment code?</strong></summary>

**No.** The middleware handles everything:

```typescript
// Your route - zero payment logic needed
export async function GET() {
  return NextResponse.json({ data: 'premium content' });
}
```

Middleware automatically:
- Returns 402 for missing payments
- Verifies payment structure
- Settles on blockchain
- Only executes route after payment

</details>

<details>
<summary><strong>What is a facilitator?</strong></summary>

A **facilitator** is a service that handles blockchain operations:

**Responsibilities:**
- Verify payment structure (< 50ms)
- Submit transactions to blockchain (1-3s)
- Return settlement confirmation

**Deployment Options:**
1. **Public:** `https://aptos-x402.vercel.app/api/facilitator` (free)
2. **Self-Hosted (Same App):** Deploy with your API
3. **Self-Hosted (Separate):** Standalone service

See [Facilitator Setup](guides/facilitator-setup.md) for details.

</details>

<details>
<summary><strong>Can I charge different prices per endpoint?</strong></summary>

**Yes.** Configure each route independently:

```typescript
export const middleware = paymentMiddleware(
  recipientAddress,
  {
    '/api/weather': { price: '1000000' },    // 0.01 APT
    '/api/stocks': { price: '5000000' },     // 0.05 APT
    '/api/analytics': { price: '10000000' }  // 0.1 APT
  },
  facilitatorConfig
);
```

</details>

## Security

<details>
<summary><strong>Is my private key exposed?</strong></summary>

**Sellers:** No private keys needed on servers. Only public wallet address required.

**Buyers:** Private keys stay on client. Transactions signed locally, never sent to servers.

**Security Model:**
- Client signs transactions offline
- Server verifies cryptographic signatures
- Blockchain provides final settlement
- All verifiable on-chain

</details>

<details>
<summary><strong>Can users bypass payment?</strong></summary>

**No.** Protection is cryptographically enforced:

1. Middleware checks for X-PAYMENT header
2. Verifies cryptographic signature
3. Settles on blockchain
4. Only executes API after confirmation

**Cannot be bypassed because:**
- Signatures cannot be forged
- Blockchain transactions are final
- Middleware enforces before route execution

</details>

<details>
<summary><strong>Can payments be refunded?</strong></summary>

Blockchain transactions are **irreversible by default**.

**To Implement Refunds:**
1. Store client addresses from payment receipts
2. Build refund logic in your application
3. Send separate transfer transactions back

The protocol doesn't include built-in refunds.

</details>

## Production

<details>
<summary><strong>Is this production-ready?</strong></summary>

**Yes**, with proper setup:

**Required:**
-  Start with testnet for testing
-  Deploy own facilitator (or use public)
-  Implement error handling
-  Monitor settlement success rates
-  Test thoroughly before mainnet

**Best Practices:**
- Monitor wallet balances
- Log payment receipts
- Set up alerting for failures
- Have backup RPC endpoints

</details>

<details>
<summary><strong>How do I test without real money?</strong></summary>

**Use Aptos Testnet:**

1. Configure middleware:
```typescript
{ network: 'testnet' }
```

2. Generate test wallet:
```bash
npx tsx scripts/generate-account.ts
```

3. Get free testnet APT:
[aptoslabs.com/testnet-faucet](https://aptoslabs.com/testnet-faucet)

4. Test complete flow with zero cost

Everything works identically to mainnet.

</details>

<details>
<summary><strong>What networks are supported?</strong></summary>

**Current Implementation:**
- Aptos Testnet
- Aptos Mainnet

**x402 Protocol:**
- Blockchain-agnostic specification
- Implementations planned for Ethereum, Solana, Sui

**Auto-Detection:**
Client automatically detects network from 402 response.

</details>

## AI & Automation

<details>
<summary><strong>How do AI agents use x402?</strong></summary>

Perfect for autonomous agent payments:

```typescript
// Agent makes autonomous payments
const agent = {
  privateKey: process.env.AGENT_KEY
};

const data = await x402axios.get(apiUrl, {
  privateKey: agent.privateKey
});

// No human interaction required
```

**Benefits for Agents:**
- No account management
- No API keys to secure
- Pay-per-use automatically
- Fully autonomous operation

</details>

## Support

<details>
<summary><strong>Where can I get help?</strong></summary>

**Resources:**
-  [Full Documentation](https://aptos-x402.vercel.app)
-  [Report Issues](https://github.com/adipundir/Aptos-x402/issues)
-  [Discussions](https://github.com/adipundir/Aptos-x402/discussions)
-  [Twitter: @adipundir](https://x.com/adipundir)

**Additional:**
- [x402 Protocol Spec](https://github.com/coinbase/x402)
- [Aptos Developer Docs](https://aptos.dev)

</details>
