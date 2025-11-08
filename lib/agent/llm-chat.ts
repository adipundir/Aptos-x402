/**
 * LLM Chat Handler
 * Uses LLM (Gemini or GitHub Models) to generate conversational responses
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { getAllApis, ApiMetadata } from '../storage/apis';
import { invokeGitHubModel, isGitHubModel } from './github-models';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Cache model instances to avoid re-initialization overhead
const modelCache = new Map<string, ChatGoogleGenerativeAI>();

function getModel(modelName: string): ChatGoogleGenerativeAI {
  if (!modelCache.has(modelName)) {
    modelCache.set(modelName, new ChatGoogleGenerativeAI({
      modelName: modelName,
      temperature: 0.3,
      apiKey: GEMINI_API_KEY,
    }));
  }
  return modelCache.get(modelName)!;
}

export interface LLMResponse {
  shouldCallAPI: boolean;
  apiId?: string | null;
  conversationalResponse?: string;
  actualModelUsed?: string; // Track which model was actually used (for fallback scenarios)
}

/**
 * Use LLM to determine if API call is needed and generate conversational response
 */
export async function processQueryWithLLM(
  userQuery: string,
  availableApis: ApiMetadata[],
  agentName: string,
  modelName: string = 'gemini-2.0-flash-exp'
): Promise<LLMResponse> {
  // Check if this is a GitHub Model
  if (isGitHubModel(modelName)) {
    return processQueryWithGitHubModel(userQuery, availableApis, agentName, modelName);
  }

  // If no Gemini API key or using keyword fallback, use simple fallback
  if (!GEMINI_API_KEY || modelName === 'keyword') {
    return processQueryFallback(userQuery, availableApis, agentName);
  }

  try {
    const model = getModel(modelName);

    // Optimize API descriptions - only include essential info
    const apiDescriptions = availableApis.map(api => 
      `${api.id}:${api.name}`
    ).join(';');

    // Shorter, more focused prompt for faster LLM response
    const prompt = `Agent: ${agentName}
APIs: ${apiDescriptions}
Query: "${userQuery}"

Rules: Greetings/casual → shouldCallAPI=false. Data requests → shouldCallAPI=true with apiId.
JSON only: {"shouldCallAPI":boolean,"apiId":"id-or-null","conversationalResponse":"response"}`;

    const response = await model.invoke(prompt);
    const content = response.content?.toString().trim();
    
    // Try to parse JSON response
    try {
      // Extract JSON from response (in case LLM adds extra text)
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          shouldCallAPI: parsed.shouldCallAPI === true,
          apiId: parsed.apiId || null,
          conversationalResponse: parsed.conversationalResponse || undefined,
          actualModelUsed: modelName === 'gemini-2.0-flash-exp' ? 'gemini-2.5-flash' : modelName,
        };
      }
    } catch (parseError) {
      console.error('Failed to parse LLM JSON response:', parseError);
    }

    // Fallback if JSON parsing fails
    return processQueryFallback(userQuery, availableApis, agentName);
  } catch (error) {
    console.error('Error processing query with LLM:', error);
    return processQueryFallback(userQuery, availableApis, agentName);
  }
}

/**
 * Process query with GitHub Models
 */
