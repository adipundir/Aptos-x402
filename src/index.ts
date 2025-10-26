/**
 * @x402/aptos - Official x402 Payment Protocol SDK for Aptos
 * 
 * Implement HTTP 402 Payment Required for machine-to-machine micropayments on Aptos
 * Based on Coinbase x402 protocol: https://github.com/coinbase/x402
 * 
 * @packageDocumentation
 */

// Export all types
export * from './types';

// ============================================
// FOR SELLERS (Creating Paid APIs)
// ============================================

// Export server middleware
export { paymentMiddleware } from './server';

// ============================================
// FOR BUYERS (Consuming Paid APIs)
// ============================================

// Re-export buyer functions from lib/
export { x402axios, decodeXPaymentResponse } from '../lib/x402-axios';
export type { 
  WithPaymentInterceptorOptions,
  X402Response, 
  X402PaymentResponse 
} from '../lib/x402-axios';

// Version
export const VERSION = '0.1.3';

