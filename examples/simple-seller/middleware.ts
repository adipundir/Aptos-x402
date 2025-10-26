/**
 * Example: Simple Seller Integration
 * 
 * This shows how a seller would integrate @adipundir/aptos-x402
 * into their Next.js application.
 * 
 * Installation:
 * ```bash
 * npm install @adipundir/aptos-x402 @aptos-labs/ts-sdk
 * ```
 */

import { paymentMiddleware } from '@adipundir/aptos-x402';

// Configure your protected routes
export const middleware = paymentMiddleware(
  // Your Aptos wallet address (receives payments)
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  
  // Route configuration: path -> payment requirements
  {
    '/api/premium/weather': {
      price: '1000000',  // 0.01 APT (in Octas)
      network: 'testnet',
      config: {
        description: 'Premium weather data with forecasting',
      },
    },
    
    '/api/premium/stocks': {
      price: '5000000',  // 0.05 APT
      network: 'testnet',
      config: {
        description: 'Real-time stock market data',
      },
    },
    
    '/api/premium/analytics': {
      price: '10000000',  // 0.1 APT
      network: 'testnet',
      config: {
        description: 'Advanced analytics dashboard data',
        mimeType: 'application/json',
      },
    },
  },
  
  // Facilitator configuration (REQUIRED)
  {
    url: process.env.FACILITATOR_URL!,
  }
);

// Configure which routes the middleware should intercept
export const config = {
  matcher: ['/api/premium/:path*'],
};

