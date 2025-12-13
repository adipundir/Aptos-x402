/**
 * Database retry utility for handling transient network errors
 */

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    retryableErrors?: string[];
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryableErrors = ['fetch failed', 'timeout', 'ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT'],
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || error?.toString() || '';
      const isRetryable = retryableErrors.some((retryableError) =>
        errorMessage.toLowerCase().includes(retryableError.toLowerCase())
      );

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
      console.warn(
        `[DB Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${errorMessage}. Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Unknown error');
}



