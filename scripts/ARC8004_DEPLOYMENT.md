# ARC-8004 Contract Deployment Guide

## Contract Addresses

**v2.0 (Current - with AgentScore)**:
- **Module Address**: `0xa6cfe253f864c0eca623058c7ec2e80c645c5b0a5745c853e7082ee4daad077f`
- **Admin**: Same as v1 (`0xa4d7e1f47887dc6b84743297164fdd63deaa872329f8617be1d4c87375d39323`)

**v1.0 (Legacy)**:
- **Module Address**: `0xa4d7e1f47887dc6b84743297164fdd63deaa872329f8617be1d4c87375d39323`

## ⚠️ Contract Update Required (v2.0)

The `reputation.move` contract was updated with **on-chain agent scores**:
- New `AgentScore` struct with aggregated scores per agent
- New `agent_scores` table in `ReputationRegistry`
- New view functions: `get_agent_score()`, `get_agent_trust_level()`, `has_reputation()`

**You must redeploy the contract to use on-chain scores.**

## Deployment Options

### Option 1: Redeploy Updated Contracts (Required for v2.0)

Since the `ReputationRegistry` struct changed, you need a fresh deployment:

```bash
# 1. Make sure admin account is funded (needs ~0.5 APT for gas)
tsx scripts/fund-account.ts

# 2. Deploy contracts with new schema
tsx scripts/deploy-arc8004.ts

# 3. Initialize all modules
tsx scripts/initialize-arc8004.ts
```

### Option 2: Initialize Existing Contracts (Won't work for v2.0)

If the contracts are already deployed and unchanged:

```bash
tsx scripts/initialize-arc8004.ts
```

> ⚠️ This won't work if the contract code changed - use Option 1 instead.

## Testing On-Chain Scores

After deployment, test the on-chain score APIs:

```bash
# Get on-chain score (will be empty for new agents)
curl "http://localhost:3000/api/arc8004/reputation/onchain?agentId=my-agent-123"

# Submit feedback (this creates on-chain attestation)
curl -X POST "http://localhost:3000/api/arc8004/reputation/feedback" \
  -H "Content-Type: application/json" \
  -d '{"agentId": "my-agent-123", "overallScore": 5, "comment": "Great agent!"}'

# Check on-chain score again
curl "http://localhost:3000/api/arc8004/reputation/onchain?agentId=my-agent-123"
```

## Environment Variables

Required for on-chain features:

```bash
# .env.local
ARC8004_ONCHAIN_ENABLED=true
ARC8004_MODULE_ADDRESS=0xa6cfe253f864c0eca623058c7ec2e80c645c5b0a5745c853e7082ee4daad077f
ARC8004_NETWORK=aptos-testnet
ARC8004_ADMIN_PRIVATE_KEY=0x...  # For admin operations like verification
```

## Verification

After deployment, verify with:

```bash
# Check if contract is accessible
curl "http://localhost:3000/api/arc8004/reputation/onchain?agentId=test"
# Should return: { success: true, onChainEnabled: true, hasScore: false, ... }
```

## Troubleshooting

- **"MODULE_DOES_NOT_EXIST"**: Contracts not deployed. Run `deploy-arc8004.ts`.
- **"RESOURCE_ALREADY_EXISTS"**: Modules already initialized. This is OK.
- **"Failed to get on-chain reputation"**: Contract may need redeployment for new schema.
- **On-chain score returns null**: No feedback submitted yet for this agent.
- **"E_NOT_AUTHORIZED"**: Admin account doesn't match the one set during initialization.







