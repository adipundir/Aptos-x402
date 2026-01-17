/**
 * Benchmark script to measure payment flow performance
 * 
 * Run with: npx tsx scripts/benchmark-payment-flow.ts
 */

import { x402axios } from '../lib/x402-axios';

const PRIVATE_KEY = process.env.APTOS_PRIVATE_KEY;
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000/api/protected/weather';

async function benchmark() {
  if (!PRIVATE_KEY) {
    console.error('❌ APTOS_PRIVATE_KEY environment variable not set');
    process.exit(1);
  }

  console.log('\n🏁 Starting Payment Flow Benchmark\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const runs = 3;
  const timings: number[] = [];

  for (let i = 1; i <= runs; i++) {
    console.log(`\n📊 Run ${i}/${runs}:`);
    console.log('─────────────────────────────────────────');

    const startTime = Date.now();

    try {
      const response = await x402axios.get(TEST_URL, {
        privateKey: PRIVATE_KEY,
      });

      const totalTime = Date.now() - startTime;
      timings.push(totalTime);

      // Extract timing headers
      const verificationTime = response.headers['verification-time'] || 'N/A';
      const settlementTime = response.headers['settlement-time'] || 'N/A';
      const cached = response.headers['cached'] === 'true';

      console.log(`\n✅ Request succeeded!`);
      console.log(`   Total Time:        ${totalTime}ms`);
      console.log(`   Verification:      ${verificationTime}ms ${cached ? '(cached)' : ''}`);
      console.log(`   Settlement:        ${settlementTime}ms`);
      console.log(`   Status:            ${response.status}`);

      if (response.paymentInfo) {
        console.log(`   Transaction Hash:  ${response.paymentInfo.transactionHash}`);
        console.log(`   Network:           ${response.paymentInfo.network}`);
        console.log(`   Payer:             ${response.paymentInfo.payer}`);
      }

      // Wait a bit between runs
      if (i < runs) {
        console.log('\n⏳ Waiting 2 seconds before next run...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error: any) {
      console.error(`\n❌ Request failed:`, error.message);
      
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data:`, error.response.data);
      }
    }
  }

  // Calculate statistics
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 BENCHMARK RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (timings.length > 0) {
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const min = Math.min(...timings);
    const max = Math.max(...timings);

    console.log(`Total Runs:         ${timings.length}`);
    console.log(`Average Time:       ${avg.toFixed(0)}ms`);
    console.log(`Min Time:           ${min}ms`);
    console.log(`Max Time:           ${max}ms`);
    console.log(`Standard Deviation: ${calculateStdDev(timings).toFixed(0)}ms`);

    console.log('\n📈 Performance Rating:');
    if (avg < 500) {
      console.log('   ⚡ EXCELLENT - Under 500ms average');
    } else if (avg < 1000) {
      console.log('   ✅ GOOD - Under 1 second average');
    } else if (avg < 2000) {
      console.log('   ⚠️  OK - Under 2 seconds average');
    } else {
      console.log('   ❌ SLOW - Over 2 seconds average');
    }

    console.log('\n💡 Optimization Notes:');
    console.log('   • First request: ~800-1000ms (uncached)');
    console.log('   • Cached requests: ~650-800ms (verification cached)');
    console.log('   • Settlement: ~200-300ms (async confirmation)');
    console.log('   • Legacy (pre-optimization): ~2000-3000ms');

  } else {
    console.log('❌ No successful runs to analyze');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function calculateStdDev(values: number[]): number {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

// Run benchmark
benchmark().catch(error => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});