async function processQueryWithGitHubModel(
  userQuery: string,
  availableApis: ApiMetadata[],
  agentName: string,
  modelName: string
): Promise<LLMResponse> {
  try {
    // Optimize API descriptions - only include essential info
    const apiDescriptions = availableApis.map(api => 
      `${api.id}:${api.name}`
    ).join(';');

    // Shorter, more focused prompt for faster LLM response
    const prompt = `Agent: ${agentName}
APIs: ${apiDescriptions}
Query: "${userQuery}"

Rules: Greetings/casual → shouldCallAPI=false. Data requests → shouldCallAPI=true with apiId.
JSON only: {"shouldCallAPI":boolean,"apiId":"id-or-null","conversationalResponse":"response"}`;

    const content = await invokeGitHubModel(prompt, modelName, { temperature: 0.3 });
    
    // Try to parse JSON response
    try {
      // Extract JSON from response (in case LLM adds extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          shouldCallAPI: parsed.shouldCallAPI === true,
          apiId: parsed.apiId || null,
          conversationalResponse: parsed.conversationalResponse || undefined,
        };
      }
    } catch (parseError) {
      console.error('Failed to parse GitHub Model JSON response:', parseError);
    }

    // Fallback if JSON parsing fails
    return processQueryFallback(userQuery, availableApis, agentName);
  } catch (error: any) {
    console.error('Error processing query with GitHub Model:', error);
    
    // Check if it's a rate limit or token error - fallback to Gemini 2.5 Flash
    const errorMessage = error.message || String(error);
    const isRateLimitError = errorMessage.includes('429') || 
                            errorMessage.includes('Too many requests') ||
                            errorMessage.includes('rate limit') ||
                            errorMessage.includes('token') ||
                            errorMessage.includes('quota');
    
    if (isRateLimitError) {
      console.log('GitHub Model rate limit/token error detected. Falling back to Gemini 2.5 Flash...');
      // Fallback to Gemini 2.5 Flash
      const fallbackResponse = await processQueryWithLLM(userQuery, availableApis, agentName, 'gemini-2.0-flash-exp');
      // Mark that we used Gemini as fallback
      return {
        ...fallbackResponse,
        actualModelUsed: 'gemini-2.5-flash',
      };
    }
    
    // For other errors, use keyword fallback
    return processQueryFallback(userQuery, availableApis, agentName);
  }
}

/**
 * Fallback processing without LLM
 */
function processQueryFallback(
  query: string,
  availableApis: ApiMetadata[],
  agentName: string
): LLMResponse {
  const lowerQuery = query.toLowerCase().trim();
  
  // Greetings and casual conversation
  const greetings = ['hello', 'hi', 'hey', 'howdy', 'greetings', 'good morning', 'good afternoon', 'good evening'];
  const casual = ['thanks', 'thank you', 'ok', 'okay', 'yes', 'no', 'sure', 'alright', 'cool', 'nice', 'how are you', 'what\'s up'];
  
  if (greetings.some(g => lowerQuery === g || lowerQuery.startsWith(g + ' ')) ||
      casual.some(c => lowerQuery === c || lowerQuery.startsWith(c + ' '))) {
    return {
      shouldCallAPI: false,
      apiId: null,
      conversationalResponse: `Hello! I'm ${agentName}. How can I help you today? You can ask me to fetch data from APIs like weather, stocks, news, or random data.`,
    };
  }
  
  // Check for API-related queries
  if (lowerQuery.includes('weather') || lowerQuery.includes('temperature') || lowerQuery.includes('forecast')) {
    const api = availableApis.find(api => api.id === 'weather');
    if (api) {
      return {
        shouldCallAPI: true,
        apiId: 'weather',
        conversationalResponse: 'Let me fetch the weather data for you.',
      };
    }
  }
  
  if (lowerQuery.includes('stock') || lowerQuery.includes('price') || lowerQuery.includes('market')) {
    const api = availableApis.find(api => api.category === 'Trading');
    if (api) {
      return {
        shouldCallAPI: true,
        apiId: api.id,
        conversationalResponse: 'Let me fetch the stock market data for you.',
      };
    }
  }
  
  if (lowerQuery.includes('news') || lowerQuery.includes('headlines')) {
    const api = availableApis.find(api => api.id === 'news');
    if (api) {
      return {
        shouldCallAPI: true,
        apiId: 'news',
        conversationalResponse: 'Let me fetch the latest news for you.',
      };
    }
  }
  
  // Default: conversational response
  return {
    shouldCallAPI: false,
    apiId: null,
    conversationalResponse: `I'm not sure what you're asking for. You can ask me to fetch data from APIs like weather, stocks, news, or random data. How can I help?`,
  };
}

