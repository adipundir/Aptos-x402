# Geomi Gas Station Setup Guide

Geomi provides gas sponsorship for x402 transactions, enabling users to make payments without needing APT for gas fees.

## Quick Setup

1. **Get an API Key**
   - Visit [https://geomi.dev](https://geomi.dev)
   - Create an account and generate an API key

2. **Configure Environment**

   Add to your `.env` file:

   ```bash
   GEOMI_API_KEY=your-api-key-here
   ```

3. **Verify Setup**

   ```bash
   npm run test:geomi
   ```

That's it! Geomi is now configured for sponsored transactions.

## How It Works

1. **Client Request**: User makes a request to a protected API endpoint
2. **402 Response**: Server returns payment requirements with `extra.sponsored: true`
3. **Client Signs**: Client builds and signs a fee payer transaction (with `0x0` placeholder)
4. **Geomi Sponsors**: Geomi receives the transaction and adds fee payer signature
5. **Submit**: Transaction is submitted with both sender and fee payer signatures
6. **Success**: Transaction is confirmed, user gets the API response

## Middleware Configuration

In your `proxy.ts`, sponsored transactions are enabled by default:

```typescript
export const proxy = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    "/api/protected/example": {
      price: "1000",
      network: process.env.APTOS_NETWORK!,
      asset: process.env.USDC_TESTNET_ADDRESS!,
      // sponsored: true is the default
    },
  },
  {
    url: process.env.FACILITATOR_URL!,
  }
);
```

To disable sponsorship:

```typescript
config: {
  sponsored: false, // Users must pay their own gas
}
```

## Monitoring

### Check Geomi Credits

Monitor your API usage in the Geomi dashboard at [https://geomi.dev](https://geomi.dev).

### Logs

```
[GasStation] ✅ Geomi Gas Station initialized
[GasStation] Sponsoring transaction via Geomi...
[GasStation] ✅ Transaction sponsored and submitted via Geomi
```

## Troubleshooting

### Error: "Geomi not configured"

**Solution**: Ensure `GEOMI_API_KEY` is set in your `.env` file.

### Error: "Geomi sponsorship failed"

**Possible causes**:
- Invalid or expired API key
- Network connectivity issues
- Geomi service unavailable

**Solution**: 
- Verify your API key in the Geomi dashboard
- Check your internet connection
- Check Geomi status at [https://status.geomi.dev](https://status.geomi.dev)

## Resources

- [Geomi Documentation](https://geomi.dev/docs)
- [Aptos Fee Payer Transactions](https://aptos.dev/guides/transaction-management/fee-payer-transactions/)
