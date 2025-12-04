/**
 * Encryption Utilities
 * AES-256-GCM encryption for secure private key storage
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required for secure key storage');
  }
  // Key should be 32 bytes (64 hex characters)
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: openssl rand -hex 32');
  }
  return Buffer.from(key, 'hex');
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

/**
 * Encrypt a private key for secure storage
 */
export function encryptPrivateKey(privateKey: string): EncryptedData {
  const encryptionKey = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypt a private key (only when needed for API calls)
 */
export function decryptPrivateKey(
  encrypted: string,
  iv: string,
  tag: string
): string {
  const encryptionKey = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    encryptionKey,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a random encryption key (for initial setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
