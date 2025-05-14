import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const SECRETS_DIR = path.join(__dirname, '../data/secrets');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-me';

interface Secrets {
  [key: string]: string | Secrets;
}

// Ensure secrets directory exists
async function ensureSecretsDirectory(): Promise<void> {
  try {
    await fs.access(SECRETS_DIR);
  } catch {
    await fs.mkdir(SECRETS_DIR, { recursive: true });
  }
}

// Encrypt data
function encrypt(data: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
}

// Decrypt data
function decrypt(data: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
}

// Save secrets for a project or persona
export async function saveSecrets(
  id: string,
  secrets: Secrets,
  type: 'project' | 'persona'
): Promise<void> {
  await ensureSecretsDirectory();
  const filePath = path.join(SECRETS_DIR, `${type}-${id}.json`);
  const encryptedData = encrypt(JSON.stringify(secrets));
  await fs.writeFile(filePath, encryptedData);
}

// Load secrets for a project or persona
export async function loadSecrets(
  id: string,
  type: 'project' | 'persona'
): Promise<Secrets> {
  await ensureSecretsDirectory();
  const filePath = path.join(SECRETS_DIR, `${type}-${id}.json`);
  
  try {
    const encryptedData = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(decrypt(encryptedData));
  } catch {
    return {};
  }
}

// Delete secrets for a project or persona
export async function deleteSecrets(
  id: string,
  type: 'project' | 'persona'
): Promise<void> {
  const filePath = path.join(SECRETS_DIR, `${type}-${id}.json`);
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore if file doesn't exist
  }
}

// Update specific secret
export async function updateSecret(
  id: string,
  type: 'project' | 'persona',
  key: string,
  value: string
): Promise<void> {
  const secrets = await loadSecrets(id, type);
  secrets[key] = value;
  await saveSecrets(id, secrets, type);
} 