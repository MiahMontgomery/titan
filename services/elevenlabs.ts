import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  settings: VoiceSettings;
}

const AUDIO_DIR = path.join(__dirname, '../output/audio');

export class ElevenLabs {
  private apiKey: string;
  private baseUrl: string = 'https://api.elevenlabs.io/v1';
  private defaultVoiceId: string = '21m00Tcm4TlvDq8ikWAM'; // Default voice ID
  
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }
  }
  
  // Ensure audio directory exists
  private async ensureAudioDirectory(): Promise<void> {
    try {
      await fs.access(AUDIO_DIR);
    } catch {
      await fs.mkdir(AUDIO_DIR, { recursive: true });
    }
  }
  
  // Generate speech from text
  async generateSpeech(
    text: string,
    voiceId: string = this.defaultVoiceId,
    settings?: Partial<VoiceSettings>
  ): Promise<string> {
    await this.ensureAudioDirectory();
    
    const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: settings?.stability ?? 0.5,
          similarity_boost: settings?.similarity_boost ?? 0.75,
          style: settings?.style ?? 0.0,
          use_speaker_boost: settings?.use_speaker_boost ?? true
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${error}`);
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `speech-${timestamp}.mp3`;
    const filepath = path.join(AUDIO_DIR, filename);
    
    // Save audio file
    const buffer = await response.buffer();
    await fs.writeFile(filepath, buffer);
    
    return filepath;
  }
  
  // Get available voices
  async getVoices(): Promise<Voice[]> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: {
        'xi-api-key': this.apiKey
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${error}`);
    }
    
    const data = await response.json();
    return data.voices;
  }
  
  // Get voice settings
  async getVoiceSettings(voiceId: string): Promise<VoiceSettings> {
    const response = await fetch(`${this.baseUrl}/voices/${voiceId}/settings`, {
      headers: {
        'xi-api-key': this.apiKey
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${error}`);
    }
    
    return response.json();
  }
  
  // Update voice settings
  async updateVoiceSettings(
    voiceId: string,
    settings: Partial<VoiceSettings>
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/voices/${voiceId}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey
      },
      body: JSON.stringify(settings)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${error}`);
    }
  }
} 