import puppeteer from 'puppeteer';
import path from 'path';

export async function loginInstagram(credentials: { username: string; password: string }) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();

    console.log('[Instagram] Navigating to login page...');
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('[Instagram] Waiting for username input...');
    await page.waitForSelector('input[name="username"]', { visible: true, timeout: 20000 });

    console.log('[Instagram] Typing username...');
    await page.type('input[name="username"]', credentials.username, { delay: 50 });

    console.log('[Instagram] Typing password...');
    await page.type('input[name="password"]', credentials.password, { delay: 50 });

    console.log('[Instagram] Clicking login button...');
    await page.click('button[type="submit"]');

    await page.screenshot({ path: 'after-login.png' });
    

    console.log('[Instagram] Waiting for navigation after login...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    // Log the current URL for debugging
    const currentUrl = page.url();
    console.log('[Instagram] Current URL after login:', currentUrl);

    // Check for login error
    console.log('[Instagram] Checking for login error...');
    const error = await page.$eval('#slfErrorAlert, [role="alert"]', el => el.textContent).catch(() => null);
    if (error) {
      console.log('[Instagram] Login error:', error);
      return { success: false, message: error };
    }

    // Check for profile link (most reliable)
    console.log('[Instagram] Checking for profile link...');
    const loggedIn = await page.$(`a[href="/${credentials.username}/"]`);
    if (loggedIn) {
      console.log('[Instagram] Login successful!');
      return { success: true, message: 'Instagram login successful' };
    }

    // Optionally, check for home icon as a backup
    console.log('[Instagram] Checking for home icon...');
    const homeIcon = await page.$('svg[aria-label="Home"]');
    if (homeIcon) {
      console.log('[Instagram] Login successful (home icon)!');
      return { success: true, message: 'Instagram login successful (home icon)' };
    }

    console.log('[Instagram] Login failed: Unknown error');
    return { success: false, message: 'Login failed: Unknown error' };
  } catch (err: any) {
    console.log('[Instagram] Exception:', err);
    return { success: false, message: err.message || 'Instagram login failed' };
  } finally {
    await browser.close();
  }
}

export async function postInstagram(
  content: { caption: string; mediaPath: string },
  credentials: { username: string; password: string }
) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    const iPhone = puppeteer.devices['iPhone X'];
    await page.emulate(iPhone);
    // Login
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('input[name="username"]', { visible: true, timeout: 20000 });
    await page.type('input[name="username"]', credentials.username, { delay: 50 });
    await page.type('input[name="password"]', credentials.password, { delay: 50 });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    // Go to home page
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    // Click the "+" button to create a new post
    await page.waitForSelector('svg[aria-label="New post"], [aria-label="New post"]', { visible: true, timeout: 20000 });
    await page.click('svg[aria-label="New post"], [aria-label="New post"]');
    // Wait for file input and upload media
    const fileInputSelector = 'input[type="file"]';
    await page.waitForSelector(fileInputSelector, { visible: true, timeout: 20000 });
    const inputUploadHandle = await page.$(fileInputSelector);
    if (!inputUploadHandle) throw new Error('File input not found');
    await inputUploadHandle.uploadFile(path.resolve(content.mediaPath));
    // Click Next
    await page.waitForSelector('button', { visible: true, timeout: 20000 });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const nextBtn = btns.find(b => b.textContent && b.textContent.toLowerCase().includes('next'));
      if (nextBtn) (nextBtn as HTMLElement).click();
    });
    // Add caption
    await page.waitForSelector('textarea', { visible: true, timeout: 20000 });
    await page.type('textarea', content.caption, { delay: 50 });
    // Share post
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const shareBtn = btns.find(b => b.textContent && b.textContent.toLowerCase().includes('share'));
      if (shareBtn) (shareBtn as HTMLElement).click();
    });
    // Wait for post to be shared
    await page.waitForTimeout(5000);
    return { success: true, message: 'Instagram post uploaded successfully' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Instagram post failed' };
  } finally {
    await browser.close();
  }
}

export async function sendInstagramDM(
  recipientUsername: string,
  message: string,
  credentials: { username: string; password: string }
) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    const iPhone = puppeteer.devices['iPhone X'];
    await page.emulate(iPhone);
    // Login
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('input[name="username"]', { visible: true, timeout: 20000 });
    await page.type('input[name="username"]', credentials.username, { delay: 50 });
    await page.type('input[name="password"]', credentials.password, { delay: 50 });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    // Go to DM page
    await page.goto(`https://www.instagram.com/direct/new/`, { waitUntil: 'networkidle2', timeout: 30000 });
    // Search for recipient
    await page.waitForSelector('input[name="queryBox"]', { visible: true, timeout: 20000 });
    await page.type('input[name="queryBox"]', recipientUsername, { delay: 50 });
    await page.waitForTimeout(2000);
    // Select user from search results
    await page.waitForSelector('div[role="button"]', { visible: true, timeout: 20000 });
    await page.click('div[role="button"]');
    // Click Next
    await page.waitForSelector('button', { visible: true, timeout: 20000 });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const nextBtn = btns.find(b => b.textContent && b.textContent.toLowerCase().includes('next'));
      if (nextBtn) (nextBtn as HTMLElement).click();
    });
    // Type and send message
    await page.waitForSelector('textarea', { visible: true, timeout: 20000 });
    await page.type('textarea', message, { delay: 50 });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    return { success: true, message: 'DM sent successfully' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to send DM' };
  } finally {
    await browser.close();
  }
}

export async function fetchInstagramInbox(credentials: { username: string; password: string }) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    const iPhone = puppeteer.devices['iPhone X'];
    await page.emulate(iPhone);
    // Login
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('input[name="username"]', { visible: true, timeout: 20000 });
    await page.type('input[name="username"]', credentials.username, { delay: 50 });
    await page.type('input[name="password"]', credentials.password, { delay: 50 });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    // Go to DM inbox
    await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('div[role="dialog"], [aria-label="Direct"]', { visible: true, timeout: 20000 });
    // Get list of conversations
    const dms = await page.evaluate(() => {
      const threads = Array.from(document.querySelectorAll('a[href^="/direct/t/"]'));
      return threads.map((el: any) => ({
        href: el.getAttribute('href'),
        text: el.textContent
      }));
    });
    return dms;
  } catch (err) {
    console.log('[Instagram] Exception:', err);
    return [];
  } finally {
    await browser.close();
  }
}

export async function fetchInstagramEngagement(
  credentials: { username: string; password: string }
) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    const iPhone = puppeteer.devices['iPhone X'];
    await page.emulate(iPhone);
    // Login
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('input[name="username"]', { visible: true, timeout: 20000 });
    await page.type('input[name="username"]', credentials.username, { delay: 50 });
    await page.type('input[name="password"]', credentials.password, { delay: 50 });
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    // Go to profile
    await page.goto(`https://www.instagram.com/${credentials.username}/`, { waitUntil: 'networkidle2', timeout: 30000 });
    // Scrape engagement data (followers, following, posts, etc.)
    const stats = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('header section ul li span'));
      const [posts, followers, following] = spans.map(el => el.textContent);
      return { posts, followers, following };
    });
    return { success: true, stats };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to fetch engagement' };
  } finally {
    await browser.close();
  }
} 