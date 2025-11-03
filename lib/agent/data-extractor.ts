/**
 * Data Extractor
 * Uses LLM to extract and format specific data from API responses
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface ExtractedData {
  formattedResponse: string;
  extractedData?: any;
}

/**
 * Use LLM to extract specific data from API response based on user query
 */
export async function extractDataWithLLM(
  userQuery: string,
  apiData: any,
  apiName: string,
  modelName: string = 'gemini-2.0-flash-exp'
): Promise<ExtractedData> {
  // If no Gemini API key, return raw data
  if (!GEMINI_API_KEY || modelName === 'keyword') {
    return {
      formattedResponse: formatDataFallback(userQuery, apiData, apiName),
      extractedData: apiData,
    };
  }

  try {
    const model = new ChatGoogleGenerativeAI({
      modelName: modelName,
      temperature: 0.1, // Lower temperature for more direct, deterministic responses
      apiKey: GEMINI_API_KEY,
    });

    const prompt = `Extract and format data from the API response based on the user query. Work with ANY API structure - weather, stocks, news, trading, etc. Be direct and concise - no intros, no explanations, just the answer.

User Query: "${userQuery}"
API: ${apiName}
API Response Data:
${JSON.stringify(apiData, null, 2)}

CRITICAL RULES:
- NO conversational intros like "Okay, I can help" or "Based on your query"
- NO repeating the user's query back to them
- Start directly with the answer
- If the query is vague or doesn't match the data (e.g., greeting with API data), show what data IS available
- Extract ONLY what the user asked for when specific (filtering, specific fields, etc.)
- If query is general/unspecific, provide a brief summary of available data
- Understand the API data structure dynamically - don't assume any specific format
- Format clearly but be brief
- If data is empty/null/undefined, say "No data available" (one line)

Examples:
Query: "weather for tuesday" → "Tuesday: Sunny, 73°F high, 56°F low"
Query: "AAPL stock price" → "$150.25"
Query: "hello" (with stock symbols data) → "Available stock symbols: AAPL, GOOGL, MSFT, AMZN, TSLA"
Query: "latest news headline" → "Tech stocks surge on AI breakthrough"
Query: "temperature only" → "73°F"
Query: "what stocks?" (with symbols list) → "Available symbols: AAPL, GOOGL, MSFT, AMZN, TSLA"

Answer:`;

    const response = await model.invoke(prompt);
    const formattedResponse = response.content?.toString().trim();

    // Try to extract structured data if possible
    let extractedData = apiData;
    try {
      // Look for JSON in the response (in case LLM provides structured data)
      const jsonMatch = formattedResponse?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If no JSON, use original data
    }

    return {
      formattedResponse: formattedResponse || formatDataFallback(userQuery, apiData, apiName),
      extractedData,
    };
  } catch (error) {
    console.error('Error extracting data with LLM:', error);
    return {
      formattedResponse: formatDataFallback(userQuery, apiData, apiName),
      extractedData: apiData,
    };
  }
}

/**
 * Fallback formatter when LLM is not available
 * Returns raw JSON - no API-specific logic. LLM should handle all extraction.
 */
function formatDataFallback(userQuery: string, apiData: any, apiName: string): string {
  // Just return the raw data as JSON - no hardcoded API-specific logic
  // The LLM handles all extraction and formatting when available
  return JSON.stringify(apiData, null, 2);
}

