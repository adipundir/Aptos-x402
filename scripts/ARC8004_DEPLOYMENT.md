# ARC-8004 Contract Deployment Guide

## Admin Account Configuration

The admin account has been configured in `.env`:
- **Admin Address**: `0xa4d7e1f47887dc6b84743297164fdd63deaa872329f8617be1d4c87375d39323`
- **Admin Private Key**: Set in `ARC8004_ADMIN_PRIVATE_KEY`

## Deployment Options

### Option 1: Initialize Existing Contracts (Recommended)

If the contracts are already deployed at the existing module address (`4d7a87c0032df24b6bb29424d1ab3e7dffa5ca6801382523883f38485c32555f`), just initialize them with the new admin:

```bash
tsx scripts/initialize-arc8004.ts
```

This will initialize all three modules (agent_identity, reputation, validation) with the admin account.

### Option 2: Fresh Deployment

If you need to redeploy the contracts with the admin address as the module address:

1. **Update Move.toml** (already done):
   - Module address is set to: `0xa4d7e1f47887dc6b84743297164fdd63deaa872329f8617be1d4c87375d39323`

2. **Fund the admin account**:
   - The admin account needs APT for gas fees (at least 1-2 APT recommended)
   - Admin address: `0xa4d7e1f47887dc6b84743297164fdd63deaa872329f8617be1d4c87375d39323`

3. **Deploy and initialize**:
   ```bash
   tsx scripts/deploy-arc8004.ts
   ```

4. **Update .env**:
   After deployment, update `ARC8004_MODULE_ADDRESS` to the new address (which will be the admin address).

## Verification

After initialization, you can verify agent identities on-chain. The verification API will automatically:
- Check if the identity is minted on-chain
- Call the Move contract's `verify_identity` function with the admin account
- Update the database verification status

## Troubleshooting

- **"MODULE_DOES_NOT_EXIST"**: Contracts not deployed yet. Use `deploy-arc8004.ts` first.
- **"RESOURCE_ALREADY_EXISTS"**: Modules already initialized. This is OK.
- **"E_NOT_AUTHORIZED"**: Admin account doesn't match the one set during initialization.

