/**
 * @adipundir/aptos-x402 - Official x402 Payment Protocol SDK for Aptos
 * 
 * Implementation of HTTP 402 Payment Required for Aptos blockchain.
 * Based on Coinbase x402 protocol: https://github.com/coinbase/x402
 * 
 * @packageDocumentation
 * 
 * @example Buyer Example - Access paid APIs
 * ```typescript
 * import { x402axios } from '@adipundir/aptos-x402';
 * 
 * const response = await x402axios({
 *   privateKey: process.env.PRIVATE_KEY!,
 *   url: 'https://api.example.com/premium/data'
 * });
 * console.log(response.data);
 * console.log(response.paymentInfo?.transactionHash);
 * ```
 * 
 * @example Seller Example - Create paid APIs
 * ```typescript
 * import { paymentMiddleware } from '@adipundir/aptos-x402';
 * 
 * export const middleware = paymentMiddleware(
 *   process.env.RECIPIENT_ADDRESS!,
 *   { '/api/premium/*': { price: '1000000', network: 'testnet' } },
 *   { url: process.env.FACILITATOR_URL! }
 * );
 * ```
 */

// ============================================
// FOR BUYERS (Consuming Paid APIs) 🛒
// ============================================

/**
 * Main buyer function - Automatically handles x402 payment flow
 * @recommended Use this for consuming paid APIs
 */
export { x402axios, decodeXPaymentResponse } from "./x402-axios";
export type { 
  WithPaymentInterceptorOptions,
  X402Response, 
  X402PaymentResponse 
} from "./x402-axios";

// ============================================
// FOR SELLERS (Creating Paid APIs) 🏪
// ============================================

/**
 * Main seller function - Next.js middleware for payment-protected routes
 * @recommended Use this for creating paid APIs
 */
export { paymentMiddleware } from "./x402-middleware";

/**
 * Configuration types for sellers
 */
export type { RouteConfig, FacilitatorConfig } from "./x402-types";

/**
 * Low-level facilitator functions (advanced usage)
 */
export {
  verifyPaymentSimple,
  settlePaymentSimple,
  createPaymentResponse,
} from "./facilitator-client";

// ============================================
// UTILITIES (Advanced Usage) 🔧
// ============================================

/**
 * Aptos blockchain utilities
 */
export {
  getAptosClient,
  getAccountFromPrivateKey,
  signAndSubmitPayment,
  getAccountBalance,
} from "./aptos-utils";