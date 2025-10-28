import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
  AccountAddress,
  InputGenerateTransactionPayloadData,
} from "@aptos-labs/ts-sdk";

export interface TransactionPayload {
  function: string;
  functionArguments: any[];
  typeArguments?: string[];
}

export interface X402PaymentRequest {
  amount: string;
  recipient: string;
  network: string;
  memo?: string;
}

export interface X402PaymentResponse {
  transactionHash: string;
  sender: string;
  amount: string;
  recipient: string;
  timestamp: number;
}

/**
 * Initialize Aptos client based on network
 * Supports both x402 format (aptos-testnet) and simple format (testnet)
 * Uses custom RPC URLs from environment variables when available
 */
export function getAptosClient(network: string = "testnet"): Aptos {
  // Map x402 network identifiers to Aptos SDK network enum
  let aptosNetwork: Network;
  
  if (network === "aptos-mainnet" || network === "mainnet") {
    aptosNetwork = Network.MAINNET;
  } else if (network === "aptos-testnet" || network === "testnet") {
    aptosNetwork = Network.TESTNET;
  } else if (network === "aptos-devnet" || network === "devnet") {
    aptosNetwork = Network.DEVNET;
  } else if (network.startsWith("aptos-")) {
    // Strip "aptos-" prefix and use as network
    aptosNetwork = network.replace("aptos-", "").toLowerCase() as Network;
  } else {
    aptosNetwork = network.toLowerCase() as Network;
  }
  
  // Check for custom RPC URLs from environment variables
  let config: AptosConfig;
  let rpcUrl: string | undefined;
  
  // Map network to corresponding environment variable
  if (aptosNetwork === Network.MAINNET && process.env.APTOS_MAINNET_NODE_URL) {
    rpcUrl = process.env.APTOS_MAINNET_NODE_URL;
  } else if (aptosNetwork === Network.TESTNET && process.env.APTOS_TESTNET_NODE_URL) {
    rpcUrl = process.env.APTOS_TESTNET_NODE_URL;
  } else if (aptosNetwork === Network.DEVNET && process.env.APTOS_DEVNET_NODE_URL) {
    rpcUrl = process.env.APTOS_DEVNET_NODE_URL;
  }
  
  if (rpcUrl) {
    config = new AptosConfig({ 
      network: aptosNetwork,
      fullnode: rpcUrl
    });
  } else {
    // Use default Aptos Labs RPC endpoints
    config = new AptosConfig({ network: aptosNetwork });
  }
  
  return new Aptos(config);
}

/**
 * Create an Account from a private key
 */
export function getAccountFromPrivateKey(privateKeyHex: string): Account {
  // Remove '0x' prefix if present
  const cleanKey = privateKeyHex.replace(/^0x/, "");
  const privateKey = new Ed25519PrivateKey(cleanKey);
  return Account.fromPrivateKey({ privateKey });
}

/**
 * Sign and submit a simple coin transfer transaction
 */
export async function signAndSubmitPayment(
  aptos: Aptos,
  sender: Account,
  recipientAddress: string,
  amount: string
): Promise<string> {
  const transaction = await aptos.transaction.build.simple({
    sender: sender.accountAddress,
    data: {
      function: "0x1::aptos_account::transfer",
      functionArguments: [recipientAddress, amount],
    },
  });

  const committedTxn = await aptos.signAndSubmitTransaction({
    signer: sender,
    transaction,
  });

  return committedTxn.hash;
}

/**
 * Verify a transaction exists and matches expected parameters
 */
export async function verifyTransaction(
  aptos: Aptos,
  transactionHash: string,
  expectedSender?: string,
  expectedRecipient?: string,
  expectedAmount?: string
): Promise<boolean> {
  try {
    const txn = await aptos.transaction.getTransactionByHash({
      transactionHash,
    });

    // Check if transaction is committed and successful
    if (!('success' in txn) || !txn.success) {
      return false;
    }

    // Basic verification - transaction exists and succeeded
    if (!expectedSender && !expectedRecipient && !expectedAmount) {
      return true;
    }

    // Additional verification if parameters provided
    const payload = (txn as any).payload;
    
    if (payload?.function === "0x1::aptos_account::transfer") {
      const args = payload.arguments;
      
      if (expectedRecipient && args[0] !== expectedRecipient) {
        return false;
      }
      
      if (expectedAmount && args[1] !== expectedAmount) {
        return false;
      }
    }

    if (expectedSender && (txn as any).sender !== expectedSender) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error verifying transaction:", error);
    return false;
  }
}

/**
 * Wait for a transaction to be confirmed
 */
export async function waitForTransaction(
  aptos: Aptos,
  transactionHash: string
): Promise<boolean> {
  try {
    await aptos.waitForTransaction({
      transactionHash,
    });
    return true;
  } catch (error) {
    console.error("Error waiting for transaction:", error);
    return false;
  }
}

/**
 * Get account balance
 */
export async function getAccountBalance(
  aptos: Aptos,
  accountAddress: string
): Promise<string> {
  try {
    const balance = await aptos.getAccountAPTAmount({
      accountAddress,
    });
    return balance.toString();
  } catch (error) {
    console.error("Error getting account balance:", error);
    return "0";
  }
}

