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
  error?: string;
  llmUsed?: string;
}


/**
 * Execute agent query by calling appropriate API
 */
export async function executeAgentQuery(
  agent: Agent,
  userQuery: string,
  options?: {
    llm?: string;
    apiId?: string | null;
  }
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
      // Specific API manually selected - but still check if query is a greeting
      // We should never call APIs for greetings, even if manually selected
      const greetingCheck = await processQueryWithLLM(userQuery, availableApis, agent.name || 'Agent', modelName);
      
      if (greetingCheck && !greetingCheck.shouldCallAPI) {
        return {
          success: true,
          message: greetingCheck.conversationalResponse || `Hello! I'm ${agent.name || 'your agent'}. How can I help you today?`,
          llmUsed: options?.llm === 'keyword' ? undefined : llmUsed,
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
    
    // Call the API using x402axios with agent's private key
    try {
      const config: any = {
        privateKey: agent.privateKey,
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

