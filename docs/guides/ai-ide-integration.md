# AI IDE Integration Guide for Aptos x402

## For Cursor IDE

> **Note:** The MDC context file only works with Cursor IDE.

Download the MDC context file for better code generation:
```bash
mkdir -p .cursor/rules
curl -o .cursor/rules/aptos-x402.mdc https://raw.githubusercontent.com/adipundir/aptos-x402/main/integration/aptos-x402.mdc
```

Restart Cursor IDE and use the [One-Prompt Setup](./cursor-integration.md#one-prompt-setup).

The MDC file provides Cursor with complete API documentation, function signatures, and types.

## Monetize Your APIs

```
Set up Aptos x402 payment middleware for my Next.js API:

STEP 1 - Install:
npm install aptos-x402

STEP 2 - Environment Variables (.env.local):
PAYMENT_RECIPIENT_ADDRESS=0x[your_aptos_address]
FACILITATOR_URL=https://aptos-x402.vercel.app/api/facilitator

STEP 3 - Middleware (middleware.ts):
import { paymentMiddleware } from 'aptos-x402'

paymentMiddleware(
  recipientAddress: string,
  routes: Record<string, RouteConfig>,
  facilitatorConfig: { url: string }
)

RouteConfig: { price: string; network?: string; config?: { description?: string } }

Example: Protect '/api/protected/data' with price: '1000000', network: 'aptos-testnet'
Matcher: ['/api/protected/:path*']

STEP 4 - Protected API Route (app/api/protected/data/route.ts):
export async function GET() {
  return NextResponse.json({ message: "Premium data", timestamp: Date.now() })
}
```

## Consume Paid APIs

```
Set up Aptos x402 client to consume paid APIs:

STEP 1 - Install:
npm install aptos-x402

STEP 2 - Environment Variables (.env.local):
NEXT_PUBLIC_APTOS_PRIVATE_KEY=0x[your_private_key]

STEP 3 - Client Component (app/components/PaymentClient.tsx):
import { x402axios } from 'aptos-x402'

const response = await x402axios.get(apiUrl, { 
  privateKey: process.env.NEXT_PUBLIC_APTOS_PRIVATE_KEY 
})

Response:
- response.data - API data
- response.paymentInfo?.transactionHash
- response.paymentInfo?.settled

Include: Loading state, error handling, Aptos explorer link
```

### Quick Understanding Prompt

If you just want to understand the SDK first, use this shorter version:

```
I'm integrating Aptos x402, a payment protocol SDK for monetizing APIs with blockchain micropayments. 

The SDK provides:
- paymentMiddleware() for protecting Next.js API routes (server-side)
- x402axios for consuming protected APIs with automatic payment handling (client-side)
- Built on Aptos blockchain with <3s settlement

Key concepts:
1. Server uses middleware to return 402 responses with payment requirements
2. Client detects 402, signs transaction, retries with X-PAYMENT header
3. Facilitator service handles blockchain verification and settlement

Explain how this works and show me the basic architecture.

Available at: npm install aptos-x402
Docs: https://aptos-x402.vercel.app/docs
```

## Common Integration Tasks

### Task 1: Protect API Routes

**Prompt for your AI:**
```
Help me protect my Next.js API routes using Aptos x402 middleware. I want to:
- Configure the middleware in middleware.ts
- Set price per endpoint (e.g., /api/premium/weather costs 1000000 octas)
- Use environment variables for recipient address and facilitator URL
- Ensure the middleware only runs on specific routes

Show me the middleware.ts implementation.
```

Expected AI Response Pattern:
Your AI should generate middleware configuration using `paymentMiddleware()` with proper route matching and environment variable usage.

### Task 2: Consume Protected APIs

**Prompt for your AI:**
```
Show me how to use x402axios to call a protected API endpoint. The API is at 
https://api.example.com/premium/data and requires payment. I have a private key 
in an environment variable. Handle the automatic payment flow.
```

Expected AI Response Pattern:
Your AI should show `x402axios.get()` or `x402axios.post()` with privateKey configuration and proper error handling.

### Task 3: Handle Errors

**Prompt for your AI:**
```
What errors can occur when using Aptos x402 and how should I handle them? 
Show me a robust error handling implementation for both client and server.
```

Expected AI Response Pattern:
Your AI should explain network failures, insufficient balance, timeout scenarios, and verification errors with appropriate try-catch patterns.

## Using Cursor IDE

### 1. Index Your Codebase

Add these to your `.cursorrules` file (or create one in your project root):

```
# Aptos x402 Context

This project uses Aptos x402 for API monetization with blockchain micropayments.

## Key Files
- middleware.ts - Payment middleware configuration
- lib/x402-axios.ts - Client-side payment handling
- API routes under app/api/ - Protected endpoints

## SDK Functions
- paymentMiddleware(recipientAddress, routeConfig, facilitatorConfig)
- x402axios.get(url, { privateKey })
- x402axios.post(url, data, { privateKey })

## Common Patterns
- All protected routes return 402 on first request
- Client automatically retries with X-PAYMENT header
- Facilitator verifies and settles transactions
- Response includes transaction hash on success

## Best Practices
- Keep private keys in environment variables
- Use the free public facilitator for testing
- Handle network errors gracefully
- Log transaction hashes for audit trails
```

### 2. Chat Context Commands

When asking Cursor for help, use these commands:

**For middleware setup:**
```
@middleware.ts Show me how to add a new protected route at /api/premium/analytics 
that costs 5000000 octas
```

**For client integration:**
```
@x402axios Help me create a function that calls multiple protected APIs in 
parallel and aggregates results
```

**For debugging:**
```
@terminal Show me how to test the payment flow using curl or a test script
```

### 3. Multi-File Edits

Cursor excels at multi-file changes. Try:
```
I want to add authentication on top of payment. Update the middleware to check 
for JWT tokens AND payment, modify the API routes to validate auth, and update 
the client to send both auth headers and payment.
```

## Using GitHub Copilot

GitHub Copilot works inline and via chat. Optimize your experience:

### 1. Comment-Driven Development

Write comments describing what you need, then let Copilot generate:

```typescript
// Create x402 middleware that protects /api/premium/* routes
// Charge 1000000 octas per request
// Use PAYMENT_RECIPIENT_ADDRESS from env
// Use public facilitator at https://aptos-x402.vercel.app/api/facilitator

```

Copilot will generate the middleware configuration.

### 2. Function Signature First

Define types and function signatures, let Copilot fill implementations:

```typescript
interface WeatherAPIResponse {
  temperature: number;
  condition: string;
  premium: boolean;
}

async function getPremiumWeather(privateKey: string): Promise<WeatherAPIResponse> {
  // TODO: Use x402axios to call https://api.example.com/premium/weather
}
```

### 3. Test-Driven with Copilot

Write test cases first, then let Copilot implement:

```typescript
describe('x402 payment flow', () => {
  it('should automatically handle 402 response and retry with payment', async () => {
    // Test that x402axios detects 402, signs transaction, and retries
  });
});
```