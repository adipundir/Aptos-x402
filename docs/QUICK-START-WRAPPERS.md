# Quick Start: HTTP Wrappers

The easiest way to use x402 for Aptos is through our HTTP wrappers. They handle all the complexity automatically!

## Installation

```bash
npm install @adipundir/aptos-x402
```

## Option 1: Fetch Wrapper (Recommended for Most)

Drop-in replacement for native `fetch()`:

```typescript
import { createX402Fetch } from '@adipundir/aptos-x402';

// Create the wrapper once
const fetch402 = createX402Fetch({
  privateKey: process.env.PRIVATE_KEY!,
  network: 'testnet'
});

// Use it like regular fetch!
const response = await fetch402('https://api.example.com/premium-data');
const data = await response.json();

// Check if payment was made
if (response.paymentInfo) {
  console.log(`Paid ${response.paymentInfo.amountAPT} APT`);
  console.log(`TX: ${response.paymentInfo.transactionHash}`);
}
```

## Option 2: Axios Wrapper (More Features)

Axios instance with automatic payment handling:

```typescript
import { createX402Axios } from '@adipundir/aptos-x402';

// Create the wrapper once
const axios402 = createX402Axios({
  privateKey: process.env.PRIVATE_KEY!,
  network: 'testnet',
  baseURL: 'https://api.example.com'
});

// Use it like regular axios!
const response = await axios402.get('/premium-data');
console.log(response.data);

// Payment info is attached
if (response.paymentInfo) {
  console.log(`Paid ${response.paymentInfo.amountAPT} APT`);
}
```

## How It Works

Both wrappers automatically:
1. ✅ Detect 402 Payment Required responses
2. ✅ Build payment transactions
3. ✅ Sign with your private key
4. ✅ Create X-PAYMENT header
5. ✅ Retry request with payment
6. ✅ Return response with payment info

**You don't have to do anything manually!**

## Complete Examples

### Fetch Example

```typescript
import { createX402Fetch, getAccountBalance } from '@adipundir/aptos-x402';

const config = {
  privateKey: process.env.PRIVATE_KEY!,
  network: 'testnet' as const
};

// Check balance first
const balance = await getAccountBalance(config);
console.log(`Balance: ${balance.apt} APT`);

// Create wrapper
const fetch402 = createX402Fetch(config);

// Make requests
const weather = await fetch402('https://api.example.com/weather');
const stocks = await fetch402('https://api.example.com/stocks');

console.log(await weather.json());
console.log(await stocks.json());
```

### Axios Example

```typescript
import { createX402Axios } from '@adipundir/aptos-x402';

const axios402 = createX402Axios({
  privateKey: process.env.PRIVATE_KEY!,
  network: 'testnet',
  baseURL: 'https://api.example.com',
  debug: true // See what's happening
});

// GET
const weather = await axios402.get('/weather');

// POST
const analysis = await axios402.post('/analyze', {
  text: 'Hello world'
});

// PUT
const update = await axios402.put('/update', { data: '...' });

console.log(weather.data);
console.log(analysis.data);
```

## Configuration Options

```typescript
interface Config {
  // Required
  privateKey: string;          // Your private key (hex with 0x)
  
  // Optional
  network?: 'testnet' | 'mainnet' | 'devnet';  // Default: 'testnet'
  nodeUrl?: string;             // Custom Aptos node
  debug?: boolean;              // Enable logging
  
  // Axios only
  baseURL?: string;             // Base URL for requests
  axiosConfig?: AxiosRequestConfig;  // Additional config
}
```

## Error Handling

```typescript
try {
  const response = await fetch402('https://api.example.com/data');
  
  if (!response.ok) {
    console.error(`Error ${response.status}`);
    return;
  }
  
  const data = await response.json();
  // Use data...
  
} catch (error) {
  console.error('Request failed:', error);
}
```

## Payment Info

After a successful payment, response includes:

```typescript
{
  transactionHash: string;    // Blockchain TX hash
  amountOctas: string;        // Amount in Octas
  amountAPT: number;          // Amount in APT
  recipient: string;          // Recipient address
  network: string;            // Network name
  settled: boolean;           // Settlement status
}
```

## Free vs Paid Requests

The wrapper handles both automatically:

```typescript
const fetch402 = createX402Fetch(config);

// Free endpoint - no payment
const free = await fetch402('https://api.example.com/free-data');
console.log(free.paymentInfo);  // undefined

// Paid endpoint - automatic payment
const paid = await fetch402('https://api.example.com/premium-data');
console.log(paid.paymentInfo);  // { transactionHash: "0x...", ... }
```

## That's It!

No need to manually:
- Check for 402 responses
- Build transactions
- Sign transactions
- Create payment headers
- Retry requests

Just use `fetch402()` or `axios402()` like you normally would!

## More Information

- [Complete Flow Documentation](./FLOW.md)
- [Wrapper Examples](../examples/wrappers/)
- [API Reference](../README.md)

## Support

Questions? Issues? Open an issue on GitHub or contact the maintainers.

