/**
 * Gemini AI Query Interpreter
 * Uses Google Gemini to understand user queries and determine which API to call
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { getAllApis, ApiMetadata } from '../storage/apis';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set. Falling back to keyword-based matching.');
}

/**
 * Use Gemini to determine which API to call based on user query
 */
export async function interpretQueryWithGemini(
  userQuery: string,
  availableApis: ApiMetadata[],
  modelName: string = 'gemini-1.5-flash'
): Promise<ApiMetadata | null> {
  // Fallback to keyword matching if Gemini is not configured
  if (!GEMINI_API_KEY) {
    return determineApiForQueryFallback(userQuery, availableApis);
  }

  try {
    const model = new ChatGoogleGenerativeAI({
      modelName: modelName,
      temperature: 0.3,
      apiKey: GEMINI_API_KEY,
    });

    // Create a prompt that describes available APIs and asks Gemini to select one
    const apiDescriptions = availableApis.map(api => 
      `- ${api.name} (${api.id}): ${api.description}. Category: ${api.category}. Method: ${api.method}`
    ).join('\n');

    const prompt = `You are an AI assistant that helps determine which API to call based on user queries.

Available APIs:
${apiDescriptions}

User Query: "${userQuery}"

IMPORTANT RULES:
- Only respond with an API ID if the user is EXPLICITLY requesting data or functionality that requires an API call
- For greetings (hello, hi, hey), casual conversation, or questions that don't require API data, respond with "NONE"
- Examples that should return "NONE": "hello", "hi", "how are you", "thanks", "ok", "yes", "no"
- Examples that should return an API ID: "what's the weather", "get weather data", "show me stocks", "search for something"
- Respond with ONLY the API ID (the identifier in parentheses), nothing else
- If no API matches the query or it's just conversation, respond with "NONE"`;

    const response = await model.invoke(prompt);
    let apiId = response.content?.toString().trim().toLowerCase();
    
    // Clean up the response - remove any extra text
    apiId = apiId.replace(/^api\s*id[:\s]*/i, '');
    apiId = apiId.replace(/[^\w-]/g, '');

    if (!apiId || apiId === 'none') {
      return null;
    }

    // Find the API by ID
    const selectedApi = availableApis.find(api => 
      api.id.toLowerCase() === apiId || 
      api.name.toLowerCase().includes(apiId) ||
      apiId.includes(api.id.toLowerCase())
    );

    return selectedApi || null;
  } catch (error) {
    console.error('Error interpreting query with Gemini:', error);
    // Fallback to keyword matching on error
    return determineApiForQueryFallback(userQuery, availableApis);
  }
}

/**
 * Fallback keyword-based API selection
 */
function determineApiForQueryFallback(
  query: string,
  availableApis: ApiMetadata[]
): ApiMetadata | null {
  const lowerQuery = query.toLowerCase().trim();
  
  // Don't call APIs for greetings or casual conversation
  const greetings = ['hello', 'hi', 'hey', 'howdy', 'greetings', 'good morning', 'good afternoon', 'good evening'];
  const casual = ['thanks', 'thank you', 'ok', 'okay', 'yes', 'no', 'sure', 'alright', 'cool', 'nice'];
  
  if (greetings.some(g => lowerQuery === g || lowerQuery.startsWith(g + ' ')) ||
      casual.some(c => lowerQuery === c || lowerQuery === c + '.')) {
    return null;
  }
  
  // Weather-related queries
  if (lowerQuery.includes('weather') || lowerQuery.includes('temperature') || 
      lowerQuery.includes('forecast') || lowerQuery.includes('climate') ||
      lowerQuery.includes('weather data') || lowerQuery.includes('current weather')) {
    return availableApis.find(api => api.id === 'weather') || null;
  }
  
  // Stock-related queries
  if (lowerQuery.includes('stock') || lowerQuery.includes('price') || 
      lowerQuery.includes('market') || lowerQuery.includes('trading') ||
      lowerQuery.includes('crypto') || lowerQuery.includes('bitcoin')) {
    return availableApis.find(api => api.category === 'Trading') || null;
  }
  
  // Search-related queries
  if (lowerQuery.includes('search') || lowerQuery.includes('find') || 
      lowerQuery.includes('lookup') || lowerQuery.includes('query')) {
    return availableApis.find(api => api.category === 'Search') || null;
  }
  
  // News-related queries
  if (lowerQuery.includes('news') || lowerQuery.includes('headlines') || 
      lowerQuery.includes('latest news')) {
    return availableApis.find(api => api.category === 'AI' || api.id.includes('news')) || null;
  }
  
  // Don't default to calling an API - return null if unclear
  return null;
}

