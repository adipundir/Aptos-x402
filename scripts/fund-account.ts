import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

async function fundAccount() {
  const address = "0xfab13bbad0d9ed276b08cc5394b7a9e259246221fe67efc6da555757415e1850";
  
  if (!address) {
    console.error("❌ No DEMO_ADDRESS found in .env");
    process.exit(1);
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("💰 Funding Aptos Account from Faucet");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log(`Account: ${address}\n`);

  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);

  try {
    // Check current balance
    console.log("Checking current balance...");
    let balance = 0;
    try {
      balance = await aptos.getAccountAPTAmount({ accountAddress: address });
      console.log(`Current balance: ${balance / 100_000_000} APT (${balance} Octas)\n`);
    } catch (err) {
      console.log("Account not yet on chain (0 balance)\n");
    }

    // Try to fund from faucet
    console.log("Requesting funds from testnet faucet...");
    console.log("Amount: 1 APT (100,000,000 Octas)\n");

    try {
      // Use direct HTTP request to faucet API
      const response = await fetch(
        `https://faucet.testnet.aptoslabs.com/mint?amount=100000000&address=${address}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Faucet request failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ Faucet request successful!");
      console.log("Transaction hashes:", result);

      // Wait a bit for transaction to be processed
      console.log("\nWaiting for transaction to be processed...");
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check new balance
      const newBalance = await aptos.getAccountAPTAmount({ accountAddress: address });
      console.log(`\n✅ New balance: ${newBalance / 100_000_000} APT (${newBalance} Octas)`);
      console.log(`💸 Received: ${(newBalance - balance) / 100_000_000} APT\n`);

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎉 Account funded successfully!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    } catch (error: any) {
      console.error("❌ Faucet funding failed:", error.message);
      console.log("\n📋 Manual funding required:");
      console.log(`Visit: https://aptoslabs.com/testnet-faucet?address=${address}\n`);
      process.exit(1);
    }

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fundAccount();

