# x402 Protocol Tests

Comprehensive end-to-end integration tests for the x402 payment protocol on Aptos.

## Prerequisites

### 1. Environment Configuration

Ensure your `.env` file contains:

```env
# Demo account (client)
DEMO_PRIVATE_KEY=0x...
DEMO_ADDRESS=0x...

# Payment recipient (server)
PAYMENT_RECIPIENT_ADDRESS=0x...

# Facilitator
FACILITATOR_URL=http://localhost:3000/api/facilitator

# Network
APTOS_NETWORK=testnet
```

### 2. Funded Test Account

Your demo account must have sufficient APT balance:
- Minimum: 0.1 APT (for multiple test payments)
- Recommended: 1 APT

**Fund account:**
```bash
npm run tsx scripts/generate-account.ts  # Generate and fund new account
# OR manually at: https://aptoslabs.com/testnet-faucet
```

### 3. Running Server

Tests require the Next.js development server to be running:

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run tests (after server starts)
npm test
```

## Test Structure

```
tests/
  ├── e2e/                        # End-to-end integration tests
  │   ├── facilitator.test.ts     # Verify & settle endpoint tests
  │   ├── server-flow.test.ts     # Middleware behavior tests
  │   ├── client-flow.test.ts     # Client SDK tests
  │   └── full-payment-flow.test.ts # Complete integration test
  ├── utils/                      # Test utilities
  │   ├── test-helpers.ts         # Payment builders, assertions
  │   └── test-accounts.ts        # Account management
  ├── setup.ts                    # Global test setup
  └── README.md                   # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### E2E Tests Only
```bash
npm run test:e2e
```

### Watch Mode (re-run on changes)
```bash
npm run test:watch
```

### With UI
```bash
npm run test:ui
```

### Specific Test File
```bash
npx vitest run tests/e2e/facilitator.test.ts
```

### Specific Test Suite
```bash
npx vitest run -t "Facilitator Endpoints"
```

## Test Suites

### 1. Facilitator Endpoints (`facilitator.test.ts`)

Tests the `/verify` and `/settle` endpoints in isolation.

**Coverage:**
- ✅ Valid payment verification
- ✅ Invalid payload rejection (bad base64, JSON, missing fields)
- ✅ Successful settlement on blockchain
- ✅ Replay protection (duplicate transactions)
- ✅ Timing validation (verify <100ms, settle <5s)

**Run:**
```bash
npx vitest run tests/e2e/facilitator.test.ts
```

### 2. Server Middleware Flow (`server-flow.test.ts`)

Tests the x402 middleware on protected routes.

**Coverage:**
- ✅ 402 response without payment
- ✅ Invalid payment rejection
- ✅ Complete verify + settle + delivery flow
- ✅ Payment receipt in response headers
- ✅ Replay attack prevention

**Run:**
```bash
npx vitest run tests/e2e/server-flow.test.ts
```

### 3. Client SDK (`client-flow.test.ts`)

Tests the automated client SDK.

**Coverage:**
- ✅ Client initialization
- ✅ Automatic payment handling
- ✅ Balance checking
- ✅ Multiple sequential requests
- ✅ Error handling

**Run:**
```bash
npx vitest run tests/e2e/client-flow.test.ts
```

### 4. Full Payment Flow (`full-payment-flow.test.ts`)

Complete end-to-end integration test covering all steps.

**Coverage:**
- ✅ Initial 402 response
- ✅ Client builds payment
- ✅ Verification (fast path)
- ✅ Settlement (blockchain)
- ✅ Resource delivery
- ✅ On-chain confirmation
- ✅ Balance changes verification

**Run:**
```bash
npx vitest run tests/e2e/full-payment-flow.test.ts
```

## Expected Output

### Successful Test Run

