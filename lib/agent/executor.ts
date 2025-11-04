/**
 * Agent Executor
 * Agent logic to parse queries and call APIs using Gemini AI for interpretation
 */

import { x402axios } from '../x402-axios';
import { getAllApis, getApiById, ApiMetadata } from '../storage/apis';
import { Agent } from '../storage/agents';
import { processQueryWithLLM, LLMResponse } from './llm-chat';
import { extractDataWithLLM } from './data-extractor';

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
 * @param userPrivateKey - Optional user's private key for payment (required for public agents)
 */
export async function executeAgentQuery(
  agent: Agent,
  userQuery: string,
  options?: {
    llm?: string;
    apiId?: string | null;
  },
  userPrivateKey?: string
): Promise<AgentResponse> {
  try {
    // Get available APIs for this agent
    const allApis = getAllApis();
    const availableApis = allApis.filter(api => agent.apiIds.includes(api.id));
    
    if (availableApis.length === 0) {
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
      if (options.llm === 'claude-sonnet-4' || options.llm === 'gpt-5') {
        return {
          success: false,
          message: 'This LLM is not yet available. Please select an enabled LLM.',
          error: 'LLM_NOT_AVAILABLE',
        };
      }
      
      if (options.llm.startsWith('gemini')) {
        const modelMap: Record<string, string> = {
          'gemini-2.5-flash': 'gemini-2.0-flash-exp',
          'gemini-1.5-pro': 'gemini-1.5-pro',
          'gemini-1.5-flash': 'gemini-1.5-flash',
        };
        modelName = modelMap[options.llm] || 'gemini-2.0-flash-exp';
        llmUsed = options.llm === 'gemini-1.5-pro' ? 'Gemini 1.5 Pro' : 
                  options.llm === 'gemini-2.5-flash' ? 'Gemini 2.5 Flash' : 
                  'Gemini 1.5 Flash';
      }
    }
    
    // Process query with LLM (unless specific API is manually selected)
    if (!options?.apiId) {
      llmResponse = await processQueryWithLLM(userQuery, availableApis, agent.name || 'Agent', modelName);
      
      // If LLM says no API call needed (greeting/casual), return conversational response
      if (llmResponse && !llmResponse.shouldCallAPI) {
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
        return {
          success: true,
          message: `Hello! I'm ${agent.name || 'your agent'}. How can I help you today?`,
          llmUsed: undefined, // No LLM used for greeting check
        };
      }
      
      selectedApi = availableApis.find(api => api.id === options.apiId) || null;
      if (!selectedApi) {
        return {
          success: false,
          message: `The requested API "${options.apiId}" is not available for this agent.`,
          error: 'API_NOT_AVAILABLE',
        };
      }
    }
    
    // Determine which wallet to use for payment:
    // - If userPrivateKey is provided: user is chatting with someone else's public agent -> use user's wallet
    // - Otherwise: user owns the agent -> use agent's wallet
    let paymentPrivateKey: string;
    if (userPrivateKey) {
      // User chatting with public agent owned by someone else - use user's wallet
      paymentPrivateKey = userPrivateKey;
    } else {
      // User owns the agent (or it's private) - use agent's wallet
      paymentPrivateKey = agent.privateKey;
    }
    
    // Call the API using x402axios with appropriate private key
    try {
      const config: any = {
        privateKey: paymentPrivateKey,
      };
      
      let response;
      
      if (selectedApi.method === 'GET') {
        response = await x402axios.get(selectedApi.url, config);
      } else if (selectedApi.method === 'POST') {
        // For POST, you might want to extract data from query
        // For now, just send empty body or query params
        response = await x402axios.post(selectedApi.url, {}, config);
      } else {
        response = await x402axios.get(selectedApi.url, config);
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
      
      if (options?.llm && options.llm !== 'keyword' && options.llm.startsWith('gemini')) {
        // Map LLM names for data extraction
        const modelMap: Record<string, string> = {
          'gemini-2.5-flash': 'gemini-2.0-flash-exp',
          'gemini-1.5-pro': 'gemini-1.5-pro',
          'gemini-1.5-flash': 'gemini-1.5-flash',
        };
        const geminiModel = modelMap[options.llm] || 'gemini-2.0-flash-exp';
        
        // Extract specific data based on user query
        const extraction = await extractDataWithLLM(
          userQuery,
          response.data,
          selectedApi.name,
          geminiModel
        );
        
        finalMessage = extraction.formattedResponse;
        extractedData = extraction.extractedData;
      } else {
        // Fallback: use conversational response or format data
        finalMessage = llmResponse?.conversationalResponse || 
                      `Successfully retrieved data from ${selectedApi.name}`;
      }
      
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
        return {
          success: false,
          message: 'Payment required but could not be processed. Please ensure the agent has sufficient funds.',
          error: 'PAYMENT_REQUIRED',
          apiCalled: selectedApi.name,
        };
      }
      
      if (apiError.message?.includes('funds') || apiError.message?.includes('balance')) {
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
        return {
          success: false,
          message: `Unable to reach ${selectedApi.name}. The API may be unavailable or the URL is incorrect.`,
          error: 'NETWORK_ERROR',
          apiCalled: selectedApi.name,
          llmUsed: options?.llm === 'keyword' ? undefined : llmUsed,
        };
      }
      
      return {
        success: false,
        message: `Error calling ${selectedApi.name}: ${errorMessage}`,
        error: 'API_ERROR',
        apiCalled: selectedApi.name,
        llmUsed: options?.llm === 'keyword' ? undefined : llmUsed,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `An error occurred: ${error.message || 'Unknown error'}`,
      error: 'EXECUTION_ERROR',
    };
  }
}

