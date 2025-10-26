/**
 * Test Setup
 * 
 * Global setup for all tests.
 * Loads environment variables and validates test configuration.
 */

import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
config({ path: envPath });

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 x402 Test Suite Setup');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Validate required environment variables
const requiredEnvVars = [
  'DEMO_PRIVATE_KEY',
  'DEMO_ADDRESS',
  'PAYMENT_RECIPIENT_ADDRESS',
  'FACILITATOR_URL',
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.error('\n💡 Please create a .env file with the required variables.\n');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log(`   DEMO_ADDRESS: ${process.env.DEMO_ADDRESS}`);
console.log(`   PAYMENT_RECIPIENT_ADDRESS: ${process.env.PAYMENT_RECIPIENT_ADDRESS}`);
console.log(`   FACILITATOR_URL: ${process.env.FACILITATOR_URL}`);
console.log(`   APTOS_NETWORK: ${process.env.APTOS_NETWORK || 'testnet'}`);

// Check if server is running
const facilitatorUrl = process.env.FACILITATOR_URL;
if (facilitatorUrl && facilitatorUrl.includes('localhost')) {
  console.log('\n⚠️  Note: Tests require Next.js server to be running');
  console.log('   Run: npm run dev');
  console.log('   Then in another terminal: npm test\n');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');


