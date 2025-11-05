/**
 * Detailed Performance Benchmark
 * 
 * Measures exact timing of each operation in the payment flow
 * Run with: npx tsx scripts/detailed-performance-benchmark.ts
 */

import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
} from "@aptos-labs/ts-sdk";

const PRIVATE_KEY = process.env.APTOS_PRIVATE_KEY;
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000/api/protected/weather';

interface TimingResult {
  operation: string;
  duration: number;
}

async function benchmarkPaymentFlow() {
  if (!PRIVATE_KEY) {
    console.error('❌ APTOS_PRIVATE_KEY environment variable not set');
    process.exit(1);
  }

  console.log('\n🔍 DETAILED PERFORMANCE BENCHMARK\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const timings: TimingResult[] = [];
  const overall = Date.now();

  try {
    // Step 1: Initial 402 request
    let t = Date.now();
    const init402Response = await fetch(TEST_URL);
    timings.push({ operation: '1. Initial 402 Request', duration: Date.now() - t });

    t = Date.now();
    const responseData = await init402Response.json();
    timings.push({ operation: '2. Parse 402 Response', duration: Date.now() - t });

    const paymentReqs = responseData.accepts?.[0] || responseData;
    const recipient = paymentReqs.payTo || paymentReqs.paymentAddress;
    const amount = paymentReqs.maxAmountRequired || paymentReqs.price;
    const networkId = paymentReqs.network;
    const scheme = paymentReqs.scheme || 'exact';

    // Step 2: Network mapping
    t = Date.now();
    const networkMap: Record<string, Network> = {
      'aptos-testnet': Network.TESTNET,
      'aptos-mainnet': Network.MAINNET,
    };
    const network = networkMap[networkId] || Network.TESTNET;
    timings.push({ operation: '3. Network Mapping', duration: Date.now() - t });

    // Step 3: Initialize Aptos client
    t = Date.now();
    const aptosConfig = new AptosConfig({ network });
    const aptos = new Aptos(aptosConfig);
    timings.push({ operation: '4. Initialize Aptos Client', duration: Date.now() - t });

    // Step 4: Create account from private key
    t = Date.now();
    const privateKeyObj = new Ed25519PrivateKey(PRIVATE_KEY);
    const aptosAccount = Account.fromPrivateKey({ privateKey: privateKeyObj });
    timings.push({ operation: '5. Create Account from PrivateKey', duration: Date.now() - t });

    // Step 5: Build transaction
    t = Date.now();
    const amountNum = BigInt(amount);
    const transaction = await aptos.transaction.build.simple({
      sender: aptosAccount.accountAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [recipient, amountNum],
      },
    });
    timings.push({ operation: '6. Build Transaction', duration: Date.now() - t });

    // Step 6: Sign transaction
    t = Date.now();
    const senderAuthenticator = aptos.transaction.sign({ 
      signer: aptosAccount, 
      transaction 
    });
    timings.push({ operation: '7. Sign Transaction', duration: Date.now() - t });

    // Step 7: Serialize to BCS
    t = Date.now();
    const transactionBytes = transaction.bcsToBytes();
    const signatureBytes = senderAuthenticator.bcsToBytes();
    timings.push({ operation: '8. Serialize to BCS', duration: Date.now() - t });

    // Step 8: Base64 encode
    t = Date.now();
    const transactionBase64 = Buffer.from(transactionBytes).toString('base64');
    const signatureBase64 = Buffer.from(signatureBytes).toString('base64');
    timings.push({ operation: '9. Base64 Encode', duration: Date.now() - t });

    // Step 9: Create payment payload
    t = Date.now();
    const paymentPayload = {
      x402Version: 1,
      scheme,
      network: networkId,
      payload: {
        transaction: transactionBase64,
        signature: signatureBase64,
      },
    };
    const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
    timings.push({ operation: '10. Create Payment Payload', duration: Date.now() - t });

    // Step 10: Send payment request
    t = Date.now();
    const paidResponse = await fetch(TEST_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-PAYMENT': paymentHeader,
      },
    });
    timings.push({ operation: '11. Send Payment Request', duration: Date.now() - t });

    // Step 11: Parse response
    t = Date.now();
    const finalData = await paidResponse.json();
    timings.push({ operation: '12. Parse Final Response', duration: Date.now() - t });

    const totalDuration = Date.now() - overall;

    // Display results
    console.log('📊 TIMING BREAKDOWN:\n');
    console.log('Step'.padEnd(40) + 'Time (ms)');
    console.log('─'.repeat(50));

    let clientSide = 0;
    let serverSide = 0;

    timings.forEach((timing, index) => {
      const bar = '█'.repeat(Math.ceil(timing.duration / 10));
      console.log(`${timing.operation.padEnd(40)} ${timing.duration.toString().padStart(6)}ms ${bar}`);
      
      // Classify operations
      if (index === 0 || index === 10 || index === 11) {
        serverSide += timing.duration;
      } else {
        clientSide += timing.duration;
      }
    });

    console.log('─'.repeat(50));
    console.log(`${'TOTAL'.padEnd(40)} ${totalDuration.toString().padStart(6)}ms\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📈 BREAKDOWN BY CATEGORY:\n');
    console.log(`Client-Side Operations:  ${clientSide}ms (${((clientSide/totalDuration)*100).toFixed(1)}%)`);
    console.log(`Server-Side Operations:  ${serverSide}ms (${((serverSide/totalDuration)*100).toFixed(1)}%)`);
    console.log(`Network Overhead:        ${totalDuration - clientSide - serverSide}ms\n`);

    // Identify bottlenecks
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔍 BOTTLENECK ANALYSIS:\n');

    const sorted = [...timings].sort((a, b) => b.duration - a.duration);
    const top3 = sorted.slice(0, 3);

    console.log('Top 3 Slowest Operations:');
    top3.forEach((timing, index) => {
      console.log(`${index + 1}. ${timing.operation}: ${timing.duration}ms (${((timing.duration/totalDuration)*100).toFixed(1)}%)`);
    });

    // Optimization suggestions
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 OPTIMIZATION OPPORTUNITIES:\n');

    top3.forEach((timing) => {
      if (timing.operation.includes('Build Transaction')) {
        console.log('⚡ Build Transaction: Consider caching transaction builder');
      }
      if (timing.operation.includes('Payment Request') || timing.operation.includes('402 Request')) {
        console.log('⚡ Network Requests: Consider connection pooling, HTTP/2');
      }
      if (timing.operation.includes('Initialize Aptos')) {
        console.log('⚡ Aptos Client: Reuse client instance across requests');
      }
      if (timing.operation.includes('Sign Transaction')) {
        console.log('⚡ Signing: Already optimized, native crypto operation');
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Rating
    if (totalDuration < 500) {
      console.log('✅ PERFORMANCE RATING: EXCELLENT (<500ms)');
    } else if (totalDuration < 800) {
      console.log('✅ PERFORMANCE RATING: GOOD (<800ms)');
    } else if (totalDuration < 1500) {
      console.log('⚠️  PERFORMANCE RATING: OK (<1500ms)');
    } else {
      console.log('❌ PERFORMANCE RATING: NEEDS OPTIMIZATION (>1500ms)');
    }

    console.log(`\nTotal Duration: ${totalDuration}ms\n`);

  } catch (error: any) {
    console.error('\n❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

// Run benchmark
benchmarkPaymentFlow();