```
🧪 x402 Test Suite Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Environment variables loaded
   DEMO_ADDRESS: 0xdcbd...
   PAYMENT_RECIPIENT_ADDRESS: 0x3dbd...
   FACILITATOR_URL: http://localhost:3000/api/facilitator

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 ✓ tests/e2e/facilitator.test.ts (8 tests) 2534ms
 ✓ tests/e2e/server-flow.test.ts (7 tests) 4821ms
 ✓ tests/e2e/client-flow.test.ts (9 tests) 6102ms
 ✓ tests/e2e/full-payment-flow.test.ts (2 tests) 7945ms

Test Files  4 passed (4)
     Tests  26 passed (26)
   Duration  21.4s
```

## Timing Benchmarks

| Operation | Expected Duration |
|-----------|-------------------|
| Verification | < 100ms |
| Settlement | 1000-3000ms (blockchain) |
| Full Flow | 1100-3400ms |

## Troubleshooting

### "Insufficient balance" errors

**Problem:** Demo account doesn't have enough APT.

**Solution:**
```bash
npm run tsx scripts/fund-account.ts
# OR manually: https://aptoslabs.com/testnet-faucet
```

### "FACILITATOR_URL not found" error

**Problem:** `.env` file missing or incomplete.

**Solution:** Create/update `.env` with required variables (see Prerequisites).

### "Network error" or "ECONNREFUSED"

**Problem:** Next.js server not running.

**Solution:**
```bash
# Start server in separate terminal
npm run dev
```

### Tests timing out

**Problem:** Testnet network congestion or slow blockchain confirmations.

**Solution:**
- Tests have 30s default timeout
- Blockchain operations can take 1-3s
- If consistent timeouts, check Aptos testnet status

### "Transaction already used" errors

**Problem:** Replay protection working correctly (expected for replay tests).

**Solution:** This is normal behavior - each transaction can only be used once.

## Writing New Tests

### Test Template

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import {
  loadDemoAccount,
  validateTestEnvironment,
} from '../utils/test-accounts';
import {
  buildPaymentPayload,
  createTestPaymentRequirements,
} from '../utils/test-helpers';

describe('My Test Suite', () => {
  beforeAll(async () => {
    validateTestEnvironment();
  });

  it('should do something', async () => {
    // Your test code
    expect(true).toBe(true);
  });
});
```

### Test Utilities

**Account Management:**
- `loadDemoAccount()` - Load demo account from env
- `ensureDemoAccountFunded()` - Ensure sufficient balance
- `hasSufficientBalance()` - Check balance before test

**Payment Builders:**
- `buildPaymentPayload()` - Build valid payment
- `buildInvalidPaymentPayload()` - Build invalid payment for error tests
- `createTestPaymentRequirements()` - Create test payment requirements

**Assertions:**
- `assert402Response()` - Verify 402 response structure
- `assert200Response()` - Verify 200 with payment receipt
- `assertValidVerifyResponse()` - Verify endpoint returned valid
- `assertSuccessfulSettleResponse()` - Settle endpoint returned success

**Blockchain:**
- `verifyTransactionOnChain()` - Check transaction on Aptos
- `getAccountBalance()` - Get APT balance

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test environment
        run: |
          echo "DEMO_PRIVATE_KEY=${{ secrets.TEST_PRIVATE_KEY }}" >> .env
          echo "DEMO_ADDRESS=${{ secrets.TEST_ADDRESS }}" >> .env
          echo "PAYMENT_RECIPIENT_ADDRESS=${{ secrets.RECIPIENT_ADDRESS }}" >> .env
          echo "FACILITATOR_URL=http://localhost:3000/api/facilitator" >> .env
      
      - name: Start server
        run: npm run dev &
      
      - name: Wait for server
        run: sleep 10
      
      - name: Run tests
        run: npm test
```

## Coverage Goals

- ✅ All payment flows tested
- ✅ Error scenarios covered
- ✅ Timing validated
- ✅ On-chain verification
- ✅ Balance changes verified
- ✅ Replay protection confirmed

---

**Questions or Issues?**
- Check `docs/APPLICATION_FLOW.md` for protocol details
- See test output for specific errors
- Ensure testnet faucet is working


