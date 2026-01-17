/**
 * aptos-x402 - x402 Payment Protocol SDK for Aptos
 * 
 * Implementation of HTTP 402 Payment Required for Aptos blockchain.
 * Based on Coinbase x402 protocol: https://github.com/coinbase/x402
 * 
 * @packageDocumentation
 * 
 * @example Buyer - Access paid APIs
 * ```typescript
 * import { x402axios } from 'aptos-x402';
 * 
 * const response = await x402axios.get('https://api.example.com/premium', {
 *   privateKey: process.env.PRIVATE_KEY!
 * });
 * console.log(response.data);
 * console.log(response.paymentInfo?.transactionHash);
 * ```
 * 
 * @example Seller - Create paid APIs
 * ```typescript
 * import { paymentMiddleware } from 'aptos-x402';
 * 
 * export const proxy = paymentMiddleware(
 *   process.env.RECIPIENT_ADDRESS!,
 *   { '/api/premium/*': { price: '1000', network: 'aptos:2', asset: USDC_ADDRESS } },
 *   { url: process.env.FACILITATOR_URL! }
 * );
 * ```
 */

// ============================================
// FOR BUYERS 🛒
// ============================================

export { x402axios, decodePaymentResponse } from "./x402-axios";
export type { X402RequestConfig, X402Response, X402PaymentResponse } from "./x402-axios";

// ============================================
// FOR SELLERS 🏪
// ============================================

export { paymentMiddleware } from "./x402-middleware";
export type { RouteConfig, FacilitatorConfig, ResolvedRouteConfig } from "./x402-types";
export { resolveRouteConfig } from "./x402-types";

// ============================================
// PROTOCOL TYPES 📋
// ============================================

export {
  X402_VERSION,
  APTOS_SCHEME,
  APTOS_MAINNET,
  APTOS_TESTNET,
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_HEADER,
  PAYMENT_RESPONSE_HEADER,
  KNOWN_ASSETS,
  validateCAIP2Network,
  parseCAIP2Network,
  getAptosChainId,
} from "./x402-protocol-types";

export type {
  PaymentRequirements,
  PaymentRequiredResponse,
  PaymentPayload,
  ResourceInfo,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  PaymentResponseHeader,
} from "./x402-protocol-types";

// ============================================
// GAS SPONSORSHIP (Geomi) ⛽
// ============================================

export {
  GeomiGasStation,
  getGasStation,
  initGasStation,
  getFeePayerPlaceholder,
  isPlaceholderFeePayer,
} from "./services/geomi-gas-station";

export type { GasStationConfig, SponsorResult } from "./services/geomi-gas-station";

// ============================================
// APTOS UTILITIES 🔧
// ============================================

export {
  getAptosClient,
  getAccountFromPrivateKey,
  buildFeePayerFATransfer,
  signAsSender,
  submitTransaction,
  getFungibleAssetBalance,
  accountExists,
  getChainId,
  getNetworkFromChainId,
} from "./aptos-utils";

export type { FeePayerTransactionResult } from "./aptos-utils";

// ============================================
// ARC-8004: AGENT TRUST LAYER 🛡️
// ============================================

export {
  ARC8004_VERSION,
  ARC8004_PROTOCOL,
  IdentityRegistry,
  createAgentCard,
  validateAgentCard,
  ReputationRegistry,
  calculateTrustLevel,
  getTrustLevelLabel,
  ValidationRegistry,
  TrustLevel,
} from "./arc8004";

export type {
  AgentCard,
  AgentIdentity,
  RegisterIdentityRequest,
  RegisterIdentityResponse,
  FeedbackSubmission,
  FeedbackRecord,
  AgentReputationScore,
  TaskValidationRequest,
  TaskValidation,
  ValidationResult,
  ValidationType,
  ValidationStatus,
  ARC8004Config,
} from "./arc8004";
