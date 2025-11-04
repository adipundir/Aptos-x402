/**
 * Data Extractor
 * Uses LLM to extract and format specific data from API responses
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Cache model instances to avoid re-initialization overhead
const modelCache = new Map<string, ChatGoogleGenerativeAI>();

function getModel(modelName: string): ChatGoogleGenerativeAI {
  if (!modelCache.has(modelName)) {
    modelCache.set(modelName, new ChatGoogleGenerativeAI({
      modelName: modelName,
      temperature: 0.1,
      apiKey: GEMINI_API_KEY,
      maxTokens: 512, // Limit tokens for faster responses
    }));
  }
  return modelCache.get(modelName)!;
}

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
    const model = getModel(modelName);

    // Optimize prompt - shorter and more direct for faster processing
    // Truncate large API data to avoid token bloat
    const dataStr = JSON.stringify(apiData);
    const maxDataLength = 2000; // Limit data size to avoid huge prompts
    const truncatedData = dataStr.length > maxDataLength 
      ? dataStr.substring(0, maxDataLength) + '...[truncated]'
      : dataStr;

    const prompt = `Query: "${userQuery}"
API: ${apiName}
Data: ${truncatedData}

Rules: Direct answer only, no intros. Extract what user asked. Brief.`;

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

