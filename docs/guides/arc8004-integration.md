# ARC-8004 Integration Guide

ARC-8004 (Aptos Agent Trust Layer) is a protocol for managing AI agent identities, reputation, and task validation on Aptos. This guide covers integrating ARC-8004 into your application.

## Quick Start

### Installation

```bash
npm install aptos-x402
# or
yarn add aptos-x402
# or
pnpm add aptos-x402
```

### Basic Usage

```typescript
import { createARC8004Client } from 'aptos-x402/arc8004';

// Create client with defaults (memory storage, no on-chain)
const client = await createARC8004Client();

// Register an agent identity
const { identity } = await client.identity.register({
  agentId: 'my-agent-123',
  agentCard: {
    name: 'My Weather Agent',
    description: 'Provides real-time weather data',
    version: '1.0.0',
    capabilities: ['data-fetch', 'payment'],
    protocols: ['x402', 'http'],
    supportedNetworks: ['aptos-testnet'],
    owner: {
      address: '0x1234...abcd',
      publicKey: '0xpubkey...',
    },
  },
});

console.log('Registered identity:', identity.id);
```

## Configuration Options

### Storage Modes

ARC-8004 supports three storage modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| `memory` | In-memory storage (default) | SDK consumers, testing, stateless verification |
| `database` | PostgreSQL via Drizzle ORM | Production deployments with persistence |
| `custom` | User-provided storage | Advanced use cases, other databases |

#### Memory Storage (Default)

```typescript
const client = await createARC8004Client({
  config: {
    storageType: 'memory',
    skipAgentValidation: true, // No agents table to validate against
  },
});
```

#### Database Storage

Requires `DATABASE_URL` environment variable and database migrations.

```typescript
const client = await createARC8004Client({
  config: {
    storageType: 'database',
    skipAgentValidation: false, // Validate agents exist in DB
  },
});
```

#### Custom Storage

```typescript
import { createARC8004Client, InMemoryIdentityStorage } from 'aptos-x402/arc8004';

const client = await createARC8004Client({
  config: { storageType: 'custom' },
  storage: {
    identity: new InMemoryIdentityStorage(),
    reputation: myCustomReputationStorage,
    validation: myCustomValidationStorage,
  },
});
```

### On-Chain Integration

Enable on-chain operations to mint identity NFTs and create attestations on Aptos:

```typescript
const client = await createARC8004Client({
  config: {
    storageType: 'database',
    onChainEnabled: true,
    moduleAddress: process.env.ARC8004_MODULE_ADDRESS,
    network: 'aptos-testnet', // or 'mainnet'
  },
});
```

## Identity Management

### Register Identity

```typescript
const { identity } = await client.identity.register({
  agentId: 'agent-123',
  agentCard: {
    name: 'My Agent',
    description: 'Does useful things',
    version: '1.0.0',
    capabilities: ['payment', 'llm-interaction'],
    protocols: ['x402'],
    supportedNetworks: ['aptos-testnet'],
    owner: {
      address: '0x...',
      publicKey: '0x...',
    },
    endpoints: {
      api: 'https://api.myagent.com',
      webhook: 'https://api.myagent.com/webhook',
    },
    metadata: {
      model: 'gpt-4',
      customField: 'value',
    },
  },
});
```

### Mint Identity On-Chain

```typescript
import { Account } from '@aptos-labs/ts-sdk';

const signer = Account.fromPrivateKey({ privateKey: '0x...' });

const { tokenAddress, txHash } = await client.identity.mintOnChain(
  'agent-123',
  signer
);

console.log('NFT minted at:', tokenAddress);
```

### Verify Identity

```typescript
const { identity, txHash } = await client.identity.verify(
  'agent-123',
  'admin@example.com',
  adminSigner // Optional: for on-chain verification
);
```

### Query Identities

```typescript
// Get by agent ID
const identity = await client.identity.get('agent-123');

// Get by wallet address
const identity = await client.identity.getByAddress('0x...');

// List all verified identities
const identities = await client.identity.list({ verified: true, limit: 10 });
```

## Reputation System

### Submit Feedback

```typescript
const { feedbackId, attestationHash } = await client.reputation.submitFeedback({
  agentId: 'agent-123',
  clientAddress: '0xclient...',
  overallScore: 5, // 1-5 scale
  reliabilityScore: 5,
  speedScore: 4,
  accuracyScore: 5,
  tags: ['fast', 'accurate'],
  comment: 'Great service!',
  paymentHash: '0xpayment...', // x402 payment reference
  paymentAmount: '1000000', // Amount in octas
});
```

### Get Reputation

```typescript
const reputation = await client.reputation.getReputation('agent-123');

console.log(`Trust Level: ${reputation.trustLevel}/100`);
console.log(`Average Score: ${reputation.averageScore}/5`);
console.log(`Success Rate: ${reputation.transactions.successRate}%`);
```

### Trust Level Labels

| Level | Score Range | Label |
|-------|-------------|-------|
| UNKNOWN | 0-19 | Unknown |
| LOW | 20-39 | Low |
| MODERATE | 40-59 | Moderate |
| GOOD | 60-79 | Good |
| HIGH | 80-94 | High |
| EXCELLENT | 95-100 | Excellent |

