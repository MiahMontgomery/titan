import puppeteer from 'puppeteer';

export async function loginLinkedIn(credentials: { username: string; password: string }) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('input#username', { visible: true, timeout: 20000 });
    await page.type('input#username', credentials.username, { delay: 50 });
    await page.type('input#password', credentials.password, { delay: 50 });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
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