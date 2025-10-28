# Scripts

Utility scripts for x402 on Aptos.

## Interactive Demos

### Test x402-axios Package

Interactive demo that shows how the x402-axios package automatically handles payments.

```bash
# Start the dev server first
npm run dev

# In another terminal, run the demo
npx tsx scripts/test-x402-axios.ts
```

**What it does:**
1. Asks for your Aptos private key
2. Checks your account balance
3. Makes a request to the protected `/api/protected/weather` endpoint
4. Automatically handles the 402 Payment Required response
5. Signs and submits the payment
6. Shows the response data and payment details

**Example output:**
```
┌─────────────────────────────────────────────────┐
│  x402-axios Demo: Automatic Payment Handling   │
└─────────────────────────────────────────────────┘

Enter your Aptos private key (0x...): 0x21c31d63f7719d3de90b9c14b264229db65609f11f86413cb81a7ed7fcb18f3f

💰 Checking account balance...
   Balance: 10.5 APT (1050000000 Octas)

🚀 Making request to protected API endpoint...

Request completed successfully!

📋 Response Details:
Status: 200 OK
Total Time: 2453ms
  ↳ Verification: 87ms
  ↳ Settlement: 2198ms

🌤️  Weather Data:
{
  "location": "San Francisco, CA",
  "temperature": 72,
  "conditions": "Sunny"
}

💰 Payment Details:
Transaction Hash: 0x2e39909...
Amount Paid: 0.01 APT (1000000 Octas)
Recipient: 0x3dbd1c97...
Network: aptos-testnet
Settled: ✓

🔗 View on Explorer:
   https://explorer.aptoslabs.com/txn/0x2e39909.../network=testnet
```

## Account Management Scripts

### Generate Account

Generate a new Aptos account with a private key.

```bash
npx tsx scripts/generate-account.ts
```

**Output:**
```
Generated new Aptos account:
Address: 0x3dbd1c976225cd44bcc8bafc22ea2b78ccc9a83c5b3fee9ce8a67a6220230fa1
Private Key: 0x21c31d63f7719d3de90b9c14b264229db65609f11f86413cb81a7ed7fcb18f3f
Public Key: 0x...

⚠️  IMPORTANT: Save your private key securely!
Add to .env file:
PRIVATE_KEY=0x21c31d63f7719d3de90b9c14b264229db65609f11f86413cb81a7ed7fcb18f3f
```

### Fund Account

Fund your account on testnet using the faucet.

```bash
npx tsx scripts/fund-account.ts <address>
```

**Example:**
```bash
npx tsx scripts/fund-account.ts 0x3dbd1c976225cd44bcc8bafc22ea2b78ccc9a83c5b3fee9ce8a67a6220230fa1
```

### Verify Keypair

Verify that your private key corresponds to the expected address.

```bash
npx tsx scripts/verify-keypair.ts
```

Reads from `.env` and verifies:
```
Private Key: 0x21c31d63...
Address: 0x3dbd1c97...
Keypair is valid!
```

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Your private key for signing transactions
PRIVATE_KEY=0x21c31d63f7719d3de90b9c14b264229db65609f11f86413cb81a7ed7fcb18f3f

# For the demo app (public)
NEXT_PUBLIC_DEMO_PRIVATE_KEY=0x21c31d63f7719d3de90b9c14b264229db65609f11f86413cb81a7ed7fcb18f3f

# Payment recipient address (where payments are sent)
PAYMENT_RECIPIENT_ADDRESS=0x3dbd1c976225cd44bcc8bafc22ea2b78ccc9a83c5b3fee9ce8a67a6220230fa1

# Facilitator URL (usually your own server)
FACILITATOR_URL=http://localhost:3000/api/facilitator
```

## Safety Tips

1. **Never commit private keys** to version control
2. **Use separate accounts** for testing and production
3. **Keep small balances** in payment accounts
4. **Always test on testnet** first
5. **Monitor account balance** regularly

## Getting Testnet APT

1. **Generate an account:**
   ```bash
   npx tsx scripts/generate-account.ts
   ```

2. **Use the faucet:**
   - Visit: https://aptos.dev/en/network/faucet
   - Or use the CLI:
     ```bash
     npx tsx scripts/fund-account.ts <your-address>
     ```

3. **Verify balance:**
   ```bash
   npx tsx scripts/test-x402-axios.ts
   # It will show your balance before making a request
   ```

## Troubleshooting

### "Insufficient balance" error

Check your balance and fund your account:
```bash
npx tsx scripts/test-x402-axios.ts
# Look at the balance output

# If needed, fund your account
npx tsx scripts/fund-account.ts <your-address>
```

### "Server not running" error

Make sure the dev server is running:
```bash
npm run dev
```

### "Invalid private key" error

Verify your private key format:
- Must start with `0x`
- Must be 66 characters long (including `0x`)
- Check that it's the correct key for your account

### "Payment verification failed" error

Common causes:
- Insufficient balance
- Wrong network (testnet vs mainnet)
- Transaction already used
- Invalid recipient address

## Next Steps

After running the demo, try:

1. **Use in your own code:**
   ```typescript
    import { x402axios } from '@adipundir/aptos-x402';

    const response = await x402axios({
       privateKey: process.env.PRIVATE_KEY!,
       url: 'http://localhost:3000/api/protected/weather'
    });

    console.log(response.data);
   ```

2. **Create your own protected endpoints:**
   - See [examples/](../examples/) for more details
   - Check [docs/](../docs/) for full documentation

3. **Deploy to production:**
   - Use mainnet network
   - Set up proper key management
   - Configure monitoring and alerts

