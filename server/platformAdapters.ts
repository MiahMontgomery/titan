// Platform Adapter Interface and Instagram Stub

import { loginInstagram as puppeteerLoginInstagram, postInstagram as puppeteerPostInstagram, fetchInstagramInbox as puppeteerFetchInstagramInbox } from '../puppeteer/instagram';
import { loginInstagram as playwrightLoginInstagram, postInstagram as playwrightPostInstagram, fetchInstagramInbox as playwrightFetchInstagramInbox } from '../playwright/instagram';
import { AUTOMATION_ENGINE } from '../config';

export interface PlatformAdapter {
  login(credentials: any): Promise<{ success: boolean; message: string }>;
  post(content: any, credentials: any): Promise<{ success: boolean; message: string }>;
  fetchInbox(credentials: any): Promise<any[]>;
  sendMessage(recipient: string, message: string, credentials: any): Promise<{ success: boolean; message: string }>;
  fetchEngagement(credentials: any): Promise<any>;
}

class InstagramAdapterPuppeteer implements PlatformAdapter {
  async login(credentials: any) {
    return puppeteerLoginInstagram(credentials);
  }
  async post(content: any, credentials: any) {
    return puppeteerPostInstagram(content, credentials);
  }
  async fetchInbox(credentials: any) {
    return puppeteerFetchInstagramInbox(credentials);
  }
  async sendMessage(recipient: string, message: string, credentials: any) {
    return { success: true, message: 'Stub: Instagram message sent (Puppeteer)' };
  }
  async fetchEngagement(credentials: any) {
    return {};
  }
}

class InstagramAdapterPlaywright implements PlatformAdapter {
  async login(credentials: any) {
    return playwrightLoginInstagram(credentials);
  }
  async post(content: any, credentials: any) {
    return playwrightPostInstagram(content, credentials);
  }
  async fetchInbox(credentials: any) {
    return playwrightFetchInstagramInbox(credentials);
  }
  async sendMessage(recipient: string, message: string, credentials: any) {
    return { success: true, message: 'Stub: Instagram message sent (Playwright)' };
  }
  async fetchEngagement(credentials: any) {
    return {};
  }
}

export function getPlatformAdapter(platform: string): PlatformAdapter | null {
  const engine = AUTOMATION_ENGINE || 'puppeteer';
  switch (platform.toLowerCase()) {
    case 'instagram':
      return engine === 'playwright' ? new InstagramAdapterPlaywright() : new InstagramAdapterPuppeteer();
    // Add more platforms here
    default:
      return null;
  }
} 