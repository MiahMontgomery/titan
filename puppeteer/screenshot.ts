import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOTS_DIR = path.join(__dirname, '../output/screenshots');

interface ScreenshotResult {
  path: string;
  timestamp: string;
  url: string;
  width: number;
  height: number;
}

// Ensure screenshots directory exists
async function ensureScreenshotsDirectory(): Promise<void> {
  try {
    await fs.access(SCREENSHOTS_DIR);
  } catch {
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  }
}

export async function takeScreenshot(url: string): Promise<ScreenshotResult> {
  await ensureScreenshotsDirectory();
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport to a reasonable size
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });
    
    // Navigate to URL with timeout
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `screenshot-${timestamp}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    
    // Take screenshot
    await page.screenshot({
      path: filepath,
      fullPage: true
    });
    
    // Get page dimensions
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight
    }));
    
    return {
      path: filepath,
      timestamp: new Date(timestamp).toISOString(),
      url,
      width: dimensions.width,
      height: dimensions.height
    };
  } finally {
    await browser.close();
  }
}

// Take screenshot of specific element
export async function takeElementScreenshot(
  url: string,
  selector: string
): Promise<ScreenshotResult> {
  await ensureScreenshotsDirectory();
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for element to be visible
    await page.waitForSelector(selector, { visible: true });
    
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    
    // Get element dimensions
    const box = await element.boundingBox();
    if (!box) {
      throw new Error('Could not get element dimensions');
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `element-${timestamp}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    
    // Take screenshot of element
    await element.screenshot({
      path: filepath
    });
    
    return {
      path: filepath,
      timestamp: new Date(timestamp).toISOString(),
      url,
      width: box.width,
      height: box.height
    };
  } finally {
    await browser.close();
  }
} 