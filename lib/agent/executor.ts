/**
 * Agent Executor
 * Agent logic to parse queries and call APIs using Gemini AI for interpretation
 */

import { x402axios } from '../x402-axios';
import { getAllApis, getApiById, ApiMetadata } from '../storage/apis';
import { Agent } from '../storage/agents';
import { processQueryWithLLM, LLMResponse } from './llm-chat';
import { extractDataWithLLM, formatDataSmart } from './data-extractor';

/**
 * Extract query parameters from user query based on API type
 */
function extractQueryParamsFromUserQuery(userQuery: string, api: ApiMetadata): Record<string, string | null> {
  const lowerQuery = userQuery.toLowerCase();
  const lowerApiName = api.name.toLowerCase();
  const lowerApiId = api.id.toLowerCase();
  
  // GitHub API: Extract owner/repo from queries like "get info about facebook/react" or "show me aptos-core"
  if (lowerApiId.includes('github') || lowerApiName.includes('github')) {
    // Try to extract owner/repo from patterns like:
    // - "facebook/react"
    // - "owner: facebook repo: react"
    // - "get info about aptos-core" (assumes aptos-labs)
    // - "show me the react repo"
    
    // Pattern 1: owner/repo format (e.g., "facebook/react")
    const ownerRepoMatch = userQuery.match(/(?:^|\s)([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\s|$)/);
    if (ownerRepoMatch) {
      return {
        owner: ownerRepoMatch[1],
        repo: ownerRepoMatch[2],
      };
    }
    
    // Pattern 2: Just repo name (e.g., "get info about react")
    // Try to find repo name after common phrases
    const repoPatterns = [
      /(?:repo|repository|project)\s+(?:called\s+)?([a-zA-Z0-9_.-]+)/i,
      /(?:show|get|fetch|info|about|for)\s+(?:the\s+)?([a-zA-Z0-9_.-]+)\s+(?:repo|repository|project)/i,
      /([a-zA-Z0-9_.-]+)\s+(?:repo|repository|project)/i,
    ];
    
    for (const pattern of repoPatterns) {
      const match = userQuery.match(pattern);
      if (match && match[1]) {
        const repoName = match[1];
        // If it looks like a valid repo name (not a common word)
        if (repoName.length > 2 && /^[a-zA-Z0-9_.-]+$/.test(repoName)) {
          return {
            owner: null, // Will use default
            repo: repoName,
          };
        }
      }
    }
    
    // Pattern 3: Owner and repo separately
    const ownerMatch = userQuery.match(/(?:owner|org|organization|user):\s*([a-zA-Z0-9_.-]+)/i);
    const repoMatch = userQuery.match(/(?:repo|repository|project):\s*([a-zA-Z0-9_.-]+)/i);
    if (ownerMatch || repoMatch) {
      return {
        owner: ownerMatch ? ownerMatch[1] : null,
        repo: repoMatch ? repoMatch[1] : null,
      };
    }
  }
  
  // Hacker News API: Extract search query
  if (lowerApiId.includes('hacker') || lowerApiName.includes('hacker')) {
    // Extract search terms after common phrases
    const searchPatterns = [
      /(?:search|find|look|query|for)\s+(?:for\s+)?["']?([^"']+)["']?/i,
      /(?:about|regarding|on)\s+["']?([^"']+)["']?/i,
    ];
    
    for (const pattern of searchPatterns) {
      const match = userQuery.match(pattern);
      if (match && match[1]) {
        const query = match[1].trim();
        if (query.length > 0) {
          return { q: query };
        }
      }
    }
    
    // If no pattern found, try to extract meaningful words (skip common words)
    const words = userQuery.split(/\s+/).filter(w => 
      w.length > 3 && 
      !['show', 'get', 'find', 'search', 'info', 'about', 'the', 'for', 'me'].includes(w.toLowerCase())
    );
    if (words.length > 0) {
      return { q: words.slice(0, 5).join(' ') };
    }
  }
  
  // Open-Meteo Weather API: Extract location/coordinates
  if (lowerApiId.includes('meteo') || lowerApiId.includes('weather')) {
    // Map common location names to coordinates
    const locationToCoords: Record<string, { lat: string; lon: string; tz?: string }> = {
      'india': { lat: '28.6139', lon: '77.2090', tz: 'Asia/Kolkata' }, // New Delhi
      'indian': { lat: '28.6139', lon: '77.2090', tz: 'Asia/Kolkata' },
      'delhi': { lat: '28.6139', lon: '77.2090', tz: 'Asia/Kolkata' },
      'mumbai': { lat: '19.0760', lon: '72.8777', tz: 'Asia/Kolkata' },
      'bangalore': { lat: '12.9716', lon: '77.5946', tz: 'Asia/Kolkata' },
      'kolkata': { lat: '22.5726', lon: '88.3639', tz: 'Asia/Kolkata' },
      'chennai': { lat: '13.0827', lon: '80.2707', tz: 'Asia/Kolkata' },
      'usa': { lat: '40.7128', lon: '-74.0060', tz: 'America/New_York' }, // New York
      'us': { lat: '40.7128', lon: '-74.0060', tz: 'America/New_York' },
      'united states': { lat: '40.7128', lon: '-74.0060', tz: 'America/New_York' },
      'new york': { lat: '40.7128', lon: '-74.0060', tz: 'America/New_York' },
      'ny': { lat: '40.7128', lon: '-74.0060', tz: 'America/New_York' },
      'california': { lat: '37.7749', lon: '-122.4194', tz: 'America/Los_Angeles' },
      'san francisco': { lat: '37.7749', lon: '-122.4194', tz: 'America/Los_Angeles' },
      'sf': { lat: '37.7749', lon: '-122.4194', tz: 'America/Los_Angeles' },
      'los angeles': { lat: '34.0522', lon: '-118.2437', tz: 'America/Los_Angeles' },
      'la': { lat: '34.0522', lon: '-118.2437', tz: 'America/Los_Angeles' },
      'london': { lat: '51.5074', lon: '-0.1278', tz: 'Europe/London' },
      'uk': { lat: '51.5074', lon: '-0.1278', tz: 'Europe/London' },
      'united kingdom': { lat: '51.5074', lon: '-0.1278', tz: 'Europe/London' },
      'tokyo': { lat: '35.6762', lon: '139.6503', tz: 'Asia/Tokyo' },
      'japan': { lat: '35.6762', lon: '139.6503', tz: 'Asia/Tokyo' },
      'beijing': { lat: '39.9042', lon: '116.4074', tz: 'Asia/Shanghai' },
      'china': { lat: '39.9042', lon: '116.4074', tz: 'Asia/Shanghai' },
      'singapore': { lat: '1.3521', lon: '103.8198', tz: 'Asia/Singapore' },
      'sydney': { lat: '-33.8688', lon: '151.2093', tz: 'Australia/Sydney' },
      'australia': { lat: '-33.8688', lon: '151.2093', tz: 'Australia/Sydney' },
      'paris': { lat: '48.8566', lon: '2.3522', tz: 'Europe/Paris' },
      'france': { lat: '48.8566', lon: '2.3522', tz: 'Europe/Paris' },
      'berlin': { lat: '52.5200', lon: '13.4050', tz: 'Europe/Berlin' },
      'germany': { lat: '52.5200', lon: '13.4050', tz: 'Europe/Berlin' },
      'dubai': { lat: '25.2048', lon: '55.2708', tz: 'Asia/Dubai' },
      'uae': { lat: '25.2048', lon: '55.2708', tz: 'Asia/Dubai' },
    };
    
    // Try to find location name in query
    const lowerQueryWords = lowerQuery.split(/\s+/);
    for (const [location, coords] of Object.entries(locationToCoords)) {
      if (lowerQueryWords.includes(location) || lowerQuery.includes(location)) {
        const result: Record<string, string> = {
          lat: coords.lat,
          lon: coords.lon,
        };
        if (coords.tz) {
          result.timezone = coords.tz;
        }
        return result;
      }
    }
    
    // Try to extract coordinates explicitly
    const coordMatch = userQuery.match(/(?:lat|latitude):\s*([-\d.]+).*(?:lon|lng|longitude):\s*([-\d.]+)/i);
    if (coordMatch) {
      return {
        lat: coordMatch[1],
        lon: coordMatch[2],
      };
    }
    
    // Try to extract location after "for", "in", "at", "weather in", etc.
    const locationPatterns = [
      /(?:weather|forecast|for|in|at)\s+([A-Za-z\s]+?)(?:\s|$|,|\.)/i,
      /([A-Z][a-zA-Z\s]+?)\s+(?:weather|forecast)/i,
    ];
    
    for (const pattern of locationPatterns) {
      const match = userQuery.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim().toLowerCase();
        if (locationToCoords[location]) {
          const coords = locationToCoords[location];
          const result: Record<string, string> = {
            lat: coords.lat,
            lon: coords.lon,
          };
          if (coords.tz) {
            result.timezone = coords.tz;
          }
          return result;
        }
      }
    }
  }
  
  // World Time API: Extract timezone
  if (lowerApiId.includes('worldtime') || lowerApiId.includes('time')) {
    // Map common location names to timezone identifiers
    const locationToTimezone: Record<string, string> = {
      'india': 'Asia/Kolkata',
      'indian': 'Asia/Kolkata',
      'mumbai': 'Asia/Kolkata',
      'delhi': 'Asia/Kolkata',
      'bangalore': 'Asia/Kolkata',
      'usa': 'America/New_York',
      'us': 'America/New_York',
      'united states': 'America/New_York',
      'new york': 'America/New_York',
      'ny': 'America/New_York',
      'california': 'America/Los_Angeles',
      'san francisco': 'America/Los_Angeles',
      'sf': 'America/Los_Angeles',
      'los angeles': 'America/Los_Angeles',
      'la': 'America/Los_Angeles',
      'london': 'Europe/London',
      'uk': 'Europe/London',
      'united kingdom': 'Europe/London',
      'tokyo': 'Asia/Tokyo',
      'japan': 'Asia/Tokyo',
      'beijing': 'Asia/Shanghai',
      'china': 'Asia/Shanghai',
      'singapore': 'Asia/Singapore',
      'sydney': 'Australia/Sydney',
      'australia': 'Australia/Sydney',
      'paris': 'Europe/Paris',
      'france': 'Europe/Paris',
      'berlin': 'Europe/Berlin',
      'germany': 'Europe/Berlin',
      'dubai': 'Asia/Dubai',
      'uae': 'Asia/Dubai',
      'utc': 'Etc/UTC',
      'gmt': 'Etc/GMT',
    };
    
    // Try to find location name in query
    const lowerQueryWords = lowerQuery.split(/\s+/);
    for (const [location, timezone] of Object.entries(locationToTimezone)) {
      if (lowerQueryWords.includes(location) || lowerQuery.includes(location)) {
        return { tz: timezone };
      }
    }
    
    // Try to extract explicit timezone format (e.g., "Asia/Kolkata", "America/New_York")
    const tzMatch = userQuery.match(/(?:timezone|tz|time)\s+(?:in|at|for)?\s*([A-Za-z0-9_+\-\/]+)/i);
    if (tzMatch && tzMatch[1]) {
      return { tz: tzMatch[1] };
    }
    
    // Try to extract timezone after "time in" or "time for"
    const timeInMatch = userQuery.match(/time\s+(?:in|for|at)\s+([A-Za-z\s]+)/i);
    if (timeInMatch && timeInMatch[1]) {
      const location = timeInMatch[1].trim().toLowerCase();
      if (locationToTimezone[location]) {
        return { tz: locationToTimezone[location] };
      }
    }
  }
  
  // Default: return empty object (will use API defaults)
  return {};
}

