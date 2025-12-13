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

// ⚡ PERFORMANCE: Cache Aptos clients and accounts to avoid recreation
const aptosClientCache = new Map<string, Aptos>();
const accountCache = new Map<string, Account>();

function getAptosClient(network: Network): Aptos {
  const key = network.toString();
  if (!aptosClientCache.has(key)) {
    aptosClientCache.set(key, new Aptos(new AptosConfig({ network })));
  }
  return aptosClientCache.get(key)!;
}

function getAccount(privateKey: string): Account {
  if (!accountCache.has(privateKey)) {
    const privateKeyObj = new Ed25519PrivateKey(privateKey);
    accountCache.set(privateKey, Account.fromPrivateKey({ privateKey: privateKeyObj }));
  }
  return accountCache.get(privateKey)!;
}

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
    try {
      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();
      
      // Check if response is HTML (error page) instead of JSON
      if (contentType.includes('text/html') || text.trim().startsWith('<!')) {
        console.error('[x402-axios] ❌ Received HTML instead of JSON on initial request. URL:', url);
        console.error('[x402-axios] Response preview:', text.substring(0, 200));
        throw new Error(`API returned HTML error page instead of JSON. Status: ${response.status}. URL: ${url}. This usually means the URL is incorrect or the API route doesn't exist.`);
      }
      
      // Try to parse as JSON
      try {
        responseData = JSON.parse(text);
      } catch (parseError) {
        console.error('[x402-axios] ❌ Failed to parse JSON on initial request. URL:', url);
        console.error('[x402-axios] Response preview:', text.substring(0, 200));
        throw new Error(`Invalid JSON response from ${url}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    } catch (error) {
      // Re-throw with better context
      throw error;
    }
  } else if (responseType === 'text') {
    responseData = await response.text();
  } else if (responseType === 'blob') {
    responseData = await response.blob();
  } else if (responseType === 'arraybuffer') {
    responseData = await response.arrayBuffer();
  } else {
    responseData = await response.text();
  }

  // If not 402, return immediately (no payment required)
  if (response.status !== 402) {
    const transformedData = transformResponseData(responseData, finalConfig);
    
    return {
      data: transformedData as T,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(Array.from((response.headers as any).entries() || [])),
      config: finalConfig,
    };
  }

  // Step 2: Extract payment requirements from 402 response
  console.log('\n💳 [x402-axios] Received 402 Payment Required response');
  const paymentReqs = responseData.accepts?.[0] || responseData;
  const recipient = paymentReqs.payTo || paymentReqs.paymentAddress;
  const amount = paymentReqs.maxAmountRequired || paymentReqs.price;
  const networkId = paymentReqs.network;
  if (!networkId) {
    throw new Error('Network not specified in 402 payment requirements');
  }
  const scheme = paymentReqs.scheme || 'exact';

  console.log('[x402-axios] Payment requirements extracted:', {
    recipient,
    amount,
    network: networkId,
    scheme,
  });

  if (!recipient || !amount) {
    throw new Error('Invalid 402 response: missing payment requirements');
  }

  // Step 3: Determine network and get cached client
  console.log('[x402-axios] Step 3: Getting Aptos client...');
  const networkMap: Record<string, Network> = {
    'aptos-testnet': Network.TESTNET,
    'aptos-mainnet': Network.MAINNET,
  };
  const network = networkMap[networkId] || Network.TESTNET;
  const aptos = getAptosClient(network);
  console.log('[x402-axios] ✅ Aptos client ready (cached)');

  // Step 4: Get or create account (cached)
  console.log('[x402-axios] Step 4: Getting account...');
  let aptosAccount: Account;
  if (account) {
    aptosAccount = account;
    console.log('[x402-axios] Using provided account:', aptosAccount.accountAddress.toString());
  } else if (privateKey) {
    aptosAccount = getAccount(privateKey);
    console.log('[x402-axios] ✅ Account loaded from private key (cached):', aptosAccount.accountAddress.toString());
  } else {
    throw new Error('Either privateKey or account must be provided');
  }

  // Step 4.5: Check balance before building transaction (enhancement from composer)
  console.log('[x402-axios] Checking account balance...');
  try {
    const accountBalance = await aptos.getAccountAPTAmount({
      accountAddress: aptosAccount.accountAddress,
    });
    
    // getAccountAPTAmount returns Octas as a number (e.g., 10000000 for 0.1 APT)
    const balanceOctas = BigInt(Math.floor(accountBalance));
    
    const amountBigInt = BigInt(amount);
    const estimatedFee = BigInt(1000); // Conservative estimate: 0.00001 APT
    const totalRequired = amountBigInt + estimatedFee;
    
    console.log('[x402-axios] Balance check:', {
      accountAddress: aptosAccount.accountAddress.toString(),
      availableRaw: accountBalance,
      available: `${balanceOctas} Octas (${Number(balanceOctas) / 100_000_000} APT)`,
      required: `${totalRequired} Octas (${Number(totalRequired) / 100_000_000} APT)`,
      amount: `${amountBigInt} Octas (${Number(amountBigInt) / 100_000_000} APT)`,
      fee: `${estimatedFee} Octas (${Number(estimatedFee) / 100_000_000} APT)`,
    });
    
    if (balanceOctas < totalRequired) {
      const missingAmount = totalRequired - balanceOctas;
      const errorMsg = `INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE: Available ${Number(balanceOctas) / 100_000_000} APT, Required ${Number(totalRequired) / 100_000_000} APT (amount: ${Number(amountBigInt) / 100_000_000} APT + fee: ${Number(estimatedFee) / 100_000_000} APT), Missing ${Number(missingAmount) / 100_000_000} APT`;
      console.error(`[x402-axios] ❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    console.log('[x402-axios] ✅ Balance check passed');
  } catch (balanceError: any) {
    // If it's already our balance error, re-throw it
    if (balanceError.message?.includes('INSUFFICIENT_BALANCE')) {
      throw balanceError;
    }
    // Otherwise, log but continue (balance check is best-effort)
    console.warn('[x402-axios] ⚠️  Balance check failed, continuing:', balanceError.message);
  }

  // Step 5: Build transaction
  console.log('[x402-axios] Step 5: Building transaction...');
  let transaction;
  if (scheme === 'exact') {
    const amountNum = BigInt(amount);
    console.log('[x402-axios] Transaction details:', {
      sender: aptosAccount.accountAddress.toString(),
      recipient,
      amount: amountNum.toString(),
      function: '0x1::aptos_account::transfer',
    });
    transaction = await aptos.transaction.build.simple({
      sender: aptosAccount.accountAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [recipient, amountNum],
      },
    });
    console.log('[x402-axios] ✅ Transaction built successfully');
  } else {
    throw new Error(`Unsupported payment scheme: ${scheme}`);
  }

  // Step 6: Sign and serialize (optimized)
  console.log('[x402-axios] Step 6: Signing transaction...');
  const senderAuthenticator = aptos.transaction.sign({ signer: aptosAccount, transaction });
  console.log('[x402-axios] ✅ Transaction signed');
  
  console.log('[x402-axios] Step 7: Serializing to BCS format...');
  const transactionBytes = transaction.bcsToBytes();
  const signatureBytes = senderAuthenticator.bcsToBytes();
  console.log('[x402-axios] BCS serialization:', {
    transactionSize: transactionBytes.length,
    signatureSize: signatureBytes.length,
  });
  
  // Step 7: Create payment header (optimized - hex encoding instead of double base64)
  console.log('[x402-axios] Step 8: Creating payment header...');
  
  // ⚡ OPTIMIZATION: Use hex instead of base64 (smaller, faster)
  const transactionHex = Buffer.from(transactionBytes).toString('hex');
  const signatureHex = Buffer.from(signatureBytes).toString('hex');
  
  const paymentPayload = {
    x402Version: 1,
    scheme,
    network: networkId,
    payload: {
      transaction: transactionHex,
      signature: signatureHex,
    },
  };
  
  console.log('[x402-axios] Payment payload structure:', {
    x402Version: paymentPayload.x402Version,
    scheme: paymentPayload.scheme,
    network: paymentPayload.network,
    payload: {
      transaction: `hex(${transactionHex.substring(0, 20)}...)`,
      signature: `hex(${signatureHex.substring(0, 20)}...)`,
    },
    sizes: {
      transactionBytes: transactionBytes.length,
      signatureBytes: signatureBytes.length,
      transactionHex: transactionHex.length,
      signatureHex: signatureHex.length,
    }
  });
  
  // ⚡ Single JSON stringify (no double base64)
  const paymentHeader = JSON.stringify(paymentPayload);
  console.log('[x402-axios] ✅ Payment header created (JSON only):', paymentHeader.substring(0, 50) + '...');

  // Step 9: Retry request with X-PAYMENT header
  console.log('[x402-axios] Step 9: Retrying request with X-PAYMENT header...');
  const paidInit: RequestInit = {
    ...init,
    headers: {
      ...init.headers,
      'X-PAYMENT': paymentHeader,
    },
  };
  const requestHeaders = paidInit.headers as Record<string, string> | undefined;
  console.log('[x402-axios] Request headers:', {
    'Content-Type': requestHeaders?.['Content-Type'] || 'application/json',
    'X-PAYMENT': 'present (' + paymentHeader.length + ' chars)',
  });

  response = await fetch(url, paidInit);
  console.log('[x402-axios] Response status:', response.status);
  
  // Handle response based on responseType
  if (responseType === 'json') {
    try {
      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();
      
      // Check if response is HTML (error page) instead of JSON
      if (contentType.includes('text/html') || text.trim().startsWith('<!')) {
        console.error('[x402-axios] ❌ Received HTML instead of JSON. Response preview:', text.substring(0, 200));
        throw new Error(`API returned HTML error page instead of JSON. Status: ${response.status}. This usually means the URL is incorrect or the API route doesn't exist.`);
      }
      
      // Try to parse as JSON
      try {
        responseData = JSON.parse(text);
      } catch (parseError) {
        console.error('[x402-axios] ❌ Failed to parse JSON. Response preview:', text.substring(0, 200));
        throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}. Response preview: ${text.substring(0, 100)}`);
      }
    } catch (error) {
      // Re-throw with better context
      throw error;
    }
  } else if (responseType === 'text') {
    responseData = await response.text();
  } else if (responseType === 'blob') {
    responseData = await response.blob();
  } else if (responseType === 'arraybuffer') {
    responseData = await response.arrayBuffer();
  } else {
    responseData = await response.text();
  }

  // Step 8: Extract payment info from X-Payment-Response header
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
