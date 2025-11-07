/**
 * Data Extractor
 * Uses LLM (Gemini or GitHub Models) to extract and format specific data from API responses
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { invokeGitHubModel, isGitHubModel } from './github-models';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Cache model instances to avoid re-initialization overhead
const modelCache = new Map<string, ChatGoogleGenerativeAI>();

function getModel(modelName: string): ChatGoogleGenerativeAI {
  if (!modelCache.has(modelName)) {
    modelCache.set(modelName, new ChatGoogleGenerativeAI({
      modelName: modelName,
      temperature: 0.1,
      apiKey: GEMINI_API_KEY,
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
  // Check if this is a GitHub Model
  if (isGitHubModel(modelName)) {
    return extractDataWithGitHubModel(userQuery, apiData, apiName, modelName);
  }

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
 * Extract data with GitHub Models
 */
async function extractDataWithGitHubModel(
  userQuery: string,
  apiData: any,
  apiName: string,
  modelName: string
): Promise<ExtractedData> {
  try {
    // Optimize prompt - shorter and more direct for faster processing
    // Truncate large API data to avoid token bloat
    const dataStr = JSON.stringify(apiData);
    const maxDataLength = 2000; // Limit data size to avoid huge prompts
    const truncatedData = dataStr.length > maxDataLength 
      ? dataStr.substring(0, maxDataLength) + '...[truncated]'
      : dataStr;

    // Use a safer prompt that's less likely to trigger content filters
    const prompt = `User asked: ${userQuery}
API response from ${apiName}:
${truncatedData}

Provide a concise summary answering the user's question. Be factual and direct.`;

    const formattedResponse = await invokeGitHubModel(prompt, modelName);

    // Try to extract structured data if possible
    let extractedData = apiData;
    try {
      // Look for JSON in the response (in case LLM provides structured data)
      const jsonMatch = formattedResponse.match(/\{[\s\S]*\}/);
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
  } catch (error: any) {
    console.error('Error extracting data with GitHub Model:', error);
    
    // If content filter error, try falling back to Gemini if available
    if (error.message?.includes('content filter') || error.message?.includes('content management')) {
      console.log('[Data Extractor] GitHub Model content filter triggered, falling back to Gemini...');
      if (GEMINI_API_KEY) {
        try {
          return await extractDataWithLLM(userQuery, apiData, apiName, 'gemini-2.0-flash-exp');
        } catch (geminiError) {
          console.error('Gemini fallback also failed:', geminiError);
        }
      }
    }
    
    // Fallback to smart formatter instead of raw JSON
    return {
      formattedResponse: formatDataSmart(userQuery, apiData, apiName),
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

/**
 * Smart formatter that extracts relevant data based on API type and query
 * Used when LLM extraction fails but we still want specific output
 */
function formatDataSmart(userQuery: string, apiData: any, apiName: string): string {
  const lowerQuery = userQuery.toLowerCase();
  
  // News API specific formatting
  if (apiName.toLowerCase().includes('news') && apiData.headlines) {
    const headlines = Array.isArray(apiData.headlines) ? apiData.headlines : [];
    if (headlines.length > 0) {
      return headlines.map((item: any, idx: number) => 
        `${idx + 1}. ${item.title || item.headline || 'Untitled'}\n   Source: ${item.source || 'Unknown'}\n   ${item.publishedAt ? `Published: ${new Date(item.publishedAt).toLocaleDateString()}` : ''}`
      ).join('\n\n');
    }
  }
  
  // Weather API specific formatting
  if (apiName.toLowerCase().includes('weather') && apiData.temperature) {
    return `Temperature: ${apiData.temperature}°${apiData.unit || 'F'}\nCondition: ${apiData.condition || 'Unknown'}\nLocation: ${apiData.location || 'Unknown'}`;
  }
  
  // Stocks API specific formatting
  if (apiName.toLowerCase().includes('stock') && apiData.price) {
    return `Stock: ${apiData.symbol || 'Unknown'}\nPrice: $${apiData.price}\nChange: ${apiData.change || '0'}%`;
  }
  
  // If it's an array, show first few items
  if (Array.isArray(apiData)) {
    const items = apiData.slice(0, 5);
    return items.map((item: any, idx: number) => {
      if (typeof item === 'string') return `${idx + 1}. ${item}`;
      if (typeof item === 'object') {
        const keys = Object.keys(item).slice(0, 3);
        return `${idx + 1}. ${keys.map(k => `${k}: ${item[k]}`).join(', ')}`;
      }
      return `${idx + 1}. ${String(item)}`;
    }).join('\n') + (apiData.length > 5 ? `\n\n... and ${apiData.length - 5} more items` : '');
  }
  
  // If it's an object, show key fields
  if (typeof apiData === 'object' && apiData !== null) {
    const keys = Object.keys(apiData).slice(0, 5);
    const relevant = keys.filter(k => {
      const val = apiData[k];
      return val !== null && val !== undefined && 
             (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean');
    });
    
    if (relevant.length > 0) {
      return relevant.map(k => `${k}: ${apiData[k]}`).join('\n');
    }
  }
  
  // Final fallback to JSON
  return JSON.stringify(apiData, null, 2);
}

