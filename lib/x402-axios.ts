/**
 * x402-axios for Aptos
 * 
 * Axios-compatible wrapper with x402 payment support
 * 
 * Usage:
 * ```typescript
 * import { x402axios } from 'aptos-x402';
 * 
 * // Works exactly like axios
 * const response = await x402axios.get('https://api.example.com/data');
 * 
 * // With x402 payment support
 * const response = await x402axios.get('https://api.example.com/protected/data', {
 *   privateKey: '0x...'
 * });
 * 
 * console.log(response.data);
 * ```
 */

import {
  Account,
  Aptos,
  AptosConfig,
  Network,
  Ed25519PrivateKey,
} from "@aptos-labs/ts-sdk";

// Axos-compatible request configuration
export interface AxiosRequestConfig {
  /** URL to request */
  url?: string;
  /** HTTP method (default: GET) */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  /** Base URL for requests */
  baseURL?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (for POST/PUT/PATCH) */
  data?: any;
  /** URL parameters */
  params?: Record<string, any>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to follow redirects */
  maxRedirects?: number;
  /** Response type */
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer' | 'document' | 'stream';
  /** Whether to validate status */
  validateStatus?: (status: number) => boolean;
  /** Whether to send cookies */
  withCredentials?: boolean;
  /** Auth credentials */
  auth?: {
    username: string;
    password: string;
  };
  /** Proxy configuration */
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
  /** Cancel token */
  cancelToken?: any;
  /** Transform request data */
  transformRequest?: ((data: any, headers?: any) => any)[];
  /** Transform response data */
  transformResponse?: ((data: any) => any)[];
  /** x402 Payment options */
  privateKey?: string;
  account?: Account;
}

// Extended options for x402 payment interceptor
export interface WithPaymentInterceptorOptions extends AxiosRequestConfig {
  /** URL to request (required) */
  url: string;
}

// Axios-compatible response interface
export interface AxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
  request?: any;
  paymentInfo?: {
    transactionHash: string;
    amount: string;
    recipient: string;
    settled: boolean;
  };
}

// Alias for backward compatibility
export type X402Response<T = any> = AxiosResponse<T>;

export interface X402PaymentResponse {
  settlement?: {
    txHash: string;
    networkId: string;
    success: boolean;
  };
}

/**
 * Decode X-Payment-Response header
 */
export function decodeXPaymentResponse(header: string | null): X402PaymentResponse | null {
  if (!header) return null;
  
  try {
    return JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
  } catch (error) {
    return null;
  }
}

/**
 * Build URL with baseURL and params
 */
