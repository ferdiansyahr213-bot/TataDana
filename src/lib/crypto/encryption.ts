import crypto from 'crypto';

// Kunci enkripsi 32-byte (256-bit) untuk AES-256-GCM
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

/**
 * Enkripsi data sensitif (seperti token akses perbankan) menggunakan AES-256-GCM
 */
export function encryptSensitiveToken(text: string): {
  encryptedData: string;
  iv: string;
  authTag: string;
} {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Dekripsi token akses perbankan
 */
export function decryptSensitiveToken(
  encryptedData: string,
  iv: string,
  authTag: string
): string {
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
