import { chromium, devices } from 'playwright';

export async function loginLinkedIn(credentials: { username: string; password: string }) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ ...devices['iPhone X'] });
    const page = await context.newPage();
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle' });
    await page.waitForSelector('input#username', { state: 'visible', timeout: 20000 });
    await page.fill('input#username', credentials.username);
    await page.fill('input#password', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });
    // Check for login error
    const error = await page.$eval('.alert.error', el => el.textContent).catch(() => null);
    if (error) {
      return { success: false, message: error };
    }
    // Check if logged in by looking for the profile icon
    const loggedIn = await page.$('img.global-nav__me-photo');
    if (loggedIn) {
      return { success: true, message: 'LinkedIn login successful' };
    }
    return { success: false, message: 'Login failed: Unknown error' };
  } catch (err: any) {
    return { success: false, message: err.message || 'LinkedIn login failed' };
  } finally {
    await browser.close();
  }
} 