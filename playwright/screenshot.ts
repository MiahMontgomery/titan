import { chromium } from 'playwright';

export async function takeScreenshot(url: string, outputPath: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.screenshot({ path: outputPath });
    return { success: true, message: `Screenshot saved to ${outputPath}` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Screenshot failed' };
  } finally {
    await browser.close();
  }
} 