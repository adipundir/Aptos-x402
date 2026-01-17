# Frequently Asked Questions

## General

<details>
<summary><strong>What is x402?</strong></summary>

x402 is an open protocol specification by Coinbase that enables APIs to require cryptocurrency payments before serving responses. It uses the HTTP 402 Payment Required status code to standardize machine-to-machine micropayments.

**Key Features:**
- Standardized payment protocol
- Gasless transactions (Geomi sponsorship)
- USDC payments
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

</details>

<details>
<summary><strong>What is v2 of the protocol?</strong></summary>

v2 includes several improvements:

| Feature | v1 | v2 |
|---------|----|----|
| Version | 1 | 2 |
| Network format | `aptos-testnet` | `aptos:2` (CAIP-2) |
| Amount field | `maxAmountRequired` | `amount` |
| Asset | Optional (APT default) | Required (USDC) |
| Header name | `X-PAYMENT` | `PAYMENT-SIGNATURE` |
| Gas payment | Client pays | Sponsored by facilitator |

</details>

## Payments

<details>
<summary><strong>What currency is used?</strong></summary>

**USDC (Circle's stablecoin)** is used for all payments:

| Network | USDC Address |
|---------|--------------|
| **Mainnet** | `0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b` |
| **Testnet** | `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832` |

**Pricing (6 decimals):**
- `1000` = 0.001 USDC
- `10000` = 0.01 USDC
- `1000000` = 1 USDC

</details>

<details>
<summary><strong>How are gas fees handled?</strong></summary>

**Geomi sponsors all gas fees!**

Users only need USDC for payment - no APT required for gas.

```bash
# Configure in .env
GEOMI_API_KEY=your_api_key_from_geomi_dev
```

Get an API key at [geomi.dev](https://geomi.dev)

</details>

<details>
<summary><strong>How fast are payments?</strong></summary>

| Operation | Latency |
|-----------|---------|
| **Verification** | 50-100ms |
| **Settlement** | 1-3s |
| **Total Flow** | ~1-3s |

</details>

## Implementation

<details>
<summary><strong>Do I need a blockchain wallet?</strong></summary>

**For Sellers:**
- ✅ Need wallet address (to receive USDC)
- ❌ Don't need private key on server

**For Buyers:**
- ✅ Need funded wallet with USDC
- ✅ Need private key for signing

</details>

<details>
<summary><strong>Do my API routes need payment code?</strong></summary>

**No.** The middleware handles everything:

```typescript
// Your route - zero payment logic
export async function GET() {
  return NextResponse.json({ data: 'premium content' });
}
```

Middleware automatically:
- Returns 402 for missing payments
- Verifies payment structure
- Settles on blockchain via Geomi
- Only executes route after payment

</details>

<details>
<summary><strong>Can I charge different prices per endpoint?</strong></summary>

**Yes:**

```typescript
export const proxy = paymentMiddleware(
  recipientAddress,
  {
    '/api/weather': { price: '1000', network: 'aptos:2', asset: USDC },
    '/api/stocks': { price: '5000', network: 'aptos:2', asset: USDC },
    '/api/analytics': { price: '10000', network: 'aptos:2', asset: USDC }
  },
  facilitatorConfig
);
```

</details>

## Security

<details>
<summary><strong>Is my private key exposed?</strong></summary>

**No.**

- **Sellers:** No private keys needed on servers
- **Buyers:** Private keys stay on client, transactions signed locally

</details>

<details>
<summary><strong>Can users bypass payment?</strong></summary>

**No.** Protection is cryptographically enforced:

1. Middleware checks for `PAYMENT-SIGNATURE` header
2. Verifies transaction structure
3. Simulates on Aptos
4. Settles on blockchain
5. Only executes API after confirmation

</details>

## Production

<details>
<summary><strong>How do I test without real money?</strong></summary>

**Use Aptos Testnet:**

1. Set network:
```bash
APTOS_NETWORK=aptos:2
USDC_TESTNET_ADDRESS=0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832
```

2. Get testnet USDC (swap APT from [faucet](https://aptoslabs.com/testnet-faucet))

3. Test complete flow with zero cost

</details>

<details>
<summary><strong>What networks are supported?</strong></summary>

| Network | CAIP-2 ID | Status |
|---------|-----------|--------|
| **Mainnet** | `aptos:1` | ✅ Supported |
| **Testnet** | `aptos:2` | ✅ Supported |

</details>

## Support

<details>
<summary><strong>Where can I get help?</strong></summary>

**Resources:**
- [Documentation](https://aptos-x402.org)
- [GitHub Issues](https://github.com/adipundir/Aptos-x402/issues)
- [x402 Protocol Spec](https://github.com/coinbase/x402)
- [Geomi Docs](https://geomi.dev/docs)
- [Aptos Developer Docs](https://aptos.dev)

</details>
