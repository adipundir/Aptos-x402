import { 
  Account, 
  Aptos, 
  AptosConfig, 
  Network 
} from "@aptos-labs/ts-sdk";
import * as fs from "fs";
import * as path from "path";

async function generateAndFundAccount() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const networkArg = args.find(arg => arg.startsWith('--network='));
  let network = networkArg ? networkArg.split('=')[1] : 'testnet';
  
  // Convert simple network names to aptos- prefixed format
  if (network === 'mainnet') {
    network = 'aptos-mainnet';
  } else if (network === 'testnet') {
    network = 'aptos-testnet';
  } else if (network === 'devnet') {
    network = 'aptos-devnet';
  }
  
  console.log("🔑 Generating new Aptos account...\n");
  console.log(`Network: ${network}\n`);

  // Generate new account
  const account = Account.generate();
  
  // Get account details
  const privateKey = account.privateKey.toString();
  const publicKey = account.publicKey.toString();
  const address = account.accountAddress.toString();

  console.log("✅ Account generated!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Address:     ${address}`);
  console.log(`Public Key:  ${publicKey}`);
  console.log(`Private Key: ${privateKey}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Fund account from faucet (only for testnet)
  if (network === 'aptos-testnet') {
    console.log("💰 Funding account from testnet faucet...\n");
    
    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);

    try {
      await aptos.fundAccount({
        accountAddress: address,
        amount: 100_000_000, // 1 APT = 100,000,000 Octas
      });

      console.log("✅ Account funded with 1 APT!\n");

      // Check balance
      const balance = await aptos.getAccountAPTAmount({
        accountAddress: address,
      });

      console.log(`Current balance: ${balance / 100_000_000} APT (${balance} Octas)\n`);

    } catch (error: any) {
      console.error("❌ Error funding account:", error.message);
      console.log("\nYou can manually fund this account at:");
      console.log(`https://aptoslabs.com/testnet-faucet?address=${address}`);
    }
  } else {
    console.log("⚠️  Mainnet account generated - no faucet available");
    console.log("You'll need to fund this account with real APT from an exchange or wallet\n");
  }

  // Update .env file
  const envPath = path.join(process.cwd(), ".env");
  let envContent = "";

  // Read existing .env or .env.example
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
    console.log("📝 Updating existing .env file...");
  } else {
    const envExamplePath = path.join(process.cwd(), ".env.example");
    if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, "utf-8");
      console.log("📝 Creating .env from .env.example...");
    }
  }

  // Replace or add the demo account credentials
  const lines = envContent.split("\n");
  let updatedLines: string[] = [];
  let foundPrivateKey = false;
  let foundAddress = false;
  let foundNetwork = false;

  for (const line of lines) {
    if (line.startsWith("NEXT_PUBLIC_DEMO_PRIVATE_KEY=")) {
      updatedLines.push(`NEXT_PUBLIC_DEMO_PRIVATE_KEY=${privateKey}`);
      foundPrivateKey = true;
    } else if (line.startsWith("DEMO_ADDRESS=")) {
      updatedLines.push(`DEMO_ADDRESS=${address}`);
      foundAddress = true;
    } else if (line.startsWith("APTOS_NETWORK=")) {
      updatedLines.push(`APTOS_NETWORK=${network}`);
      foundNetwork = true;
    } else {
      updatedLines.push(line);
    }
  }

  // Add if not found
  if (!foundPrivateKey) {
    updatedLines.push(`\n# Demo Account (Generated for ${network})`);
    updatedLines.push(`NEXT_PUBLIC_DEMO_PRIVATE_KEY=${privateKey}`);
  }
  if (!foundAddress) {
    updatedLines.push(`DEMO_ADDRESS=${address}`);
  }
  if (!foundNetwork) {
    updatedLines.push(`APTOS_NETWORK=${network}`);
  }

  // Write back to .env
  fs.writeFileSync(envPath, updatedLines.join("\n"));

  console.log("✅ .env file updated!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Setup complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`\nYou can now use this account to test x402 payments on ${network}!`);
  console.log("\nEnvironment variables added:");
  console.log(`  NEXT_PUBLIC_DEMO_PRIVATE_KEY="${privateKey}"`);
  console.log(`  APTOS_NETWORK="${network}"`);
}

generateAndFundAccount().catch(console.error);

