/**
 * GitHub Models Client
 * Uses OpenAI SDK to interact with GitHub Models API
 */

import OpenAI from 'openai';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_MODELS_ENDPOINT = 'https://models.github.ai/inference';

if (!GITHUB_TOKEN) {
  console.warn('⚠️  GITHUB_TOKEN not set. GitHub Models will not be available.');
}

// Cache client instances to avoid re-initialization overhead
const clientCache = new Map<string, OpenAI>();

function getGitHubClient(): OpenAI | null {
  if (!GITHUB_TOKEN) {
    return null;
  }

  if (!clientCache.has('default')) {
    clientCache.set('default', new OpenAI({
      baseURL: GITHUB_MODELS_ENDPOINT,
      apiKey: GITHUB_TOKEN,
    }));
  }
  return clientCache.get('default')!;
}

/**
 * Map model IDs to GitHub Models API model names
 */
export function getGitHubModelName(modelId: string): string {
  const modelMap: Record<string, string> = {
    'gpt-5-mini': 'openai/gpt-5-mini',
    'gpt-5-nano': 'openai/gpt-5-nano',
    'grok-3-mini': 'xai/grok-3-mini',
    'gpt-4.1-mini': 'openai/gpt-4.1-mini',
    'gpt-4.1-nano': 'openai/gpt-4.1-nano',
    'phi-4-mini-reasoning': 'microsoft/phi-4-mini-reasoning',
    'o4-mini': 'openai/o4-mini',
  };
  
  return modelMap[modelId] || modelId;
}

/**
 * Check if a model ID is a GitHub Model
 */
export function isGitHubModel(modelId: string): boolean {
  return modelId.startsWith('gpt-5') || 
         modelId.startsWith('grok-3') ||
         modelId.startsWith('gpt-4.1') ||
         modelId.startsWith('phi-4') ||
         modelId.startsWith('o4-mini');
}

/**
 * Invoke GitHub Model with a prompt
 */
export async function invokeGitHubModel(
  prompt: string,
  modelId: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const client = getGitHubClient();
  if (!client) {
    throw new Error('GitHub Models not configured. GITHUB_TOKEN is required.');
  }

  const modelName = getGitHubModelName(modelId);
  
  try {
    // GitHub Models (especially GPT-5-mini) only support default temperature (1)
    // Don't set temperature parameter - let it use the default
    const requestParams: any = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };
    
    // Only add max_tokens if specified
    if (options?.maxTokens) {
      requestParams.max_tokens = options.maxTokens;
    }

    const response = await client.chat.completions.create(requestParams);

    return response.choices[0]?.message?.content || '';
  } catch (error: any) {
    console.error('Error invoking GitHub Model:', error);
    throw new Error(`GitHub Model error: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Invoke GitHub Model with messages array (for chat completions)
 */
export async function invokeGitHubModelChat(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  modelId: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const client = getGitHubClient();
  if (!client) {
    throw new Error('GitHub Models not configured. GITHUB_TOKEN is required.');
  }

  const modelName = getGitHubModelName(modelId);
  
  try {
    // GitHub Models (especially GPT-5-mini) only support default temperature (1)
    // Don't set temperature parameter - let it use the default
    const requestParams: any = {
      model: modelName,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    };
    
    // Only add max_tokens if specified
    if (options?.maxTokens) {
      requestParams.max_tokens = options.maxTokens;
    }

    const response = await client.chat.completions.create(requestParams);

    return response.choices[0]?.message?.content || '';
  } catch (error: any) {
    console.error('Error invoking GitHub Model chat:', error);
    throw new Error(`GitHub Model error: ${error.message || 'Unknown error'}`);
  }
}

