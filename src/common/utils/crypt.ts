import * as crypto from 'crypto';

/**
 * Ported from legacy crypt.ts
 * Uses AES-256-GCM for encryption/decryption
 */

function generateSecretKey4ThisDay(): Buffer {
  const date = new Date();
  const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const salt = process.env.SECRET_KEY_SALT || 'ANPH_SALT';
  const key = crypto.createHash('sha256').update(dateString + salt).digest('hex');
  return Buffer.from(key, 'hex');
}

export function encrypt(text: string): { iv: string; encryptedText: string; authTag: string } {
  try {
    const key = generateSecretKey4ThisDay();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      encryptedText: encrypted,
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    console.error('Error encrypting text:', error);
    throw error;
  }
}

export function decrypt(encryptedData: { iv: string; encryptedText: string; authTag: string }): string {
  try {
    const key = generateSecretKey4ThisDay();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(encryptedData.iv, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Error decrypting text:', error);
    throw error;
  }
}