export interface AgentResponse {
  success: boolean;
  message: string;
  data?: any;
  apiCalled?: string;
  paymentHash?: string;
  paymentAmount?: string; // Amount in Octas
  error?: string;
  llmUsed?: string;
}


/**
 * Execute agent query by calling appropriate API
 * @param agent - The agent configuration
 * @param userQuery - The user's query/message
 * @param options - Execution options including LLM and API selection
 * @param paymentPrivateKey - User's payment wallet private key for x402 payments
 */
export async function executeAgentQuery(
  agent: Agent,
  userQuery: string,
  options?: {
    llm?: string;
    apiId?: string | null;
  },
  paymentPrivateKey?: string
): Promise<AgentResponse> {
  const startedAt = Date.now();
  const queryPreview = userQuery.length > 180 ? `${userQuery.slice(0, 180)}…` : userQuery;
  
  try {
    // Get available APIs for this agent
    // Use relative URLs or detect from environment - will be resolved by x402axios
    const allApis = getAllApis();
    const availableApis = allApis.filter(api => agent.apiIds.includes(api.id));
    
    console.log('[Agent Executor] Start', {
      agentId: agent.id,
      agentName: agent.name,
      queryPreview,
      llmRequested: options?.llm || 'keyword',
      apiOverride: options?.apiId || null,
      availableApis: availableApis.map(api => ({ id: api.id, name: api.name, method: api.method })),
    });
    
    if (availableApis.length === 0) {
      console.warn('[Agent Executor] No APIs configured for agent', { agentId: agent.id });
      return {
        success: false,
        message: 'This agent has no APIs configured. Please add APIs to the agent.',
        error: 'NO_APIS_CONFIGURED',
      };
    }
    
    // Process query with LLM or fallback
    let llmResponse: LLMResponse | undefined;
    let llmUsed = 'keyword';
    let selectedApi: ApiMetadata | null = null;
    
    // Determine which model to use for LLM processing
    let modelName = 'keyword';
    if (options?.llm && options.llm !== 'keyword') {
      // Check for GitHub Models
      if (options.llm.startsWith('gpt-5') || options.llm.startsWith('grok-3') || 
          options.llm.startsWith('gpt-4.1') || options.llm.startsWith('phi-4') ||
          options.llm.startsWith('o4-mini')) {
        modelName = options.llm;
        llmUsed = options.llm === 'gpt-5-mini' ? 'GPT-5 Mini' :
                  options.llm === 'gpt-5-nano' ? 'GPT-5 Nano' :
                  options.llm === 'grok-3-mini' ? 'Grok 3 Mini' :
                  options.llm === 'gpt-4.1-mini' ? 'GPT-4.1 Mini' :
                  options.llm === 'gpt-4.1-nano' ? 'GPT-4.1 Nano' :
                  options.llm === 'phi-4-mini-reasoning' ? 'Phi-4 Mini Reasoning' :
                  options.llm === 'o4-mini' ? 'O4 Mini' :
                  options.llm;
      } else if (options.llm.startsWith('gemini')) {
        const modelMap: Record<string, string> = {
          'gemini-2.5-flash': 'gemini-2.0-flash-exp',
        };
        modelName = modelMap[options.llm] || 'gemini-2.0-flash-exp';
        llmUsed = 'Gemini 2.5 Flash';
      } else if (options.llm === 'claude-sonnet-4') {
        return {
          success: false,
          message: 'This LLM is not yet available. Please select an enabled LLM.',
          error: 'LLM_NOT_AVAILABLE',
        };
      }
    }
    
    // Process query with LLM (unless specific API is manually selected)
    if (!options?.apiId) {
      llmResponse = await processQueryWithLLM(userQuery, availableApis, agent.name || 'Agent', modelName);
      console.log('[Agent Executor] LLM decision', {
        agentId: agent.id,
        modelRequested: options?.llm || 'keyword',
        modelUsed: llmResponse?.actualModelUsed || modelName,
        shouldCallAPI: llmResponse?.shouldCallAPI,
        suggestedApiId: llmResponse?.apiId,
        conversational: llmResponse?.conversationalResponse ? llmResponse.conversationalResponse.slice(0, 120) : null,
      });
      
      // Update llmUsed if fallback occurred
      if (llmResponse?.actualModelUsed) {
        if (llmResponse.actualModelUsed === 'gemini-2.5-flash') {
          llmUsed = 'Gemini 2.5 Flash';
        }
      }
      
      // If LLM says no API call needed (greeting/casual), return conversational response
      if (llmResponse && !llmResponse.shouldCallAPI) {
        console.log('[Agent Executor] LLM chose conversational response', {
          agentId: agent.id,
          durationMs: Date.now() - startedAt,
        });
        return {
          success: true,
          message: llmResponse.conversationalResponse || `Hello! I'm ${agent.name || 'your agent'}. How can I help you today?`,
          llmUsed: options?.llm === 'keyword' ? undefined : llmUsed,
        };
      }
      
      // Find the API if LLM suggested one
      if (llmResponse?.apiId) {
        selectedApi = availableApis.find(api => api.id === llmResponse!.apiId) || null;
      }
      
      // If no API found, return error
      if (!selectedApi) {
        console.warn('[Agent Executor] No matching API found from LLM', {
          agentId: agent.id,
          suggestedApiId: llmResponse?.apiId,
          availableApiIds: availableApis.map(a => a.id),
          durationMs: Date.now() - startedAt,
        });
        return {
          success: false,
          message: llmResponse?.conversationalResponse || 'I couldn\'t determine which API to use for your query. Please try rephrasing or select a specific API.',
          error: 'NO_MATCHING_API',
          llmUsed: options?.llm === 'keyword' ? undefined : llmUsed,
        };
      }
    } else {
      // Specific API manually selected - use fast keyword check for greetings (skip LLM call)
      // We should never call APIs for greetings, even if manually selected
      const lowerQuery = userQuery.toLowerCase().trim();
      const greetings = ['hello', 'hi', 'hey', 'howdy', 'greetings', 'good morning', 'good afternoon', 'good evening'];
      const casual = ['thanks', 'thank you', 'ok', 'okay', 'yes', 'no', 'sure', 'alright', 'cool', 'nice', 'how are you', 'what\'s up'];
      
      if (greetings.some(g => lowerQuery === g || lowerQuery.startsWith(g + ' ')) ||
          casual.some(c => lowerQuery === c || lowerQuery.startsWith(c + ' '))) {
        console.log('[Agent Executor] Greeting detected; skipping API call', {
          agentId: agent.id,
          apiOverride: options.apiId,
          durationMs: Date.now() - startedAt,
        });
        return {
          success: true,
          message: `Hello! I'm ${agent.name || 'your agent'}. How can I help you today?`,
          llmUsed: undefined, // No LLM used for greeting check
        };
      }
      
      selectedApi = availableApis.find(api => api.id === options.apiId) || null;
      if (!selectedApi) {
        console.warn('[Agent Executor] Requested API not available for agent', {
          agentId: agent.id,
          requestedApiId: options.apiId,
          availableApiIds: availableApis.map(a => a.id),
        });
        return {
          success: false,
          message: `The requested API "${options.apiId}" is not available for this agent.`,
          error: 'API_NOT_AVAILABLE',
        };
      }
    }
    
    // Validate payment private key is provided
    if (!paymentPrivateKey) {
      console.error('[Agent Executor] Missing payment wallet for agent', {
        agentId: agent.id,
        durationMs: Date.now() - startedAt,
      });
      return {
        success: false,
        message: 'Payment wallet not configured. Please ensure you are signed in.',
        error: 'NO_PAYMENT_WALLET',
      };
    }
    
    // Call the API using x402axios with user's payment wallet
    try {
      const config: any = {
        privateKey: paymentPrivateKey,
      };
      
      // Extract query parameters from user query for specific APIs
      let apiUrl = selectedApi.url;
      if (selectedApi.method === 'GET') {
        const queryParams = extractQueryParamsFromUserQuery(userQuery, selectedApi);
        if (queryParams && Object.keys(queryParams).length > 0) {
          const urlObj = new URL(apiUrl);
          Object.entries(queryParams).forEach(([key, value]) => {
            if (value) urlObj.searchParams.set(key, String(value));
          });
          apiUrl = urlObj.toString();
        }
      }
      
      let response;
      console.log('[Agent Executor] Calling API', {
        agentId: agent.id,
        apiId: selectedApi.id,
        apiName: selectedApi.name,
        method: selectedApi.method,
        url: apiUrl,
        hasPaymentKey: !!paymentPrivateKey,
      });
      
      if (selectedApi.method === 'GET') {
        response = await x402axios.get(apiUrl, config);
      } else if (selectedApi.method === 'POST') {
        // For POST, you might want to extract data from query
        // For now, just send empty body or query params
        response = await x402axios.post(apiUrl, {}, config);
      } else {
        response = await x402axios.get(apiUrl, config);
      }
      
      // Extract payment info if available
      const paymentHash = response.paymentInfo?.transactionHash;
      const paymentAmount = response.paymentInfo?.amount; // Amount in Octas
      
      console.log('[Agent Executor] Payment info:', {
        hasPaymentInfo: !!response.paymentInfo,
        paymentHash,
        paymentAmount,
        fullPaymentInfo: response.paymentInfo
      });
      
      // Use LLM to extract and format specific data from API response
      let finalMessage: string;
      let extractedData: any = response.data;
      
      if (options?.llm && options.llm !== 'keyword') {
        // Determine the model name for data extraction
        let extractionModelName = 'keyword';
        
        if (options.llm.startsWith('gemini')) {
          // Map LLM names for data extraction
          const modelMap: Record<string, string> = {
            'gemini-2.5-flash': 'gemini-2.0-flash-exp',
          };
          extractionModelName = modelMap[options.llm] || 'gemini-2.0-flash-exp';
        } else if (options.llm.startsWith('gpt-5') || options.llm.startsWith('grok-3') || 
                   options.llm.startsWith('gpt-4.1') || options.llm.startsWith('phi-4') ||
                   options.llm.startsWith('o4-mini')) {
          // Use GitHub Models directly
          extractionModelName = options.llm;
        }
        
        // Extract specific data based on user query
        const extraction = await extractDataWithLLM(
          userQuery,
          response.data,
          selectedApi.name,
          extractionModelName
        );
        
        finalMessage = extraction.formattedResponse;
        extractedData = extraction.extractedData;
        
        // If LLM returned generic/empty response, use smart formatter as fallback
        if (!finalMessage || finalMessage.length < 20 || 
            (finalMessage.toLowerCase().includes('time information') && !finalMessage.includes(':')) ||
            (finalMessage.toLowerCase().includes('current time') && !finalMessage.match(/\d{1,2}:\d{2}/))) {
          const smartFormatted = formatDataSmart(userQuery, response.data, selectedApi.name);
          if (smartFormatted && smartFormatted.length > 20 && smartFormatted.includes(':')) {
            finalMessage = smartFormatted;
          }
        }
      } else {
        // Fallback: use smart formatter for better display
        finalMessage = formatDataSmart(userQuery, response.data, selectedApi.name);
        if (!finalMessage || finalMessage.length < 10) {
          finalMessage = llmResponse?.conversationalResponse || 
                        `Successfully retrieved data from ${selectedApi.name}`;
        }
      }
      
      console.log('[Agent Executor] Success', {
        agentId: agent.id,
        apiName: selectedApi.name,
        apiId: selectedApi.id,
        llmUsed: options?.llm || 'keyword',
        durationMs: Date.now() - startedAt,
      });
      
      return {
        success: true,
        message: finalMessage,
        data: extractedData,
        apiCalled: selectedApi.name,
        paymentHash,
        paymentAmount, // Amount in Octas
        llmUsed: options?.llm === 'keyword' ? undefined : llmUsed,
      };
    } catch (apiError: any) {
      // Handle x402 payment errors
      if (apiError.response?.status === 402) {
        console.error('[Agent Executor] Payment required / insufficient funds', {
          agentId: agent.id,
          apiName: selectedApi.name,
          status: apiError.response?.status,
          durationMs: Date.now() - startedAt,
        });
        return {
          success: false,
          message: 'Payment required but could not be processed. Please ensure the agent has sufficient funds.',
          error: 'PAYMENT_REQUIRED',
          apiCalled: selectedApi.name,
        };
      }
      
      if (apiError.message?.includes('funds') || apiError.message?.includes('balance')) {
        console.error('[Agent Executor] Insufficient funds detected', {
          agentId: agent.id,
          apiName: selectedApi.name,
          message: apiError.message,
          durationMs: Date.now() - startedAt,
        });
        return {
          success: false,
          message: 'Insufficient funds. Please add more APT to this agent\'s wallet.',
          error: 'INSUFFICIENT_FUNDS',
          apiCalled: selectedApi.name,
        };
      }
      
      // Handle network/fetch errors
      const errorMessage = apiError.message || apiError.toString() || 'Unknown error';
      const isNetworkError = errorMessage.includes('fetch failed') || 
                            errorMessage.includes('network') ||
                            errorMessage.includes('Failed to fetch');
      
      if (isNetworkError) {
        console.error('[Agent Executor] Network error calling API', {
          agentId: agent.id,
          apiName: selectedApi.name,
          errorMessage,
          durationMs: Date.now() - startedAt,
        });
        return {
          success: false,
          message: `Unable to reach ${selectedApi.name}. The API may be unavailable or the URL is incorrect.`,
          error: 'NETWORK_ERROR',
          apiCalled: selectedApi.name,
          llmUsed: options?.llm === 'keyword' ? undefined : llmUsed,
        };
      }
      
      console.error('[Agent Executor] API error', {
        agentId: agent.id,
        apiName: selectedApi.name,
        errorMessage,
        durationMs: Date.now() - startedAt,
      });
      return {
        success: false,
        message: `Error calling ${selectedApi.name}: ${errorMessage}`,
        error: 'API_ERROR',
        apiCalled: selectedApi.name,
        llmUsed: options?.llm === 'keyword' ? undefined : llmUsed,
      };
    }
  } catch (error: any) {
    console.error('[Agent Executor] Unhandled execution error', {
      agentId: agent.id,
      errorMessage: error?.message,
      durationMs: Date.now() - startedAt,
    });
    return {
      success: false,
      message: `An error occurred: ${error.message || 'Unknown error'}`,
      error: 'EXECUTION_ERROR',
    };
  }
}