function buildURL(config: AxiosRequestConfig): string {
  let url = config.url || '';
  
  if (config.baseURL) {
    url = config.baseURL.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
  }
  
  if (config.params) {
    const searchParams = new URLSearchParams();
    Object.entries(config.params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  
  return url;
}

/**
 * Transform request data based on config
 */
function transformRequestData(data: any, config: AxiosRequestConfig): any {
  if (!data) return data;
  
  if (config.transformRequest && config.transformRequest.length > 0) {
    return config.transformRequest.reduce((acc, transformer) => {
      return transformer(acc, config.headers);
    }, data);
  }
  
  // Default transformation
  if (typeof data === 'object' && !(data instanceof FormData) && !(data instanceof Blob)) {
    return JSON.stringify(data);
  }
  
  return data;
}

/**
 * Transform response data based on config
 */
function transformResponseData(data: any, config: AxiosRequestConfig): any {
  if (config.transformResponse && config.transformResponse.length > 0) {
    return config.transformResponse.reduce((acc, transformer) => {
      return transformer(acc);
    }, data);
  }
  
  return data;
}

/**
 * Main x402-axios function - works exactly like axios
 */
async function x402axiosMain<T = any>(
  configOrUrl: string | AxiosRequestConfig,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  // Handle both axios-style calls: axios(url) and axios(url, config)
  const finalConfig: AxiosRequestConfig = typeof configOrUrl === 'string' 
    ? { ...config, url: configOrUrl }
    : configOrUrl;

  const { 
    privateKey, 
    account, 
    method = 'GET', 
    data, 
    headers = {}, 
    timeout,
    validateStatus = (status: number) => status >= 200 && status < 300,
    responseType = 'json',
    ...otherConfig 
  } = finalConfig;

  const url = buildURL(finalConfig);
  
  console.log('[x402-axios] Making request to:', url);

  // Step 1: Make initial request (no payment)
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...otherConfig,
  };

  // Add body for methods that support it
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    init.body = transformRequestData(data, finalConfig);
  }

  // Add timeout if specified
  if (timeout) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    init.signal = controller.signal;
  }

  let response = await fetch(url, init);
  
  // Handle response based on responseType
  let responseData: any;
  if (responseType === 'json') {
    responseData = await response.json();
  } else if (responseType === 'text') {
    responseData = await response.text();
  } else if (responseType === 'blob') {
    responseData = await response.blob();
  } else if (responseType === 'arraybuffer') {
    responseData = await response.arrayBuffer();
  } else {
    responseData = await response.text();
  }

  console.log(`[x402-axios] Initial response: ${response.status}`);

  // If not 402, return immediately (no payment required)
  if (response.status !== 402) {
    console.log('[x402-axios] No payment required');
    
    const transformedData = transformResponseData(responseData, finalConfig);
    
    return {
      data: transformedData as T,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(Array.from((response.headers as any).entries() || [])),
      config: finalConfig,
    };
  }

  console.log('[x402-axios] Received 402 Payment Required');

  // Step 2: Extract payment requirements from 402 response
  const paymentReqs = responseData.accepts?.[0] || responseData;
  const recipient = paymentReqs.payTo || paymentReqs.paymentAddress;
  const amount = paymentReqs.maxAmountRequired || paymentReqs.price;
  const networkId = paymentReqs.network;
  if (!networkId) {
    throw new Error('Network not specified in 402 payment requirements');
  }
  const scheme = paymentReqs.scheme || 'exact';

  if (!recipient || !amount) {
    throw new Error('Invalid 402 response: missing payment requirements');
  }

  console.log('[x402-axios] Payment requirements:', {
    scheme,
    network: networkId,
    amount: `${amount} Octas`,
    recipient: recipient.slice(0, 10) + '...',
  });

  // Step 3: Determine network from 402 response
  const networkMap: Record<string, Network> = {
    'aptos-testnet': Network.TESTNET,
    'aptos-mainnet': Network.MAINNET,
  };
  const network = networkMap[networkId] || Network.TESTNET;

  console.log('[x402-axios] Network mapping:', {
    networkId,
    mappedNetwork: network,
    networkMap
  });

  // Step 4: Initialize Aptos client based on discovered network
  const aptosConfig = new AptosConfig({ network });
  const aptos = new Aptos(aptosConfig);
  
  console.log('[x402-axios] Aptos client initialized with network:', network);

  // Create account from private key or use provided account
  let aptosAccount: Account;
  if (account) {
    aptosAccount = account;
  } else if (privateKey) {
    const privateKeyObj = new Ed25519PrivateKey(privateKey);
    aptosAccount = Account.fromPrivateKey({ privateKey: privateKeyObj });
  } else {
    throw new Error('Either privateKey or account must be provided');
  }

  // Step 4.5: Check balance before building transaction
  console.log(`[x402-axios] Checking account balance...`);
  try {
    const accountBalance = await aptos.getAccountAPTAmount({
      accountAddress: aptosAccount.accountAddress,
    });
    
    const amountBigInt = BigInt(amount);
    const estimatedFee = BigInt(1000); // Conservative estimate: 0.00001 APT
    const totalRequired = amountBigInt + estimatedFee;
    
    console.log(`[x402-axios] Balance check:`, {
      available: `${accountBalance} Octas (${accountBalance / 100_000_000} APT)`,
      required: `${totalRequired} Octas (${Number(totalRequired) / 100_000_000} APT)`,
      amount: `${amountBigInt} Octas (${Number(amountBigInt) / 100_000_000} APT)`,
      fee: `${estimatedFee} Octas (${Number(estimatedFee) / 100_000_000} APT)`,
    });
    
    if (BigInt(accountBalance) < totalRequired) {
      const missingAmount = totalRequired - BigInt(accountBalance);
      const errorMsg = `INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE: Available ${accountBalance / 100_000_000} APT, Required ${Number(totalRequired) / 100_000_000} APT (amount: ${Number(amountBigInt) / 100_000_000} APT + fee: ${Number(estimatedFee) / 100_000_000} APT), Missing ${Number(missingAmount) / 100_000_000} APT`;
      console.error(`[x402-axios] ❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    console.log(`[x402-axios] ✅ Balance check passed`);
  } catch (balanceError: any) {
    // If it's already our balance error, re-throw it
    if (balanceError.message?.includes('INSUFFICIENT_BALANCE')) {
      throw balanceError;
    }
    // Otherwise, log but continue (balance check is best-effort)
    console.warn(`[x402-axios] ⚠️  Balance check failed, continuing:`, balanceError.message);
  }

  console.log(`[x402-axios] Building transaction for ${amount} Octas to ${recipient.slice(0, 10)}...`);

  // Step 5: Build transaction based on scheme
  let transaction;
  if (scheme === 'exact') {
    transaction = await aptos.transaction.build.simple({
      sender: aptosAccount.accountAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [recipient, amount],
      },
    });
  } else {
    throw new Error(`Unsupported payment scheme: ${scheme}`);
  }

  console.log('[x402-axios] Signing transaction...');

  // Step 6: Sign transaction
  const senderAuthenticator = aptos.transaction.sign({ 
    signer: aptosAccount, 
    transaction 
  });

  // Step 7: Serialize transaction and signature separately
  const transactionBytes = transaction.bcsToBytes();
  const signatureBytes = senderAuthenticator.bcsToBytes();
  
  const transactionBase64 = Buffer.from(transactionBytes).toString('base64');
  const signatureBase64 = Buffer.from(signatureBytes).toString('base64');

  // Step 8: Create x402 PaymentPayload
  const paymentPayload = {
    x402Version: 1,
    scheme,
    network: networkId,
    payload: {
      transaction: transactionBase64,
      signature: signatureBase64,
    },
  };

  // Step 9: Encode as base64 for X-PAYMENT header
  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  
  console.log(`[x402-axios] Retrying with payment (header: ${paymentHeader.length} chars)...`);

  // Step 10: Retry request with X-PAYMENT header
  const paidInit: RequestInit = {
    ...init,
    headers: {
      ...init.headers,
      'X-PAYMENT': paymentHeader,
    },
  };

  response = await fetch(url, paidInit);
  
  // Handle response based on responseType
  if (responseType === 'json') {
    responseData = await response.json();
  } else if (responseType === 'text') {
    responseData = await response.text();
  } else if (responseType === 'blob') {
    responseData = await response.blob();
  } else if (responseType === 'arraybuffer') {
    responseData = await response.arrayBuffer();
  } else {
    responseData = await response.text();
  }

  console.log(`[x402-axios] Payment response: ${response.status}`);

  // Step 11: Extract payment info from X-Payment-Response header
  let paymentInfo;
  const paymentResponseHeader = response.headers.get('x-payment-response');
  
  if (paymentResponseHeader) {
    const decoded = decodeXPaymentResponse(paymentResponseHeader);
    if (decoded?.settlement?.txHash) {
      paymentInfo = {
        transactionHash: decoded.settlement.txHash,
        amount: amount,
        recipient: recipient,
        settled: decoded.settlement.success === true,
      };
      
      console.log(`[x402-axios] Payment settled: ${paymentInfo.transactionHash}`);
    }
  }

  const transformedData = transformResponseData(responseData, finalConfig);

  return {
    data: transformedData as T,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(Array.from((response.headers as any).entries() || [])),
    config: finalConfig,
    paymentInfo,
  };
}

// Axios-like convenience methods
export const x402axios = Object.assign(
  async function<T = any>(configOrUrl: string | AxiosRequestConfig, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return x402axiosMain<T>(configOrUrl, config);
  },
  {
    get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
      x402axiosMain<T>({ ...config, url, method: 'GET' }),
    
    post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
      x402axiosMain<T>({ ...config, url, method: 'POST', data }),
    
    put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
      x402axiosMain<T>({ ...config, url, method: 'PUT', data }),
    
    patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
      x402axiosMain<T>({ ...config, url, method: 'PATCH', data }),
    
    delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
      x402axiosMain<T>({ ...config, url, method: 'DELETE' }),
    
    head: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
      x402axiosMain<T>({ ...config, url, method: 'HEAD' }),
    
    options: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
      x402axiosMain<T>({ ...config, url, method: 'OPTIONS' }),
    
    // Create instance with default config
    create: (defaultConfig?: AxiosRequestConfig) => {
      const instance = Object.assign(
        async function<T = any>(configOrUrl: string | AxiosRequestConfig, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
          const mergedConfig = { ...defaultConfig, ...(typeof configOrUrl === 'string' ? { ...config, url: configOrUrl } : configOrUrl) };
          return x402axiosMain<T>(mergedConfig);
        },
        {
          get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
            x402axiosMain<T>({ ...defaultConfig, ...config, url, method: 'GET' }),
          
          post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
            x402axiosMain<T>({ ...defaultConfig, ...config, url, method: 'POST', data }),
          
          put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
            x402axiosMain<T>({ ...defaultConfig, ...config, url, method: 'PUT', data }),
          
          patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
            x402axiosMain<T>({ ...defaultConfig, ...config, url, method: 'PATCH', data }),
          
          delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
            x402axiosMain<T>({ ...defaultConfig, ...config, url, method: 'DELETE' }),
          
          head: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
            x402axiosMain<T>({ ...defaultConfig, ...config, url, method: 'HEAD' }),
          
          options: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => 
            x402axiosMain<T>({ ...defaultConfig, ...config, url, method: 'OPTIONS' }),
        }
      );
      return instance;
    },
  }
);
