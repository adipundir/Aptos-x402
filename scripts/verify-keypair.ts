import { Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

// From the generated account
const privateKeyHex = "0x21c31d63f7719d3de90b9c14b264229db65609f11f86413cb81a7ed7fcb18f3f";
const expectedAddress = "0xfab13bbad0d9ed276b08cc5394b7a9e259246221fe67efc6da555757415e1850";
const expectedPublicKey = "0xe353ba02d722df2fed9ef60986c321a03fc4c1e8d8fae41073dc04b12c637237";

console.log("🔐 Verifying Key Pair...\n");

try {
  // Recreate account from private key
  const privateKey = new Ed25519PrivateKey(privateKeyHex);
  const account = Account.fromPrivateKey({ privateKey });

  const derivedAddress = account.accountAddress.toString();
  const derivedPublicKey = account.publicKey.toString();

  console.log("Expected:");
  console.log(`  Address:    ${expectedAddress}`);
  console.log(`  Public Key: ${expectedPublicKey}`);
  console.log("\nDerived from Private Key:");
  console.log(`  Address:    ${derivedAddress}`);
  console.log(`  Public Key: ${derivedPublicKey}`);
  console.log("\nVerification:");
  console.log(`  Address Match:    ${derivedAddress === expectedAddress ? "✅ YES" : "❌ NO"}`);
  console.log(`  Public Key Match: ${derivedPublicKey === expectedPublicKey ? "✅ YES" : "❌ NO"}`);

  if (derivedAddress === expectedAddress && derivedPublicKey === expectedPublicKey) {
    console.log("\n✅ Key pair is CORRECT! All keys match.");
  } else {
    console.log("\n❌ Key pair MISMATCH!");
  }
} catch (error) {
  console.error("❌ Error:", error);
}

