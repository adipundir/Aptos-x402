/**
 * Test Geomi Gas Station Configuration
 * 
 * Verifies that GEOMI_API_KEY is set and Geomi can sponsor transactions.
 * 
 * Usage:
 *   npm run test:geomi
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

import { getGasStation } from "@/lib/services/geomi-gas-station";

async function testGeomi() {
  console.log("\n╔═══════════════════════════════════════════════════════╗");
  console.log("║         Geomi Gas Station Configuration Test          ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // Check env
  const apiKey = process.env.GEOMI_API_KEY;
  console.log("🔍 Environment:");
  console.log(`   GEOMI_API_KEY: ${apiKey ? `✅ Set (${apiKey.substring(0, 20)}...)` : '❌ Not set'}`);
  console.log(`   APTOS_NETWORK: ${process.env.APTOS_NETWORK || 'Not set (defaults to testnet)'}\n`);

  if (!apiKey) {
    console.log("❌ GEOMI_API_KEY not configured!\n");
    console.log("💡 Get an API key from https://geomi.dev and add to .env:");
    console.log("   GEOMI_API_KEY=your_api_key_here\n");
    process.exit(1);
  }

  // Initialize gas station
  const gasStation = getGasStation();
  
  if (!gasStation.isConfigured()) {
    console.log("❌ Geomi Gas Station failed to initialize!\n");
    process.exit(1);
  }

  console.log("✅ Geomi Gas Station initialized successfully!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Ready for sponsored transactions");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

testGeomi().catch((error) => {
  console.error("\n❌ Test failed:", error.message);
  process.exit(1);
});
