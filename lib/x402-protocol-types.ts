/**
 * Official x402 Protocol Type Definitions - Version 2
 * Based on: https://github.com/coinbase/x402
 * 
 * x402 v2 uses CAIP-2 network identifiers and supports sponsored (gasless) transactions.
 */

// ============================================
// CONSTANTS
// ============================================

/** x402 Protocol Version */
export const X402_VERSION = 2;

/** Aptos payment scheme */
export const APTOS_SCHEME = "exact";

/** 
 * Aptos network identifiers (CAIP-2 format)
 */
export const APTOS_MAINNET = "aptos:1";
export const APTOS_TESTNET = "aptos:2";

/** HTTP Header names for x402 v2 */
export const PAYMENT_REQUIRED_HEADER = "PAYMENT-REQUIRED";  // 402 response requirements
export const PAYMENT_HEADER = "PAYMENT-SIGNATURE";           // Client payment proof
export const PAYMENT_RESPONSE_HEADER = "PAYMENT-RESPONSE";   // Server payment confirmation

// ============================================
// PAYMENT REQUIREMENTS (402 Response)
// ============================================

/**
 * Payment Requirements - Specifies what payment is needed
 * 
 * This is returned in the 402 response body to tell the client
 * what payment is required to access the resource.
 */
export interface PaymentRequirements {
  /** Scheme of the payment protocol (always "exact" for Aptos) */
  scheme: string;

  /** Network identifier in CAIP-2 format (e.g., "aptos:1", "aptos:2") */
  network: string;

  /** Exact amount to transfer in atomic units (e.g., "1000000" = 1 USDC) */
  amount: string;

  /** 
   * Metadata address of the fungible asset to transfer (required)
   * For USDC on mainnet: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b"
   * Note: Only fungible assets are supported. APT transfers are not supported since transactions are sponsored.
   */
  asset: string;

  /** Address to pay value to (32-byte hex with 0x prefix) */
  payTo: string;

  /** Maximum time in seconds before the payment expires */
  maxTimeoutSeconds: number;

  /** Extra scheme-specific information */
  extra?: {
    /** Whether the facilitator will sponsor gas fees (gasless transactions) */
    sponsored?: boolean;
  } | null;
}

/**
 * Resource information included in PaymentPayload
 */
export interface ResourceInfo {
  /** URL of the resource being paid for */
  url: string;

  /** Human-readable description of the resource */
  description?: string;

  /** MIME type of the resource response */
  mimeType?: string;
}

/**
 * Payment Required Response (402 response body)
 */
export interface PaymentRequiredResponse {
  /** Version of the x402 payment protocol (should be 2) */
  x402Version: number;

  /** List of payment options the resource server accepts */
  accepts: PaymentRequirements[];

  /** Error message (optional) */
  error?: string;
}

// ============================================
// PAYMENT PAYLOAD (Request Header)
// ============================================

/**
 * Payment Payload - Sent in PAYMENT-SIGNATURE header
 * 
 * This is what the client sends to prove they're making a payment.
 * For sponsored transactions, the transaction contains a fee payer
 * placeholder (0x0) that the facilitator will fill in.
 */
export interface PaymentPayload {
  /** Version of the x402 payment protocol (should be 2) */
  x402Version: number;

  /** Resource being paid for */
  resource: ResourceInfo;

  /** The payment requirements being fulfilled */
  accepted: PaymentRequirements;

  /** Scheme-dependent payload */
  payload: {
    /** 
     * Base64 encoded BCS-serialized signed Aptos transaction
     * For sponsored transactions, fee payer address is set to 0x0
     */
    transaction: string;
  };
}

// ============================================
// FACILITATOR API TYPES
// ============================================

/**
 * Facilitator /verify endpoint request
 */
export interface VerifyRequest {
  /** Version of the x402 payment protocol */
  x402Version: number;

  /** The PAYMENT-SIGNATURE header value (JSON string of PaymentPayload) */
  paymentHeader: string;

  /** The payment requirements being verified against */
  paymentRequirements: PaymentRequirements;
}

/**
 * Facilitator /verify endpoint response
 */
export interface VerifyResponse {
  /** Whether the payment is valid */
  isValid: boolean;

  /** Reason for invalidity (if isValid is false) */
  invalidReason: string | null;
}

/**
 * Facilitator /settle endpoint request
 */
export interface SettleRequest {
  /** Version of the x402 payment protocol */
  x402Version: number;

  /** The PAYMENT-SIGNATURE header value (JSON string of PaymentPayload) */
  paymentHeader: string;

  /** The payment requirements being settled */
  paymentRequirements: PaymentRequirements;
}

/**
 * Facilitator /settle endpoint response (v2)
 * 
 * This is also used as the PAYMENT-RESPONSE header content.
 */
export interface SettleResponse {
  /** Whether the payment settlement was successful */
  success: boolean;

  /** Transaction hash (64 hex chars with 0x prefix) */
  transaction: string | null;

  /** Network identifier in CAIP-2 format */
  network: string | null;

  /** Address of the payer's wallet */
  payer: string | null;

  /** Error message (if success is false) */
  error?: string | null;
}

/**
 * PAYMENT-RESPONSE header content (base64 encoded JSON)
 */
export interface PaymentResponseHeader {
  /** Settlement response from facilitator */
  success: boolean;
  transaction: string | null;
  network: string | null;
  payer: string | null;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Validate that a network identifier is in CAIP-2 format
 * @throws Error if network is not in valid CAIP-2 format
 */
export function validateCAIP2Network(network: string): void {
  if (!network.match(/^aptos:\d+$/)) {
    throw new Error(`Invalid network format: "${network}". Expected CAIP-2 format (e.g., "aptos:1" or "aptos:2")`);
  }
}

/**
 * Helper to parse CAIP-2 network identifier
 */
export function parseCAIP2Network(network: string): { namespace: string; chainId: string } | null {
  const match = network.match(/^(\w+):(\w+)$/);
  if (!match) return null;
  return { namespace: match[1], chainId: match[2] };
}

/**
 * Helper to get Aptos chain ID from CAIP-2 network
 */
export function getAptosChainId(network: string): number | null {
  const parsed = parseCAIP2Network(network);
  if (!parsed || parsed.namespace !== 'aptos') return null;

  const chainId = parseInt(parsed.chainId, 10);
  return isNaN(chainId) ? null : chainId;
}

/**
 * Known fungible asset addresses on Aptos (Circle USDC)
 * @see https://developers.circle.com/stablecoins/usdc-on-aptos
 */
export const KNOWN_ASSETS = {
  /** USDC on Aptos Mainnet (Circle) */
  USDC_MAINNET: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b",

  /** USDC on Aptos Testnet (Circle) */
  USDC_TESTNET: "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832",
} as const;
