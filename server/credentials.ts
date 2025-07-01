import crypto from 'crypto';
import { z } from 'zod';
import { loginInstagram as puppeteerLoginInstagram } from '../puppeteer/instagram';
import { loginInstagram as playwrightLoginInstagram } from '../playwright/instagram';
import { loginLinkedIn as puppeteerLoginLinkedIn } from '../puppeteer/linkedin';
import { loginLinkedIn as playwrightLoginLinkedIn } from '../playwright/linkedin';
import { AUTOMATION_ENGINE } from '../config';

// Encryption key - in production, this should be stored securely
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!';
const ALGORITHM = 'aes-256-cbc';

export interface CredentialTestResult {
  success: boolean;
  message: string;
  details?: any;
}

export class CredentialsService {
  private static instance: CredentialsService;

  static getInstance(): CredentialsService {
    if (!CredentialsService.instance) {
      CredentialsService.instance = new CredentialsService();
    }
    return CredentialsService.instance;
  }

  encryptCredentials(credentials: Record<string, any>): string {
    const jsonString = JSON.stringify(credentials);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  decryptCredentials(encryptedData: string): Record<string, any> {
    try {
      // Handle case where data might already be decrypted
      if (typeof encryptedData === 'object') {
        return encryptedData;
      }
      
      // Handle case where data is null or undefined
      if (!encryptedData || typeof encryptedData !== 'string') {
        return {};
      }
      
      const [ivHex, encrypted] = encryptedData.split(':');
      
      // Validate the format
      if (!ivHex || !encrypted) {
        console.warn('Invalid encrypted data format, returning empty object');
        return {};
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt credentials:', error);
      return {};
    }
  }

  async testCredentials(platform: string, credentials: Record<string, any>): Promise<CredentialTestResult> {
    try {
      switch (platform.toLowerCase()) {
        case 'twitter':
        case 'twitter/x':
          return await this.testTwitterCredentials(credentials);
        case 'instagram':
          return await this.testInstagramCredentials(credentials);
        case 'linkedin':
          return await this.testLinkedInCredentials(credentials);
        case 'openai':
        case 'openai/openrouter':
          return await this.testOpenAICredentials(credentials);
        case 'elevenlabs':
          return await this.testElevenLabsCredentials(credentials);
        case 'stripe':
          return await this.testStripeCredentials(credentials);
        default:
          return {
            success: false,
            message: `Unknown platform: ${platform}`
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testTwitterCredentials(credentials: Record<string, any>): Promise<CredentialTestResult> {
    const required = ['api_key', 'api_secret', 'access_token', 'access_token_secret'];
    const missing = required.filter(field => !credentials[field]);
    
    if (missing.length > 0) {
      return {
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      };
    }

    try {
      // TODO: Implement actual Twitter API test
      // For now, just validate format
      const isValidFormat = Object.values(credentials).every(value => 
        typeof value === 'string' && value.length > 0
      );

      return {
        success: isValidFormat,
        message: isValidFormat ? 'Credentials format is valid' : 'Invalid credential format'
      };
    } catch (error) {
      return {
        success: false,
        message: `Twitter API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testInstagramCredentials(credentials: Record<string, any>): Promise<CredentialTestResult> {
    const required = ['username', 'password'];
    const missing = required.filter(field => !credentials[field]);
    if (missing.length > 0) {
      return {
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      };
    }
    try {
      if ((AUTOMATION_ENGINE || 'puppeteer') === 'playwright') {
        const { username, password } = credentials;
        const result = await playwrightLoginInstagram({ username, password });
        return result;
      } else {
        const { username, password } = credentials;
        const result = await puppeteerLoginInstagram({ username, password });
        return result;
      }
    } catch (error) {
      return {
        success: false,
        message: `Instagram API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testLinkedInCredentials(credentials: Record<string, any>): Promise<CredentialTestResult> {
    const required = ['client_id', 'client_secret', 'access_token', 'username', 'password'];
    const missing = required.filter(field => !credentials[field]);
    if (missing.length > 0) {
      return {
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      };
    }
    try {
      if ((AUTOMATION_ENGINE || 'puppeteer') === 'playwright') {
        const { username, password } = credentials;
        const result = await playwrightLoginLinkedIn({ username, password });
        return result;
      } else {
        const { username, password } = credentials;
        const result = await puppeteerLoginLinkedIn({ username, password });
        return result;
      }
    } catch (error) {
      return {
        success: false,
        message: `LinkedIn API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testOpenAICredentials(credentials: Record<string, any>): Promise<CredentialTestResult> {
    if (!credentials.api_key) {
      return {
        success: false,
        message: 'Missing API key'
      };
    }

    try {
      // Test OpenAI API with a simple request
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${credentials.api_key}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return {
          success: true,
          message: 'OpenAI API credentials are valid',
          details: { model: credentials.model || 'gpt-4-turbo' }
        };
      } else {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          message: `OpenAI API error: ${error.error?.message || response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `OpenAI API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testElevenLabsCredentials(credentials: Record<string, any>): Promise<CredentialTestResult> {
    if (!credentials.api_key) {
      return {
        success: false,
        message: 'Missing API key'
      };
    }

    try {
      // Test ElevenLabs API
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': credentials.api_key,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return {
          success: true,
          message: 'ElevenLabs API credentials are valid'
        };
      } else {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          message: `ElevenLabs API error: ${error.detail?.message || response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `ElevenLabs API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testStripeCredentials(credentials: Record<string, any>): Promise<CredentialTestResult> {
    const required = ['publishable_key', 'secret_key'];
    const missing = required.filter(field => !credentials[field]);
    
    if (missing.length > 0) {
      return {
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      };
    }

    try {
      // Test Stripe API with a simple request
      const response = await fetch('https://api.stripe.com/v1/account', {
        headers: {
          'Authorization': `Bearer ${credentials.secret_key}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Stripe API credentials are valid'
        };
      } else {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          message: `Stripe API error: ${error.error?.message || response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Stripe API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const credentialsService = CredentialsService.getInstance(); 