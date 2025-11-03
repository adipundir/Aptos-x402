/**
 * LLM Chat Handler
 * Uses LLM to generate conversational responses
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { getAllApis, ApiMetadata } from '../storage/apis';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface LLMResponse {
  shouldCallAPI: boolean;
  apiId?: string | null;
  conversationalResponse?: string;
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
  // If no Gemini API key or using keyword fallback, use simple fallback
  if (!GEMINI_API_KEY || modelName === 'keyword') {
    return processQueryFallback(userQuery, availableApis, agentName);
  }

  try {
    const model = new ChatGoogleGenerativeAI({
      modelName: modelName,
      temperature: 0.3, // Lower temperature for faster, more deterministic responses
      apiKey: GEMINI_API_KEY,
    });

    const apiDescriptions = availableApis.map(api => 
      `- ${api.name} (${api.id}): ${api.description}`
    ).join('\n');

    const prompt = `You are a helpful AI assistant named "${agentName}". You can access APIs to fetch data when needed, but you should be conversational and natural first.

Available APIs:
${apiDescriptions}

User Query: "${userQuery}"

CRITICAL RULES:
1. For greetings (hello, hi, hey, how are you, what's up, etc.) - ALWAYS set shouldCallAPI to false and respond conversationally
2. For casual conversation (thanks, ok, yes, no, sure, etc.) - ALWAYS set shouldCallAPI to false and respond conversationally  
3. ONLY set shouldCallAPI to true if the user EXPLICITLY requests data or information that requires an API call
4. Be natural, friendly, and conversational - act like a real AI assistant, not just an API router

Respond in JSON format with this structure:
{
  "shouldCallAPI": true/false,
  "apiId": "api-id-here" or null,
  "conversationalResponse": "Your conversational response to the user"
}

Examples:
- "hello" → {"shouldCallAPI": false, "apiId": null, "conversationalResponse": "Hello! I'm ${agentName}. How can I help you today? I can fetch weather data, stock prices, news, and more!"}
- "hi there" → {"shouldCallAPI": false, "apiId": null, "conversationalResponse": "Hi! Nice to meet you! What would you like to know?"}
- "what's the weather?" → {"shouldCallAPI": true, "apiId": "weather", "conversationalResponse": "Let me fetch the current weather data for you."}
- "how are you?" → {"shouldCallAPI": false, "apiId": null, "conversationalResponse": "I'm doing great, thanks for asking! How can I assist you today?"}
- "thanks" → {"shouldCallAPI": false, "apiId": null, "conversationalResponse": "You're welcome! Feel free to ask if you need anything else."}

IMPORTANT: When shouldCallAPI is false, provide a natural conversational response. When shouldCallAPI is true, you can provide a brief intro before fetching data.

Respond ONLY with valid JSON, no other text.`;

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

