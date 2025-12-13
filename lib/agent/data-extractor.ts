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

    const prompt = `User asked: "${userQuery}"
API response from ${apiName}:
${truncatedData}

Format the response as natural, conversational text. Do NOT output raw JSON. Answer the user's question directly with the relevant information formatted nicely. Use bullet points, line breaks, and clear formatting.`;

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

Format the response as natural, conversational text. Do NOT output raw JSON. Answer the user's question directly with the relevant information formatted nicely. Use bullet points, line breaks, and clear formatting. Be factual and direct.`;

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
 * Uses smart formatting to provide readable responses
 */
function formatDataFallback(userQuery: string, apiData: any, apiName: string): string {
  // Try smart formatting first, fall back to JSON only if needed
  const smartFormatted = formatDataSmart(userQuery, apiData, apiName);
  // If smart formatter returned JSON (last resort), use it; otherwise use the formatted version
  if (smartFormatted.startsWith('{') && smartFormatted.includes('"')) {
    return smartFormatted; // Already JSON, return as-is
  }
  return smartFormatted; // Return smart formatted version
}

/**
 * Smart formatter that extracts relevant data based on API type and query
 * Used when LLM extraction fails but we still want specific output
 */
export function formatDataSmart(userQuery: string, apiData: any, apiName: string): string {
  const lowerQuery = userQuery.toLowerCase();
  const lowerApiName = apiName.toLowerCase();
  
  // GitHub API formatting
  if (lowerApiName.includes('github') && apiData.repository) {
    const repo = apiData.repository;
    let result = `📦 **${repo.fullName || repo.name}**\n`;
    if (repo.description) result += `${repo.description}\n\n`;
    result += `⭐ Stars: ${repo.stars || 0}\n`;
    result += `🍴 Forks: ${repo.forks || 0}\n`;
    if (repo.language) result += `💻 Language: ${repo.language}\n`;
    if (repo.owner?.login) result += `👤 Owner: ${repo.owner.login}\n`;
    if (repo.url) result += `🔗 ${repo.url}\n`;
    if (repo.topics && repo.topics.length > 0) {
      result += `\n🏷️ Topics: ${repo.topics.slice(0, 5).join(', ')}`;
    }
    return result;
  }
  
  // Open-Meteo Weather API formatting
  if (lowerApiName.includes('meteo') || (lowerApiName.includes('weather') && apiData.current)) {
    const current = apiData.current;
    const location = apiData.location;
    let result = `🌤️ **Weather Forecast**\n`;
    if (location) {
      result += `📍 Location: ${location.latitude}°N, ${location.longitude}°E`;
      if (location.timezone) result += ` (${location.timezone})`;
      result += `\n\n`;
    }
    if (current) {
      result += `🌡️ Temperature: ${current.temperature}°C`;
      if (current.feelsLike) result += ` (feels like ${current.feelsLike}°C)`;
      result += `\n`;
      if (current.humidity !== undefined) result += `💧 Humidity: ${current.humidity}%\n`;
      if (current.windSpeed !== undefined) result += `💨 Wind Speed: ${current.windSpeed} km/h\n`;
      if (current.precipitation !== undefined) result += `🌧️ Precipitation: ${current.precipitation} mm\n`;
      if (current.time) result += `🕐 Time: ${new Date(current.time).toLocaleString()}\n`;
    }
    if (apiData.hourly && apiData.hourly.length > 0) {
      result += `\n📊 Next 24 hours: ${apiData.hourly.length} hourly forecasts available`;
    }
    return result;
  }
  
  // Hacker News API formatting
  if (lowerApiName.includes('hacker') || lowerApiName.includes('hackernews')) {
    if (apiData.results && Array.isArray(apiData.results)) {
      const results = apiData.results.slice(0, 10);
      let result = `📰 **Hacker News Search Results**\n`;
      if (apiData.query) result += `Query: "${apiData.query}"\n`;
      if (apiData.totalResults) result += `Found ${apiData.totalResults} results\n\n`;
      
      return result + results.map((item: any, idx: number) => {
        const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown date';
        return `${idx + 1}. **${item.title}**\n   👤 ${item.author} | ⭐ ${item.points || 0} points | 💬 ${item.comments || 0} comments\n   🔗 ${item.url}\n   📅 ${date}`;
      }).join('\n\n');
    }
  }
  
  // World Time API formatting
  if (lowerApiName.includes('worldtime') || lowerApiName.includes('time')) {
    let result = `🕐 **Current Time**\n\n`;
    if (apiData.datetime) {
      const date = new Date(apiData.datetime);
      // Format time prominently
      result += `**${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      })}**\n\n`;
      result += `📅 ${date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}\n`;
    }
    if (apiData.timezone) {
      // Format timezone name nicely (e.g., "Asia/Kolkata" -> "Asia/Kolkata (IST)")
      const tzParts = apiData.timezone.split('/');
      const location = tzParts[tzParts.length - 1].replace(/_/g, ' ');
      result += `🌍 ${location}`;
      if (apiData.abbreviation) result += ` (${apiData.abbreviation})`;
      result += `\n`;
    }
    if (apiData.utcOffset) result += `⏰ UTC Offset: ${apiData.utcOffset}\n`;
    return result.trim();
  }
  
  // News API specific formatting
  if (lowerApiName.includes('news') && apiData.headlines) {
    const headlines = Array.isArray(apiData.headlines) ? apiData.headlines : [];
    if (headlines.length > 0) {
      return headlines.map((item: any, idx: number) => 
        `${idx + 1}. ${item.title || item.headline || 'Untitled'}\n   Source: ${item.source || 'Unknown'}\n   ${item.publishedAt ? `Published: ${new Date(item.publishedAt).toLocaleDateString()}` : ''}`
      ).join('\n\n');
    }
  }
  
  // Weather API specific formatting (legacy)
  if (lowerApiName.includes('weather') && apiData.temperature) {
    return `Temperature: ${apiData.temperature}°${apiData.unit || 'F'}\nCondition: ${apiData.condition || 'Unknown'}\nLocation: ${apiData.location || 'Unknown'}`;
  }
  
  // Stocks API specific formatting
  if (lowerApiName.includes('stock') && apiData.price) {
    return `Stock: ${apiData.symbol || 'Unknown'}\nPrice: $${apiData.price}\nChange: ${apiData.change || '0'}%`;
  }
  
  // Exchange Rates API formatting
  if (lowerApiName.includes('exchangerate') || lowerApiName.includes('exchange')) {
    if (apiData.conversion) {
      const conv = apiData.conversion;
      return `💱 **Currency Conversion**\n\n${conv.example}\n\n📊 Rate: 1 ${conv.from} = ${conv.rate} ${conv.to}\n📅 Date: ${apiData.date || 'Latest'}`;
    }
    if (apiData.rates) {
      const topRates = Object.entries(apiData.rates).slice(0, 10);
      return `💱 **Exchange Rates (Base: ${apiData.base})**\n\n${topRates.map(([currency, rate]: [string, any]) => `${currency}: ${rate}`).join('\n')}\n\n📅 Date: ${apiData.date || 'Latest'}`;
    }
  }
  
  // Jokes API formatting
  if (lowerApiName.includes('joke')) {
    if (apiData.jokes && Array.isArray(apiData.jokes)) {
      return apiData.jokes.map((joke: any, idx: number) => 
        `😄 **Joke ${idx + 1}** (${joke.type})\n\n${joke.setup}\n\n${joke.punchline}`
      ).join('\n\n---\n\n');
    }
    if (apiData.setup) {
      return `😄 **${apiData.type || 'Joke'}**\n\n${apiData.setup}\n\n${apiData.punchline}`;
    }
  }
  
  // Quotes API formatting
  if (lowerApiName.includes('quote')) {
    if (apiData.quotes && Array.isArray(apiData.quotes)) {
      return apiData.quotes.map((quote: any, idx: number) => 
        `💬 "${quote.content}"\n\n— ${quote.author}${quote.tags && quote.tags.length > 0 ? `\n🏷️ ${quote.tags.join(', ')}` : ''}`
      ).join('\n\n---\n\n');
    }
    if (apiData.content) {
      return `💬 "${apiData.content}"\n\n— ${apiData.author}`;
    }
  }
  
  // Dictionary API formatting
  if (lowerApiName.includes('dictionary') || lowerApiName.includes('dictionary')) {
    if (apiData.meanings && apiData.meanings.length > 0) {
      let result = `📖 **${apiData.word}**`;
      if (apiData.phonetic) result += ` (${apiData.phonetic})`;
      result += `\n\n`;
      
      apiData.meanings.forEach((meaning: any, idx: number) => {
        result += `**${meaning.partOfSpeech}**\n`;
        meaning.definitions.slice(0, 3).forEach((def: any, defIdx: number) => {
          result += `${defIdx + 1}. ${def.definition}\n`;
          if (def.example) result += `   Example: "${def.example}"\n`;
        });
        if (meaning.synonyms && meaning.synonyms.length > 0) {
          result += `   Synonyms: ${meaning.synonyms.slice(0, 5).join(', ')}\n`;
        }
        result += `\n`;
      });
      
      return result.trim();
    }
  }
  
  // IP Geolocation API formatting
  if (lowerApiName.includes('ipgeolocation') || lowerApiName.includes('ip')) {
    if (apiData.city) {
      return `🌍 **IP Geolocation**\n\n📍 Location: ${apiData.city}, ${apiData.region}, ${apiData.country}\n🌐 IP: ${apiData.ip}\n📮 Postal: ${apiData.postal || 'N/A'}\n🕐 Timezone: ${apiData.timezone || 'N/A'}\n💻 ISP: ${apiData.isp || 'N/A'}\n💱 Currency: ${apiData.currency || 'N/A'} (${apiData.currencyName || 'N/A'})`;
    }
  }
  
  // Public Holidays API formatting
  if (lowerApiName.includes('holiday')) {
    if (apiData.holidays && Array.isArray(apiData.holidays)) {
      const upcoming = apiData.holidays.filter((h: any) => new Date(h.date) >= new Date()).slice(0, 10);
      let result = `🎉 **Public Holidays - ${apiData.country} (${apiData.year})**\n\n`;
      result += `Total: ${apiData.count} holidays\n\n`;
      result += `**Upcoming Holidays:**\n\n`;
      result += upcoming.map((h: any) => 
        `📅 ${new Date(h.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${h.name}${h.localName && h.localName !== h.name ? ` (${h.localName})` : ''}`
      ).join('\n');
      return result;
    }
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
  
  // If it's an object, show key fields (skip _raw and internal fields)
  if (typeof apiData === 'object' && apiData !== null) {
    const keys = Object.keys(apiData).filter(k => !k.startsWith('_'));
    const relevant = keys.slice(0, 8).filter(k => {
      const val = apiData[k];
      return val !== null && val !== undefined && 
             (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean');
    });
    
    if (relevant.length > 0) {
      return relevant.map(k => {
        const val = apiData[k];
        if (typeof val === 'string' && val.length > 100) {
          return `${k}: ${val.substring(0, 100)}...`;
        }
        return `${k}: ${val}`;
      }).join('\n');
    }
  }
  
  // Final fallback to JSON (but try to keep it minimal)
  const jsonStr = JSON.stringify(apiData, null, 2);
  if (jsonStr.length > 1000) {
    return jsonStr.substring(0, 1000) + '\n\n... (truncated)';
  }
  return jsonStr;
}

