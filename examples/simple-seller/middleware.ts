/**
 * Example: Simple Seller Integration
 * 
 * Installation:
 * ```bash
 * npm install aptos-x402
 * ```
 */

import { paymentMiddleware } from 'aptos-x402';

// USDC address (set in your .env)
const USDC_ASSET = process.env.USDC_TESTNET_ADDRESS!;

export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/premium/weather': {
      price: '1000',        // 0.001 USDC
      network: 'aptos:2',   // Testnet
      asset: USDC_ASSET,
      config: {
        description: 'Premium weather data',
      },
    },
    
    '/api/premium/stocks': {
      price: '5000',        // 0.005 USDC
      network: 'aptos:2',
      asset: USDC_ASSET,
      config: {
        description: 'Real-time stock data',
      },
    },
  },
  {
    url: process.env.FACILITATOR_URL!,
  }
);

export const config = {
  matcher: ['/api/premium/:path*'],
};
