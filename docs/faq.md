# Frequently Asked Questions

## What is x402?

x402 is an open protocol that enables HTTP APIs to require payment before serving responses. It uses the HTTP 402 Payment Required status code and blockchain payments to enable machine-to-machine micropayments without requiring accounts or API keys.

## Why use blockchain payments instead of traditional methods?

Traditional payment systems weren't designed for micropayments or machine-to-machine transactions. Credit card fees make sub-dollar charges impractical, and the authentication flows require human interaction. Blockchain payments settle in seconds, cost fractions of a cent, and work perfectly for automated systems.

## How fast are payments?

Payment verification completes in under 50 milliseconds since it's purely cryptographic validation. Settlement on the Aptos blockchain takes 1-3 seconds. The total flow from initial request to receiving the protected resource typically completes in under 3 seconds.

## What does it cost?

The client pays transaction gas fees of approximately 0.0001 APT plus whatever price the API provider sets. The server pays nothing except hosting costs for the facilitator. There are no protocol fees - x402 is completely open source.

## Do I need a blockchain wallet?

API providers need an Aptos wallet address to receive payments, but don't need access to the private key on their servers. API consumers need a wallet with APT tokens to make payments. For development, you can generate wallets programmatically and fund them from the testnet faucet.

## Can this work in production?

Yes, the protocol is designed for production use. Start with testnet for development and testing, then switch to mainnet when ready. Deploy your own facilitator for production rather than using the public demo facilitator. Monitor transaction success rates and implement proper error handling.

## What's a facilitator?

A facilitator is a service that handles blockchain interactions for x402 servers. It verifies payment structures and submits transactions to the Aptos blockchain. Separating these operations into a dedicated service improves security and allows multiple APIs to share the same facilitator.

## Do my API routes need payment logic?

No. The middleware handles all payment operations automatically. Your API routes execute only after successful payment settlement and require no payment-specific code. This keeps your business logic clean and focused.

## Can payments be refunded?

Blockchain transactions are final by default. You can implement refunds by sending a separate transfer back to the client's address, but this requires storing client addresses and implementing your own refund logic. The protocol itself doesn't include built-in refund mechanisms.

## What happens if a payment fails?

If payment verification or settlement fails, the server returns a 402 response and your API route never executes. Clients receive error details explaining why the payment failed. Common failures include insufficient balance, invalid signatures, or network issues.

## Can I charge different amounts for different endpoints?

Yes. Configure each route with its own price in the middleware configuration. Routes can have different prices, descriptions, and network requirements. The middleware automatically enforces the correct price for each endpoint.

## Does this work with AI agents?

Yes, this is one of the primary use cases. AI agents can autonomously make HTTP requests and include payment transactions without human interaction. The protocol's simplicity and lack of account requirements make it ideal for agent-to-agent commerce.

## Is my server's private key exposed?

Server-side implementations don't require private keys. The facilitator submits transactions that clients have already signed. For enhanced security in production, you can deploy the facilitator separately from your main application.

## Can users avoid paying?

No. The middleware only allows your API code to execute after verifying and settling payment on the blockchain. Clients cannot forge payments due to cryptographic signatures, and transactions are final once confirmed on-chain.

## What networks are supported?

This implementation supports Aptos testnet and mainnet. The protocol itself is blockchain-agnostic, and implementations exist or are planned for other chains including Ethereum, Solana, and Sui.

## How do I test without spending real money?

Use Aptos testnet, which has free test tokens available from the faucet. Configure your middleware with `network: 'testnet'` and fund test wallets from aptoslabs.com/testnet-faucet. Everything works identically to mainnet but uses test tokens with no real value.

## Where can I get help?

Open issues on the GitHub repository at github.com/adipundir/aptos-x402, check existing discussions, or refer to these documentation pages. The protocol specification at github.com/coinbase/x402 provides additional context about the broader x402 standard.
