/**
 * Type definitions for x402 payment middleware - Version 2
 * These will be exported when published as npm package
 * 
 * v2 Changes:
 * - Added asset field for fungible asset support
 * - Added sponsored field for gas sponsorship
 * - Network uses CAIP-2 format (aptos:1, aptos:2)
 */

/**
 * Configuration for a protected route
 */
export type RouteConfig = {
  /** 
   * Price in atomic units (e.g., "1000000" = 1 USDC or 0.01 APT)
   */
  price: string;
  
  /** 
   * Network identifier. Supports:
   * - CAIP-2 format: "aptos:1" (mainnet), "aptos:2" (testnet)
   * - Legacy format: "mainnet", "testnet" (will be converted to CAIP-2)
   * @default "aptos:2" (testnet)
   */
  network?: string;
  
  /**
   * Fungible asset metadata address to accept for payment (required).
   * - For USDC on mainnet: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b"
   * - For USDC on testnet: Use the testnet metadata address
   * Note: APT transfers are not supported. Only fungible assets are supported since transactions are sponsored.
   */
  asset: string;
  
  /**
   * Whether the facilitator should sponsor gas fees.
   * When true, the client doesn't need APT for gas.
   * @default true
   */
  sponsored?: boolean;
  
  /** Optional configuration for resource metadata */
  config?: {
    /** Human-readable description of the resource */
    description?: string;
    
    /** MIME type of the resource response */
    mimeType?: string;
    
    /** JSON schema of the response (for documentation) */
    outputSchema?: Record<string, any>;
    
    /** Maximum time in seconds for payment validity */
    maxTimeoutSeconds?: number;
  };
};

/**
 * Configuration for the facilitator service
 */
export type FacilitatorConfig = {
  /** 
   * URL of the facilitator service (required)
   * e.g., "https://api.example.com/facilitator"
   */
  url: string;
  
  /**
   * Optional API key for authenticating with the facilitator
   */
  apiKey?: string;
};

/**
 * Extended route configuration with all optional fields filled
 */
export type ResolvedRouteConfig = {
  price: string;
  network: string;
  asset: string;
  sponsored: boolean;
  config: {
    description: string;
    mimeType: string;
    outputSchema: Record<string, any> | null;
    maxTimeoutSeconds: number;
  };
};
/**
 * Resolve a RouteConfig to a ResolvedRouteConfig with defaults
 */
export function resolveRouteConfig(config: RouteConfig): ResolvedRouteConfig {
  if (!config.asset) {
    throw new Error('Asset is required in RouteConfig. Only fungible assets (USDC, etc.) are supported.');
  }
  
  return {
    price: config.price,
    network: config.network || 'aptos:2',
    asset: config.asset,
    sponsored: config.sponsored ?? true,
    config: {
      description: config.config?.description || 'Protected resource',
      mimeType: config.config?.mimeType || 'application/json',
      outputSchema: config.config?.outputSchema || null,
      maxTimeoutSeconds: config.config?.maxTimeoutSeconds || 60,
    },
  };
}
