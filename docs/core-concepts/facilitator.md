# Facilitator

A facilitator handles blockchain interactions for x402 servers, acting as an intermediary between your API server and the Aptos blockchain.

## Purpose

The facilitator separates blockchain operations from your application logic:
- Verifies payment transactions match requirements
- Sponsors gas fees via Geomi
- Submits transactions to Aptos
- Returns settlement confirmations

## Core Operations

### Verification (`/verify`)

Validates payment structure without blockchain interaction (~50ms):

```typescript
POST /api/facilitator/verify

{
  "x402Version": 2,
  "paymentHeader": "{\"x402Version\":2,\"resource\":{...},\"payload\":{\"transaction\":\"...\"}}",
  "paymentRequirements": {
    "scheme": "exact",
    "network": "aptos:2",
    "amount": "1000",
    "asset": "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832",
    "payTo": "0x...",
    "maxTimeoutSeconds": 60
  }
}

→ { "isValid": true, "invalidReason": null }
```

Checks:
- Transaction is valid BCS encoding
- Function is `primary_fungible_store::transfer`
- Asset matches requirements
- Recipient matches `payTo`
- Amount matches or exceeds required

### Settlement (`/settle`)

Sponsors gas and submits to blockchain (~1-3s):

```typescript
POST /api/facilitator/settle

{
  "x402Version": 2,
  "paymentHeader": "{...}",
  "paymentRequirements": {...}
}

→ {
  "success": true,
  "transaction": "0x5f2e8a9b3c7d1e4f...",
  "network": "aptos:2",
  "payer": "geomi-sponsored"
}
```

The facilitator:
1. Deserializes the BCS transaction
2. Sends to Geomi Gas Station for sponsorship
3. Geomi signs as fee payer and submits
4. Returns transaction hash

## Public Facilitator

Free public facilitator at `https://aptos-x402.org/api/facilitator`:

- Works on testnet and mainnet
- No authentication required
- Geomi-powered gas sponsorship
- Zero setup needed

Use it in your config:
```
FACILITATOR_URL=https://aptos-x402.org/api/facilitator
```

## Self-Hosting

Self-host if you need:
- Guaranteed uptime SLAs
- Custom rate limits
- Private infrastructure
- Custom monitoring

### Requirements

```bash
# Environment variables
GEOMI_API_KEY=your_api_key_from_geomi_dev
APTOS_NETWORK=aptos:2
```

### Deploy

The facilitator is included in the aptos-x402 package:

```
your-app/
├── app/
│   └── api/
│       └── facilitator/
│           ├── verify/route.ts
│           └── settle/route.ts
└── proxy.ts
```

See [Facilitator Setup Guide](../guides/facilitator-setup.md) for full instructions.

## Gas Sponsorship

All transactions are sponsored by the facilitator via [Geomi Gas Station](https://geomi.dev/docs/gas-stations):

- Users don't need APT for gas
- Facilitator pays all transaction fees
- Only USDC payment is required from users
- Configure with `GEOMI_API_KEY` environment variable

## Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Verify | 50-100ms | BCS parsing, simulation |
| Settle | 1-3s | Blockchain finality |

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| INSUFFICIENT_BALANCE | Not enough USDC | Fund account with USDC |
| EOBJECT_DOES_NOT_EXIST | Invalid asset address | Use correct USDC address |
| Gas station not configured | Missing GEOMI_API_KEY | Add API key to env |
| Network mismatch | Wrong network specified | Check CAIP-2 format |

## USDC Addresses

| Network | Address |
|---------|---------|
| **Mainnet** | `0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b` |
| **Testnet** | `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832` |

## Next Steps

- [Facilitator Setup Guide](../guides/facilitator-setup.md)
- [Geomi Setup](../guides/geomi-setup.md)
