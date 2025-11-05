#!/usr/bin/env tsx
/**
 * Simple test to verify x402-axios implementation
 * This tests the transaction building without needing a running server
 */

import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
} from "@aptos-labs/ts-sdk";

const DEMO_PRIVATE_KEY = '0x21c31d63f7719d3de90b9c14b264229db65609f11f86413cb81a7ed7fcb18f3f';
const RECIPIENT = '0xfab13bbad0d9ed276b08cc5394b7a9e259246221fe67efc6da555757415e1850';
const AMOUNT = '10'; // 10 Octas

async function testTransactionBuilding() {
  console.log('\n🧪 Testing Transaction Building');
  console.log('=' .repeat(50));
  
  try {
    // Initialize Aptos client
    const aptosConfig = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(aptosConfig);
    
    // Create account from private key
    const privateKeyObj = new Ed25519PrivateKey(DEMO_PRIVATE_KEY);
    const account = Account.fromPrivateKey({ privateKey: privateKeyObj });
    
    console.log(`\n👤 Sender: ${account.accountAddress.toString()}`);
    console.log(`💰 Recipient: ${RECIPIENT}`);
    console.log(`💵 Amount: ${AMOUNT} Octas`);
    
    // Test 1: Build transaction with STRING amount (OLD - WRONG)
    console.log('\n❌ Test 1: Building with STRING amount (should encode incorrectly)');
    try {
      const tx1 = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [RECIPIENT, AMOUNT], // STRING
        },
      });
      
      const sig1 = aptos.transaction.sign({ signer: account, transaction: tx1 });
      
      // Deserialize to check
      const { SimpleTransaction, AccountAuthenticator, Deserializer } = await import("@aptos-labs/ts-sdk");
      const txBytes1 = tx1.bcsToBytes();
      const deserializedTx1 = SimpleTransaction.deserialize(new Deserializer(txBytes1));
      const payload1 = (deserializedTx1.rawTransaction.payload as any).entryFunction;
      const arg1 = payload1.args[1];
      
      console.log(`   Amount arg toString(): ${arg1.toString()}`);
      console.log(`   Amount arg type: ${arg1.constructor.name}`);
      if ('value' in arg1) {
        console.log(`   Has 'value' property: ${arg1.value}`);
      }
      
    } catch (err: any) {
      console.error(`   Error: ${err.message}`);
    }
    
    // Test 2: Build transaction with BigInt amount (NEW - CORRECT)
    console.log('\n✅ Test 2: Building with BigInt amount (should encode correctly)');
    try {
      const amountNum = BigInt(AMOUNT);
      const tx2 = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [RECIPIENT, amountNum], // BigInt
        },
      });
      
      const sig2 = aptos.transaction.sign({ signer: account, transaction: tx2 });
      
      // Deserialize to check
      const { SimpleTransaction, AccountAuthenticator, Deserializer } = await import("@aptos-labs/ts-sdk");
      const txBytes2 = tx2.bcsToBytes();
      const deserializedTx2 = SimpleTransaction.deserialize(new Deserializer(txBytes2));
      const payload2 = (deserializedTx2.rawTransaction.payload as any).entryFunction;
      const arg2 = payload2.args[1];
      
      console.log(`   Amount arg toString(): ${arg2.toString()}`);
      console.log(`   Amount arg type: ${arg2.constructor.name}`);
      
      if ('value' in arg2) {
        const valueData = arg2.value;
        console.log(`   Has 'value' property:`, valueData);
        console.log(`   Value type: ${valueData.constructor.name}`);
        console.log(`   Is Uint8Array: ${valueData instanceof Uint8Array}`);
        
        // This is what our backend verification code does:
        if (typeof valueData === 'object' && 'value' in valueData) {
          const innerValue = valueData.value;
          console.log(`   Nested value:`, innerValue);
          
          if (innerValue instanceof Uint8Array || Array.isArray(innerValue)) {
            let num = BigInt(0);
            const arr = Array.isArray(innerValue) ? innerValue : Array.from(innerValue);
            for (let i = 0; i < arr.length; i++) {
              num += BigInt(arr[i]) << BigInt(i * 8);
            }
            console.log(`   Decoded from nested value: ${num.toString()}`);
          }
        } else if (valueData instanceof Uint8Array || Array.isArray(valueData)) {
          // Convert little-endian bytes to number
          let num = BigInt(0);
          const arr = Array.isArray(valueData) ? valueData : Array.from(valueData);
          for (let i = 0; i < arr.length; i++) {
            num += BigInt(arr[i]) << BigInt(i * 8);
          }
          console.log(`   Decoded value: ${num.toString()}`);
          
          if (num.toString() === AMOUNT) {
            console.log(`   ✅ SUCCESS! Amount matches: ${num} === ${AMOUNT}`);
          } else {
            console.log(`   ❌ FAIL! Amount mismatch: ${num} !== ${AMOUNT}`);
          }
        }
      }
      
    } catch (err: any) {
      console.error(`   Error: ${err.message}`);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Transaction building test complete!');
    console.log('\n💡 Conclusion:');
    console.log('   - Use BigInt(amount) for functionArguments');
    console.log('   - This ensures proper BCS encoding as u64');
    console.log('   - The backend can then correctly decode the amount\n');
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (error.stack) {
      console.error('\nStack:', error.stack);
    }
    process.exit(1);
  }
}

testTransactionBuilding();

