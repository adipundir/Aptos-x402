# Self-Hosting ARC-8004

This guide explains how to deploy your own ARC-8004 contracts on Aptos, giving you full control over agent verification.

> ⚠️ **Note:** Most users don't need this. The [DB-only mode](/docs/guides/arc8004) provides identity, reputation, and validation without any blockchain deployment. Only follow this guide if you specifically need on-chain verification authority.

## Do You Need Self-Hosting?

| Feature | DB-Only Mode | Shared Contracts | Self-Hosted |
|---------|--------------|------------------|-------------|
| Agent identity registration | ✅ | ✅ | ✅ |
| Agent Cards with metadata | ✅ | ✅ | ✅ |
| Reputation tracking | ✅ | ✅ | ✅ |
| Task validation | ✅ | ✅ | ✅ |
| On-chain NFT minting | ❌ | ✅ | ✅ |
| **On-chain verification** | ❌ | ❌ (admin only) | ✅ **You control** |
| Setup complexity | None | Minimal | Advanced |

**Choose self-hosting only if:**
- You need to be the verification authority
- You're building a platform that verifies other agents
- You require fully decentralized identity proofs

## Prerequisites

- [Aptos CLI](https://aptos.dev/tools/aptos-cli/) installed
- Node.js 18+ and npm/pnpm
- APT tokens for gas fees (testnet: use faucet, mainnet: real APT)
- **Familiarity with Move smart contracts**

## Getting the Contracts

The ARC-8004 Move contracts are available in the Aptos-x402 repository:

```bash
# Clone the repository
git clone https://github.com/adipundir/Aptos-x402.git
cd Aptos-x402/contracts/arc8004
```

The contracts include three modules:
- `agent_identity.move` - NFT-based agent identities
- `reputation.move` - On-chain reputation (optional)
- `validation.move` - Task validation (optional)

## Step 1: Generate Admin Account

Your admin account will control all verification operations.

```bash
# Using the provided script
npx tsx scripts/generate-account.ts
```

This outputs:
```
🔑 New Aptos Account Generated
================================
Address: 0x1234...abcd
Private Key: 0xabcd...1234

⚠️ Save the private key securely!
```

**Important: Store the private key securely. This is your `ARC8004_ADMIN_PRIVATE_KEY`.**

## Step 2: Fund the Admin Account

### Testnet
```bash
# Use the Aptos faucet
curl -X POST 'https://faucet.testnet.aptoslabs.com/mint?address=YOUR_ADMIN_ADDRESS&amount=100000000'

# Or use the Aptos CLI
aptos account fund-with-faucet --account YOUR_ADMIN_ADDRESS --amount 100000000
```

### Mainnet


Transfer at least 1-2 APT to the admin address for deployment and initialization gas fees.

## Step 3: Configure Move.toml

Update `contracts/arc8004/Move.toml` with your admin address:

```toml
[package]
name = "ARC8004"
version = "1.0.0"

[addresses]
# Replace with YOUR admin address
arc8004 = "0xYOUR_ADMIN_ADDRESS_HERE"

[dependencies.AptosFramework]
git = "https://github.com/aptos-labs/aptos-core.git"
rev = "mainnet"
subdir = "aptos-move/framework/aptos-framework"

[dependencies.AptosStdlib]
git = "https://github.com/aptos-labs/aptos-core.git"
rev = "mainnet"
subdir = "aptos-move/framework/aptos-stdlib"

[dependencies.AptosTokenObjects]
git = "https://github.com/aptos-labs/aptos-core.git"
rev = "mainnet"
subdir = "aptos-move/framework/aptos-token-objects"
```

## Step 4: Deploy the Contracts

### Option A: Using the Deployment Script

```bash
# Set environment variables
export ARC8004_ADMIN_PRIVATE_KEY=your_admin_private_key
export APTOS_NETWORK=testnet  # or mainnet

# Run deployment
npx tsx scripts/deploy-arc8004.ts
```

### Option B: Using Aptos CLI Directly

```bash
# Create Aptos profile with your admin key
aptos init --profile arc8004-admin --private-key YOUR_PRIVATE_KEY --network testnet

# Compile the contracts
aptos move compile --package-dir contracts/arc8004

# Publish
aptos move publish --package-dir contracts/arc8004 --profile arc8004-admin --assume-yes
```

**Expected output:**
```
Transaction submitted: 0x75f5d9...
{
  "Result": {
    "transaction_hash": "0x75f5d9...",
    "gas_used": 1234,
    "success": true
  }
}
```

## Step 5: Initialize the Modules

After deployment, initialize all three modules:

```bash
export ARC8004_ADMIN_PRIVATE_KEY=your_admin_private_key
export ARC8004_MODULE_ADDRESS=your_admin_address  # Same as admin for fresh deploy

npx tsx scripts/initialize-arc8004.ts
```

**Expected output:**
```
=== Initializing ARC-8004 Modules ===
Network: aptos-testnet
Module Address: 0xa4d7e1f...
Admin Address: 0xa4d7e1f...

1️⃣ Initializing agent_identity module...
✅ agent_identity initialized: 0xa67bc9d...

2️⃣ Initializing reputation module...
✅ reputation initialized: 0xf6542db...

3️⃣ Initializing validation module...
✅ validation initialized: 0x3198bac...

✅ All modules initialized successfully!
📝 Admin account configured: 0xa4d7e1f...
```

## Step 6: Configure Your Application

Update your `.env` or `.env.local`:

```bash
# Your deployed module address (same as admin address for fresh deploy)
ARC8004_MODULE_ADDRESS=0xYOUR_ADMIN_ADDRESS

# Your admin private key (for verification operations)
ARC8004_ADMIN_PRIVATE_KEY=your_admin_private_key

# Enable on-chain features
ARC8004_ONCHAIN_ENABLED=true

# Auto-register agents with ARC-8004 identity
ARC8004_AUTO_REGISTER=true
```

## Step 7: Verify Agents Programmatically

Now you can verify agents using your admin credentials:

```typescript
import { IdentityRegistry } from 'aptos-x402';
import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

async function verifyAgent(agentId: string, agentPrivateKey: string) {
  // Create admin signer from your admin key
  const adminKey = new Ed25519PrivateKey(process.env.ARC8004_ADMIN_PRIVATE_KEY!);
  const adminSigner = Account.fromPrivateKey({ privateKey: adminKey });

  // Create agent signer (for minting if not already minted)
  const agentKey = new Ed25519PrivateKey(agentPrivateKey);
  const agentSigner = Account.fromPrivateKey({ privateKey: agentKey });

  // Initialize registry
  const registry = new IdentityRegistry({ 
    network: 'testnet',
    moduleAddress: process.env.ARC8004_MODULE_ADDRESS 
  });

  // Verify the agent
  const result = await registry.verifyIdentity(
    agentId,
    'admin',
    adminSigner,
    agentSigner
  );

  console.log('✅ Agent verified!');
  console.log('Mint TX:', result.mintTxHash);
  console.log('Verify TX:', result.verifyTxHash);
  
  return result;
}
```

## API Endpoint for Verification

Create an admin-only API endpoint:

```typescript
// app/api/admin/verify-agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { IdentityRegistry } from 'aptos-x402';
import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

export async function POST(request: NextRequest) {
  // Add your admin authentication here!
  const adminSecret = request.headers.get('admin-secret');
  if (adminSecret !== process.env.ADMIN_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { agentId, agentPrivateKey } = await request.json();

  const adminKey = new Ed25519PrivateKey(process.env.ARC8004_ADMIN_PRIVATE_KEY!);
  const adminSigner = Account.fromPrivateKey({ privateKey: adminKey });
  
  const agentKey = new Ed25519PrivateKey(agentPrivateKey);
  const agentSigner = Account.fromPrivateKey({ privateKey: agentKey });

  const registry = new IdentityRegistry({ network: 'testnet' });
  
  const result = await registry.verifyIdentity(
    agentId,
    'admin',
    adminSigner,
    agentSigner
  );

  return NextResponse.json({
    success: true,
    mintTxHash: result.mintTxHash,
    verifyTxHash: result.verifyTxHash,
  });
}
```

## Verification Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Admin UI/API  │────▶│   Your Server   │────▶│  Aptos Network  │
│                 │     │                 │     │                 │
│ "Verify Agent"  │     │ Admin Signer    │     │ verify_identity │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Database      │
                        │ verified: true  │
                        └─────────────────┘
```

## Troubleshooting

### "MODULE_DOES_NOT_EXIST"

Contracts not deployed. Run `deploy-arc8004.ts` first.

### "RESOURCE_ALREADY_EXISTS"

Modules already initialized. This is OK - skip to step 6.

### "E_NOT_AUTHORIZED"

The signer doesn't match the admin set during initialization. Ensure you're using the same private key.

### "INSUFFICIENT_BALANCE"

Agent wallet needs APT for minting. Fund the agent wallet first.

### Checking Deployment Status
```bash
# Check if modules are deployed
aptos move view --function-id YOUR_MODULE_ADDRESS::agent_identity::get_collection_address --profile arc8004-admin
```

## Security Best Practices

1. **Never commit private keys** - Use environment variables
2. **Secure admin endpoints** - Add authentication to verification APIs
3. **Rotate keys if compromised** - Redeploy contracts with new admin
4. **Monitor transactions** - Watch for unexpected verifications
5. **Use separate keys** - Different keys for testnet vs mainnet

## Next Steps

- [ARC-8004 Use Cases](/docs/guides/arc8004-use-cases) - See practical implementations
- [Server API Reference](/docs/api-reference/server-api) - Full API documentation
- [Facilitator Setup](/docs/guides/facilitator-setup) - Complete x402 integration