```typescript
const { level, label } = await client.reputation.getTrustLevel('agent-123');
console.log(`Agent trust: ${label} (${level})`);
```

## Task Validation

### Submit Validation

```typescript
const { validationId } = await client.validation.submitValidation({
  taskId: 'task-456',
  agentId: 'agent-123',
  validatorId: 'validator-789',
  validationType: 'manual', // Currently supported
  proof: 'optional-proof-data',
  paymentHash: '0xpayment...',
});
```

### Approve/Reject Validation

```typescript
// Approve with optional proof
const validation = await client.validation.approve(validationId, 'proof-data');

// Reject
const validation = await client.validation.reject(validationId);
```

### Verify for Payment (x402 Integration)

```typescript
const result = await client.validation.verifyForPayment('task-456', 'agent-123');

if (result.isValid) {
  // Proceed with payment settlement
  console.log('Task validated by:', result.validatorId);
} else {
  // Reject payment
  console.log('Task not validated');
}
```

### Validation Types

| Type | Status | Description |
|------|--------|-------------|
| `manual` | ✅ Implemented | Human validator approval |
| `zkproof` | 🚧 Coming Soon | Zero-knowledge proof verification |
| `tee` | 🚧 Coming Soon | Trusted Execution Environment |
| `oracle` | 🚧 Coming Soon | External oracle verification |

```typescript
// Check if a type is implemented
if (client.validation.isTypeImplemented('zkproof')) {
  // Use zkproof validation
} else {
  console.log('zkproof coming soon:', client.validation.getComingSoonTypes());
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ARC8004_STORAGE_TYPE` | Storage mode: `memory`, `database` | No (defaults to `memory`) |
| `ARC8004_ONCHAIN_ENABLED` | Enable on-chain operations | No (defaults to `false`) |
| `ARC8004_MODULE_ADDRESS` | Move module address | Yes, if on-chain enabled |
| `ARC8004_SKIP_AGENT_VALIDATION` | Skip agent existence checks | No (auto-set based on storage) |
| `APTOS_NETWORK` | Aptos network | No (defaults to `aptos-testnet`) |
| `DATABASE_URL` | PostgreSQL connection string | Yes, if using database storage |

## Trust Algorithm

The trust level is calculated using a weighted formula:

```
trustLevel = (
  averageScore × 0.35 +
  volumeScore × 0.20 +
  successRate × 0.30 +
  reliabilityScore × 0.05 +
  speedScore × 0.05 +
  accuracyScore × 0.05
) × 100
```

Where:
- `averageScore`: Normalized overall feedback score (0-1)
- `volumeScore`: Log-scaled feedback volume (more feedback = higher trust)
- `successRate`: Transaction success rate (0-1)
- `reliabilityScore`, `speedScore`, `accuracyScore`: Normalized category scores (0-1)

## x402 Payment Integration

ARC-8004 integrates with x402 for trusted agent payments:

```typescript
import { createARC8004Client } from 'aptos-x402/arc8004';
import { x402axios } from 'aptos-x402';

// Setup ARC-8004 client
const arc8004 = await createARC8004Client({ config: { storageType: 'database' } });

// After successful x402 payment
const paymentResult = await x402axios.get('https://api.example.com/paid-endpoint');

// Record reputation feedback
await arc8004.reputation.submitFeedback({
  agentId: paymentResult.agentId,
  clientAddress: paymentResult.payerAddress,
  overallScore: 5,
  paymentHash: paymentResult.transactionHash,
  paymentAmount: paymentResult.amount,
});

// Record successful transaction
await arc8004.reputation.recordTransaction(paymentResult.agentId, true);
```

## Migration from v1.x

If you're using the direct registry classes from v1.x:

```typescript
// v1.x (still works for backward compatibility)
import { IdentityRegistry, ReputationRegistry } from '@/lib/arc8004';

const registry = new IdentityRegistry({ onChainEnabled: true });

// v2.x (recommended)
import { createARC8004Client } from 'aptos-x402/arc8004';

const client = await createARC8004Client({
  config: { onChainEnabled: true, storageType: 'database' },
});
```

The legacy registry classes still work and use database storage directly. The new `createARC8004Client` provides a cleaner API with flexible storage options.

## Best Practices

1. **Use memory storage for SDK development** - No database setup required
2. **Use database storage for production** - Data persists across restarts
3. **Enable on-chain only when needed** - On-chain operations cost gas
4. **Always validate Agent Cards** - Use `validateAgentCard()` before registration
5. **Link payments to reputation** - Use `paymentHash` in feedback for traceability
6. **Check trust levels before high-value operations** - Use reputation thresholds

## Troubleshooting

### "Agent not found" Error

If you're using memory storage and getting "Agent not found" errors:

```typescript
const client = await createARC8004Client({
  config: {
    storageType: 'memory',
    skipAgentValidation: true, // Skip agent table checks
  },
});
```

### Database Connection Issues

Ensure `DATABASE_URL` is set and the database is accessible:

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/database"
```

### On-Chain Transaction Failures

1. Ensure the signer account has sufficient APT for gas
2. Verify `ARC8004_MODULE_ADDRESS` is correct
3. Check the network matches (`aptos-testnet` vs `mainnet`)

## API Reference

See the [SDK Exports Documentation](./SDK-EXPORTS.md) for complete API reference.
