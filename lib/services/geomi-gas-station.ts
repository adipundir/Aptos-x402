/**
 * Geomi Gas Station Service
 * 
 * Gas sponsorship via Geomi's hosted Gas Station API.
 * @see https://geomi.dev/docs/gas-stations
 */

import {
  Aptos,
  AptosConfig,
  Network,
  AccountAuthenticator,
  SimpleTransaction,
} from "@aptos-labs/ts-sdk";
import { GasStationClient, GasStationTransactionSubmitter } from "@aptos-labs/gas-station-client";

// ============================================
// TYPES
// ============================================

export interface GasStationConfig {
  apiKey?: string;
  network?: Network;
}

export interface SponsorResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// ============================================
// GAS STATION CLASS
// ============================================

export class GeomiGasStation {
  private apiKey: string | null = null;
  private network: Network;
  private gasStationClient: GasStationClient | null = null;
  private transactionSubmitter: GasStationTransactionSubmitter | null = null;
  private sponsoredAptos: Aptos | null = null;
  
  constructor(config: GasStationConfig = {}) {
    this.apiKey = config.apiKey || process.env.GEOMI_API_KEY || null;
    this.network = config.network || this.getNetworkFromEnv();
    
    if (this.apiKey) {
      try {
        // Initialize per Geomi docs: https://geomi.dev/docs/gas-stations
        this.gasStationClient = new GasStationClient({
          network: this.network,
          apiKey: this.apiKey,
        });
        
        this.transactionSubmitter = new GasStationTransactionSubmitter(this.gasStationClient);
        
        const aptosConfig = new AptosConfig({
          network: this.network,
          pluginSettings: {
            TRANSACTION_SUBMITTER: this.transactionSubmitter,
          },
        });
        this.sponsoredAptos = new Aptos(aptosConfig);
        
        console.log('[GasStation] ✅ Initialized | Network:', this.network);
      } catch (error: any) {
        console.warn('[GasStation] Init failed:', error.message);
      }
    } else {
      console.warn('[GasStation] No GEOMI_API_KEY. Get one from https://geomi.dev');
    }
  }
  
  private getNetworkFromEnv(): Network {
    const env = process.env.APTOS_NETWORK || 'aptos:2';
    return env.includes(':1') ? Network.MAINNET : Network.TESTNET;
  }
  
  isConfigured(): boolean {
    return this.sponsoredAptos !== null;
  }
  
  getSponsoredAptos(): Aptos | null {
    return this.sponsoredAptos;
  }
  
  async sponsorAndSubmitTransaction(
    transaction: SimpleTransaction,
    senderAuthenticator: AccountAuthenticator,
  ): Promise<SponsorResult> {
    if (!this.sponsoredAptos) {
      return { success: false, error: 'Geomi not configured. Set GEOMI_API_KEY.' };
    }
    
    try {
      const committed = await this.sponsoredAptos.transaction.submit.simple({
        transaction,
        senderAuthenticator,
      });
      
      console.log('[GasStation] ✅ Submitted:', committed.hash);
      return { success: true, txHash: committed.hash };
    } catch (error: any) {
      console.error('[GasStation] ❌ Failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// ============================================
// SINGLETON
// ============================================

let instance: GeomiGasStation | null = null;

export function getGasStation(): GeomiGasStation {
  if (!instance) instance = new GeomiGasStation();
  return instance;
}

export function initGasStation(config: GasStationConfig): GeomiGasStation {
  instance = new GeomiGasStation(config);
  return instance;
}

// ============================================
// HELPERS
// ============================================

export function getFeePayerPlaceholder(): string {
  return "0x0000000000000000000000000000000000000000000000000000000000000000";
}

export function isPlaceholderFeePayer(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^0x/, '');
  return normalized === '0'.repeat(64) || normalized === '0';
}
