// This file mirrors puppeteer/instagram.ts but uses Playwright instead of Puppeteer
import { chromium, devices } from 'playwright';
import * as fs from 'fs';
import { randomInt } from 'crypto';
import { createCanvas } from 'canvas';
import * as path from 'path';
import  ProxyChain  from 'proxy-chain'

const ACCOUNT_STATE = new Map<string, {
  lastRun: number;
  device: string;
  userAgent: string;
  ipAddress: string;
  sessionAge: number;
}>();

const DEVICE_AGENTS = {
  'iPhone 13 Pro': [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
  ],
  'iPhone 12 Pro': [
    'Mozilla/5.0 (iPhone13,2; U; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/602.1',
    'Mozilla/5.0 (iPhone12,1; U; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/602.1'
  ],
  'Pixel 5': [
    'Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
  ],
  'Galaxy S21 Ultra': [
    'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
  ]
};

// Residential proxy management
const PROXY_SERVER = process.env.RESIDENTIAL_PROXY || 'http://user:pass@proxy-ip:port';
const proxyCache = new Map<string, string>();

export async function loginInstagram(credentials: { username: string; password: string }) {
  
}

export async function postInstagram(
  content: { caption: string; mediaPath: string },
  credentials: { username: string; password: string }
) {

}

export async function sendInstagramDM(
  recipientUsername: string,
  message: string,
  credentials: { username: string; password: string }
) {
}

export async function fetchInstagramInbox(credentials: { username: string; password: string }) {
  // --- 1. Load and check account state ---
  let accountState = loadAccountState(credentials.username);

  // Enforce cooldown with jitter
  const hoursSinceLastRun = (Date.now() - accountState.lastRun) / (1000 * 60 * 60);
  const cooldownJitter = randomInt(-2, 2);
  if (hoursSinceLastRun < 22 + cooldownJitter) {
    console.log(`Account ${credentials.username} is in cooldown. Skipping.`);
    //return [];
  }

  // --- 2. Device and proxy rotation ---
  const deviceProfiles = [
    'iPhone 13 Pro',
    'iPhone 12 Pro',
    'Pixel 5',
    'Galaxy S21 Ultra'
  ];
  let randomDevice = accountState.device || deviceProfiles[randomInt(0, deviceProfiles.length - 1)];
  let randomUserAgent = DEVICE_AGENTS[randomDevice as keyof typeof DEVICE_AGENTS][randomInt(0, DEVICE_AGENTS[randomDevice as keyof typeof DEVICE_AGENTS].length - 1)];

  let proxyServer = accountState.ipAddress || PROXY_SERVER;
  let useProxy = process.env.USE_PROXY === 'true';
  if (useProxy) {
    if (!accountState.ipAddress || accountState.sessionAge >= 3) {
      proxyServer = await getResidentialProxy();
      accountState.sessionAge = 0;
    }
  }

  // --- 3. Update and persist state before browser launch ---
  accountState = updateAccountState(credentials.username, {
    device: randomDevice,
    userAgent: randomUserAgent,
    ipAddress: proxyServer,
    sessionAge: (accountState.sessionAge || 0) + 1
  });

  // --- 4. Setup browser context ---
  const userDataDir = `./user-data-${credentials.username}`;
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');
  ctx.fillText('Playwright', 10, 10);
  const canvasFingerprint = canvas.toDataURL();

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,  // Run headless in production
    ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=IdleDetection'],
    args: [
      ...(useProxy ? [`--proxy-server=${proxyServer}`] : []),
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--no-first-run',
      '--password-store=basic',
      '--use-mock-keychain',
      '--disable-popup-blocking',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-sync',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-webgl',
      '--disable-threaded-animation',
      '--disable-threaded-scrolling',
      '--disable-partial-raster',
      '--disable-features=site-per-process',
    ],
    slowMo: randomInt(100, 300),
    ...devices[randomDevice],
    userAgent: randomUserAgent,
    viewport: { width: 390, height: 844 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    permissions: [],
    timeout: 60000,
    ...(useProxy ? {
      proxy: {
        server: proxyServer,
        username: process.env.PROXY_USER,
        password: process.env.PROXY_PASS
      }
    } : {})
  });

  let page: any;
  try {
    // --- 5. Stealth and warm-up ---
    await context.addInitScript(({ canvasFingerprint }) => {
      // ===== CRITICAL IMPROVEMENTS =====
      
      // 1. Remove unnecessary top-level deletions
      // delete window.chrome is redundant since we're properly defining navigator.chrome
      
      // 2. Enhanced navigator.chrome implementation
      Object.defineProperty(navigator, 'chrome', {
        value: {
          app: {
            isInstalled: false,
            InstallState: {
              DISABLED: 'disabled',
              INSTALLED: 'installed',
              NOT_INSTALLED: 'not_installed'
            },
            RunningState: {
              RUNNING: 'running',
              STOPPED: 'stopped'
            }
          },
          webstore: {
            onInstallStageChanged: {},
            onDownloadProgress: {}
          },
          runtime: {
            OnInstalledReason: {
              INSTALL: 'install',
              UPDATE: 'update'
            },
            OnRestartRequiredReason: {
              APP_UPDATE: 'app_update',
              OS_UPDATE: 'os_update'
            },
            PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux' },
            PlatformArch: { ARM: 'arm', ARM64: 'arm64', X86_32: 'x86-32', X86_64: 'x86-64' },
            RequestUpdateCheckStatus: { 
              THROTTLED: 'throttled',
              NO_UPDATE: 'no_update',
              UPDATE_AVAILABLE: 'update_available'
            },
            connect: function() {},
            sendMessage: function() {}
          },
          csi: function() {
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav && 'startTime' in nav && 'loadEventEnd' in nav) {
              return {
                startE: nav.startTime || Date.now(),
                onloadT: nav.loadEventEnd || Date.now()
              };
            }
            return { startE: Date.now(), onloadT: Date.now() };
          },
          loadTimes: function() {
            const nav = performance.getEntriesByType('navigation')[0];
            // Use type guard for PerformanceNavigationTiming
            if (nav && typeof nav === 'object') {
              const n = nav as PerformanceNavigationTiming;
              return {
                requestTime: n.requestStart || Date.now(),
                startLoadTime: n.startTime || Date.now(),
                commitLoadTime: n.responseStart || Date.now(),
                finishDocumentLoadTime: n.domComplete || Date.now(),
                finishLoadTime: n.loadEventEnd || Date.now(),
                firstPaintTime: n.domInteractive || Date.now(),
                firstPaintAfterLoadTime: 0,
                navigationType: n.type === 'reload' ? 'Reload' : 'Navigate',
                npnNegotiatedProtocol: 'h2',
                connectionInfo: 'h2',
                wasAlternateProtocolAvailable: false,
                wasFetchedViaSpdy: true,
                wasNpnNegotiated: true
              };
            }
            const now = Date.now();
            return {
              requestTime: now,
              startLoadTime: now,
              commitLoadTime: now,
              finishDocumentLoadTime: now,
              finishLoadTime: now,
              firstPaintTime: now,
              firstPaintAfterLoadTime: 0,
              navigationType: 'Navigate',
              npnNegotiatedProtocol: 'h2',
              connectionInfo: 'h2',
              wasAlternateProtocolAvailable: false,
              wasFetchedViaSpdy: true,
              wasNpnNegotiated: true
            };
          }
        },
        writable: false,
        configurable: false,
        enumerable: true
      });
    
      // 3. WebRTC blocking with graceful fallback
      try {
        Object.defineProperty(window, 'RTCPeerConnection', { value: undefined });
        Object.defineProperty(window, 'webkitRTCPeerConnection', { value: undefined });
        Object.defineProperty(window, 'mozRTCPeerConnection', { value: undefined });
      } catch (e) {}
    
      // 4. Optimized timezone spoofing
      const originalDateTimeFormat = Intl.DateTimeFormat;
      function PatchedDateTimeFormat(locales: any, options: any) {
        try {
          if (typeof options === 'object' && options.timeZone === undefined) {
            options = {...options, timeZone: 'America/New_York'};
          }
          return new originalDateTimeFormat(locales, options);
        } catch (e) {
          return new originalDateTimeFormat(locales);
        }
      }
      PatchedDateTimeFormat.prototype = originalDateTimeFormat.prototype;
      (window as any).Intl.DateTimeFormat = PatchedDateTimeFormat;
    
      // ===== STEALTH ENHANCEMENTS =====
      
      // 5. Webdriver removal with multiple methods
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        set: () => {},
        configurable: true
      });
      //try { delete (navigator as any).webdriver; } catch (e) {}
      
      // 6. Plugin and language spoofing
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chromium PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ],
        configurable: false,
        enumerable: true
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: false,
        enumerable: true
      });
      
      // 7. Hardware spoofing
      const hardwareProps = {
        deviceMemory: 4,
        hardwareConcurrency: 4,
        maxTouchPoints: 5,
        doNotTrack: '1',
        userAgent: navigator.userAgent.replace(/HeadlessChrome\//, 'Chrome/')
      };
      
      Object.entries(hardwareProps).forEach(([key, value]) => {
        Object.defineProperty(navigator, key, { 
          value,
          configurable: false,
          enumerable: true
        });
      });
    
      // 8. Connection spoofing
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: ['4g', '3g'][Math.floor(Math.random() * 2)],
          saveData: false,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          // Mobile-specific properties
          downlinkMax: 25,
          type: ['wifi', 'cellular'][Math.floor(Math.random() * 2)],
          // Add realistic variability
          get downlink() {
            return 10 + Math.random() * 8;
          },
          get rtt() {
            return 50 + Math.random() * 150;
          }
        }),
        configurable: false,
        enumerable: true
      });
      
      // ===== CANVAS FINGERPRINT PROTECTION =====
      
      // 9. Optimized canvas spoofing
      const getContextHandler = {
        apply: function(target: any, thisArg: any, args: any[]) {
          const [type] = args;
          if (type === '2d') {
            const ctx = target.apply(thisArg, args);
            if (ctx) {
              // Preserve functionality but randomize output slightly
              const originalFillText = ctx.fillText;
              ctx.fillText = function(...args: any[]) {
                // Add minor randomization to text rendering
                args[0] = args[0] + String.fromCharCode(0x200B);
                return originalFillText.apply(this, args);
              };
            }
            return ctx;
          }
          return target.apply(thisArg, args);
        }
      };
      
      HTMLCanvasElement.prototype.getContext = new Proxy(
        HTMLCanvasElement.prototype.getContext, 
        getContextHandler
      );
      
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
        if (type === 'image/png' || !type) {
          return canvasFingerprint;
        }
        return originalToDataURL.call(this, type, quality);
      };
    
      // 10. Permission handling
      const originalPermissionsQuery = navigator.permissions.query;
      navigator.permissions.query = (parameters) => {
        if (parameters.name === 'notifications') {
          // Return a Proxy that mimics PermissionStatus
          const permissionStatus = {
            state: 'denied',
            onchange: null,
            name: 'notifications',
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false
          };
          return Promise.resolve(new Proxy(permissionStatus as any, {
            get(target, prop) {
              if (prop === 'addEventListener' || prop === 'removeEventListener' || prop === 'dispatchEvent') {
                return () => {};
              }
              return target[prop];
            }
          }));
        }
        return originalPermissionsQuery(parameters);
      };
    }, { canvasFingerprint });
    page = await context.newPage();
    await warmUpAccount(page);
    await handleAllPopups(page);
    await context.grantPermissions([], { origin: 'https://www.instagram.com' });
    await page.setExtraHTTPHeaders({
      'accept-language': 'en-US,en;q=0.9',
      'upgrade-insecure-requests': '1',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-user': '?1',
      'sec-fetch-dest': 'document'
    });
    await page.route('**/*', (route: any) => {
      const type = route.request().resourceType();
      if (['font', 'media'].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });
    await randomSleep(2000, 5000);
    await simulateHumanNavigation(page);

    // --- 6. Inbox navigation and scraping ---
    await loadInboxWithRetry(page, credentials);
    await handleAllPopups(page);
    await waitForInbox(page);
    await simulateHumanInteraction(page);
    await ensureThreadsLoaded(page);
    await scrollMessageList(page);
    await page.screenshot({ path: 'inbox-state.png' });
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('inbox-html.html', bodyHtml);
    console.log('Saved inbox HTML for inspection');
    const dms = await scrapeThreads(page);
    console.log(`Found ${dms.length} threads`);
    dms.forEach((dm: any, i: number) => {
      console.log(`Thread ${i + 1}:`, {
        href: dm.href,
        username: dm.username,
        preview: dm.preview
      });
      if (i < 3) console.log('Sample HTML:', dm.raw);
    });
    await simulatePostScrapingBehavior(page);
    // --- 7. Update cooldown tracker ---
    updateAccountState(credentials.username, { lastRun: Date.now() });
    return dms;
  } catch (err: unknown) {
    console.error('Operation failed:', (err as Error).message);
    await saveDebugInfo(page, credentials.username);
    if ((err as Error).message.includes('suspended') || 
        (err as Error).message.includes('challenge') ||
        (err as Error).message.includes('unusual') ||
        (err as Error).message.includes('blocked')) {
      updateAccountState(credentials.username, { lastRun: Date.now() + 24 * 60 * 60 * 1000 });
    }
    return [];
  } finally {
    try {
      await context.close();
    } catch (e) {
      console.error('Context close error:', e);
    }
    updateAccountState(credentials.username, { lastRun: Date.now() });
  }
}

// Enhanced stealth login with human-like patterns
async function enhancedStealthLogin(page: any, credentials: { username: string; password: string }) {
  // Navigate to login
  await page.goto(`https://www.instagram.com/accounts/login/?source=auth_switcher&t=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Wait for login form
  await page.waitForSelector('input[name="username"], input[name="email"]', { 
    state: 'visible', 
    timeout: 30000 
  });

  // Type username with human-like patterns
  const usernameField = await page.$('input[name="username"], input[name="email"]');
  await usernameField.click({ delay: randomInt(50, 150) });
  
  for (const char of credentials.username) {
    await page.keyboard.type(char, { delay: randomInt(60, 180) });
    if (Math.random() > 0.7) {
      // Simulate typing mistakes
      if (Math.random() > 0.9) {
        await page.keyboard.press('Backspace', { delay: randomInt(50, 150) });
        await randomSleep(100, 300);
        await page.keyboard.type(char, { delay: randomInt(70, 200) });
      }
      await randomSleep(50, 200);
    }
  }

  await randomSleep(500, 1500);
  
  // Type password with human-like patterns
  const passwordField = await page.$('input[name="password"]');
  await passwordField.click({ delay: randomInt(50, 150) });
  
  for (const char of credentials.password) {
    await page.keyboard.type(char, { delay: randomInt(70, 200) });
    if (Math.random() > 0.8) await randomSleep(30, 150);
  }

  await randomSleep(800, 2000);

  // Human-like mouse movement to submit button
  const loginButton = await page.$('[role="button"][aria-label="Log in"], button[type="submit"]');
  const btnBox = await loginButton.boundingBox();
  
  if (btnBox) {
    // Simulate natural mouse movement
    const startX = randomInt(50, 200);
    const startY = randomInt(400, 500);
    
    // Move to random position first
    await page.mouse.move(
      startX,
      startY,
      { steps: randomInt(5, 10) }
    );
    await randomSleep(200, 600);
    
    // Move to button with curved path
    const controlX = (btnBox.x + startX) / 2 + randomInt(-50, 50);
    const controlY = (btnBox.y + startY) / 2 + randomInt(-30, 30);
    
    for (let t = 0; t <= 1; t += 0.1) {
      const x = (1 - t) ** 2 * startX + 2 * (1 - t) * t * controlX + t ** 2 * btnBox.x;
      const y = (1 - t) ** 2 * startY + 2 * (1 - t) * t * controlY + t ** 2 * btnBox.y;
      await page.mouse.move(x, y);
      await randomSleep(20, 50);
    }
    
    // Final adjustment
    await page.mouse.move(
      btnBox.x + btnBox.width / 2,
      btnBox.y + btnBox.height / 2,
      { steps: randomInt(3, 7) }
    );
    await randomSleep(200, 500);
    
    // Human-like click
    await page.mouse.down();
    await randomSleep(50, 150);
    await page.mouse.up();
    await randomSleep(30, 100);
  } else {
    await loginButton.click({ delay: randomInt(100, 300) });
  }

  // Wait for login with multiple success conditions
  await Promise.race([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
    page.waitForSelector('[aria-label="Home"]', { timeout: 30000 }),
    page.waitForSelector('[aria-label="Direct"]', { timeout: 30000 }),
    page.waitForSelector('input[name="verificationCode"]', { timeout: 15000 })
  ]);

  // Check for security challenges
  await handleSecurityChallenges(page);

  // Add post-login delay
  await randomSleep(2000, 5000);
}

// Handle all types of popups and modals
async function handleAllPopups(page: any) {
  try {
    // Notification modal
    const notifModal = 'div[role="dialog"]:has-text("Turn On Notifications")';
    const notNowButton = 'button:has-text("Not Now")';
    
    if (await page.isVisible(notifModal)) {
      console.log('Notification modal detected - dismissing');
      
      if (await page.isVisible(notNowButton)) {
        await page.click(notNowButton, { delay: randomInt(100, 300) });
        console.log('Clicked "Not Now" on notification modal');
        await randomSleep(1000, 2000);
      } else {
        console.log('Using alternative modal dismissal');
        await page.keyboard.press('Escape');
        await page.mouse.click(10, 10, { delay: randomInt(50, 150) });
      }
    }
    
    // "Save Login Info" prompt
    const saveLoginModal = 'div[role="dialog"]:has-text("Save Your Login Info")';
    const saveLoginButton = 'button:has-text("Save"), button:has-text("Not Now")';
    
    if (await page.isVisible(saveLoginModal)) {
      console.log('Save login info modal detected');
      
      if (await page.isVisible(saveLoginButton)) {
        await page.click(saveLoginButton, { delay: randomInt(100, 300) });
        console.log('Clicked save login button');
        await randomSleep(1000, 2000);
      } else {
        await page.keyboard.press('Escape');
      }
    }
    
    // "Get App" banner
    const getAppBanner = 'div[role="dialog"]:has-text("Get App")';
    const closeButton = 'button:has-text("Not Now"), button:has-text("Close"), svg[aria-label="Close"]';
    
    if (await page.isVisible(getAppBanner)) {
      console.log('"Get App" banner detected - closing');
      
      if (await page.isVisible(closeButton)) {
        await page.click(closeButton, { delay: randomInt(100, 300) });
        await randomSleep(1000, 2000);
      } else {
        const viewport = page.viewportSize();
        await page.mouse.click(viewport.width - 20, 20, { delay: randomInt(50, 150) });
      }
    }
    
    // Suspicious activity warning
    if (await page.isVisible('text="We Suspected an Unusual Login Attempt"')) {
      console.log('Suspicious activity warning detected');
      
      // Try to click "This Was Me"
      if (await page.isVisible('button:has-text("This Was Me")')) {
        await page.click('button:has-text("This Was Me")', { delay: randomInt(200, 500) });
        console.log('Clicked "This Was Me"');
        await randomSleep(3000, 6000);
      }
    }
  } catch (e: unknown) {
    console.log('Popup handling error:', (e as Error).message);
  }
}

// Simulate human-like navigation patterns
async function simulateHumanNavigation(page: any) {
  // Random mouse movements
  for (let i = 0; i < randomInt(3, 7); i++) {
    await page.mouse.move(
      randomInt(50, 300),
      randomInt(50, 500),
      { steps: randomInt(5, 15) }
    );
    await randomSleep(200, 800);
  }
  
  // Random scrolling
  // await page.evaluate(async () => {
  //   function randomInt(min: number, max: number): number {
  //     return Math.floor(Math.random() * (max - min + 1)) + min;
  //   }
  //   await new Promise<void>((resolve) => {
  //     let scrolled = 0;
  //     const maxScroll = randomInt(300, 800);
  //     const interval = setInterval(() => {
  //       window.scrollBy(0, randomInt(30, 100));
  //       scrolled += 50;
  //       if (scrolled >= maxScroll) {
  //         clearInterval(interval);
  //         resolve();
  //       }
  //     }, randomInt(300, 700));
  //   });
  // });
}

// Simulate human interaction before scraping
async function simulateHumanInteraction(page: any) {
  // Random mouse movements
  for (let i = 0; i < randomInt(2, 5); i++) {
    await page.mouse.move(
      randomInt(100, 300),
      randomInt(100, 300),
      { steps: randomInt(3, 8) }
    );
    await randomSleep(300, 800);
  }
  
  // Random clicks on empty space
  for (let i = 0; i < randomInt(1, 3); i++) {
    await page.mouse.click(
      randomInt(50, 300),
      randomInt(50, 200),
      { delay: randomInt(50, 200) }
    );
    await randomSleep(500, 1500);
  }
}

// Simulate post-scraping behavior
async function simulatePostScrapingBehavior(page: any) {
  // Scroll randomly
  // await page.evaluate(() => {
  //   window.scrollBy(0, randomInt(-200, 200));
  // });
  
  // Random delays
  await randomSleep(1000, 3000);
  
  // Move mouse to random position
  await page.mouse.move(
    randomInt(100, 300),
    randomInt(100, 500),
    { steps: randomInt(5, 12) }
  );
  
  // Final random delay
  await randomSleep(500, 2000);
}

// Handle security challenges
async function handleSecurityChallenges(page: any) {
  // 2FA handling
  if (await page.isVisible('input[name="verificationCode"]')) {
    console.log('2FA required - waiting for manual input...');
    try {
      await page.waitForSelector('[aria-label="Direct"]', { 
        state: 'visible', 
        timeout: 240000 // 4 minutes
      });
      console.log('2FA successfully entered');
    } catch (e) {
      console.log('2FA timeout exceeded');
      throw new Error('2FA manual input timeout');
    }
  }
  
  // Suspicious login warning
  if (await page.isVisible('button:has-text("This Was Me")')) {
    console.log('Suspicious login detected - verifying');
    await page.click('button:has-text("This Was Me")', { delay: randomInt(200, 500) });
    await randomSleep(3000, 6000);
  }
  
  // Account verification challenge
  if (await page.isVisible('text="Verify Your Account"')) {
    console.log('Account verification required - manual intervention needed');
    await page.waitForSelector('[aria-label="Direct"]', { 
      state: 'visible', 
      timeout: 300000 // 5 minutes
    });
  }
}

async function randomSleep(min: number, max: number) {
  const duration = randomInt(min, max);
  await new Promise(resolve => setTimeout(resolve, duration));
}

async function saveDebugInfo(page: any, username: string) {
  try {
    // Save screenshot
    await page.screenshot({ path: `error-${username}-${Date.now()}.png` });
    
    // Save HTML
    const html = await page.content();
    fs.writeFileSync(`error-${username}-${Date.now()}.html`, html);
  } catch (e) {
    console.error('Failed to save debug info:', e);
  }
}

async function ensureThreadsLoaded(page: any) {
  console.log('Ensuring threads are loaded...');
  
  try {
    // Try multiple selectors for the thread list container
    const containerFound = await Promise.race([
      page.waitForSelector('div[role="dialog"]', { state: 'visible', timeout: 10000 }),
      page.waitForSelector('[aria-label="Direct"]', { state: 'visible', timeout: 10000 }),
      page.waitForSelector('div[aria-label="Chats"]', { state: 'visible', timeout: 10000 }),
      page.waitForSelector('div[role="presentation"] > div > div > div > div > div', { state: 'visible', timeout: 10000 })
    ]);
    
    if (containerFound) {
      console.log('Thread container found');
    } else {
      console.log('Using fallback thread container detection');
    }
  } catch (e: unknown) {
    console.log('Thread container detection error:', (e as Error).message);
  }

  // Wait for at least 1 thread to be visible using multiple selectors
  try {
    await Promise.race([
      page.waitForSelector('a[href^="/direct/t/"]', { state: 'visible', timeout: 15000 }),
      page.waitForSelector('div[role="listitem"]', { state: 'visible', timeout: 15000 }),
      page.waitForSelector('div[data-testid="message-thread-list-item"]', { state: 'visible', timeout: 15000 })
    ]);
    console.log('At least one thread is visible');
  } catch (e: unknown) {
    console.log('Thread visibility error:', (e as Error).message);
    await page.screenshot({ path: 'threads-error.png' });
  }
}

async function scrollMessageList(page: any) {
  console.log('Scrolling to load all threads...');
  
  try {
    // Try different scroll container selectors
    const scrollContainerSelectors = [
      'div[role="dialog"]', 
      '[aria-label="Direct"]',
      'div[aria-label="Chats"]',
      'div[role="presentation"] > div > div > div > div > div'
    ];
    
    let scrollContainer = null;
    for (const selector of scrollContainerSelectors) {
      scrollContainer = await page.$(selector);
      if (scrollContainer) break;
    }
    
    if (scrollContainer) {
      let previousHeight = 0;
      let currentHeight = await scrollContainer.evaluate((el: any) => el.scrollHeight);
      let scrollAttempts = 0;
      const maxAttempts = 5;

      while (previousHeight < currentHeight && scrollAttempts < maxAttempts) {
        await scrollContainer.evaluate((el: any) => {
          el.scrollTop = el.scrollHeight;
        });
        
        await page.waitForTimeout(2000);
        
        previousHeight = currentHeight;
        currentHeight = await scrollContainer.evaluate((el: any) => el.scrollHeight);
        scrollAttempts++;
        
        console.log(`Scroll attempt ${scrollAttempts}, height: ${currentHeight}`);
      }
    } else {
      console.log('No scroll container found - scrolling entire page');
      // Fallback to scrolling the whole page
      await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
          let totalHeight = 0;
          const distance = 300;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            
            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 200);
        });
      });
    }
  } catch (e: unknown) {
    console.log('Scrolling error:', (e as Error).message);
  }
}

// --- Robust waitForInbox ---
async function waitForInbox(page: any) {
  const maxWait = 30000; // 30 seconds
  const pollInterval = 1000;
  let waited = 0;
  while (waited < maxWait) {
    const found = await page.evaluate(() => {
      // New: Check for multiple inbox indicators
      const indicators = [
        // Main thread list
        () => document.querySelector('div[role="listitem"]'),
        // "Messages" header
        () => Array.from(document.querySelectorAll('h1,h2,h3,span')).find(
          el => el.textContent?.trim() === 'Messages'
        ),
        // "Requests" tab
        () => Array.from(document.querySelectorAll('a,button,div')).find(
          el => el.textContent?.trim() === 'Requests'
        ),
        // "New Message" button
        () => Array.from(document.querySelectorAll('button')).find(
          el => el.textContent?.trim().startsWith('New Message')
        ),
        // Thread preview container
        () => document.querySelector('[aria-label="Chats"]'),
        // Alternative container
        () => document.querySelector('div[role="presentation"] > div > div > div > div > div')
      ];

      for (const indicator of indicators) {
        if (indicator()) return true;
      }
      return false;
    });
    if (found) {
      console.log('Inbox detected successfully');
      return;
    }
    await page.waitForTimeout(pollInterval);
    waited += pollInterval;
  }
  await page.screenshot({ path: 'inbox-error.png' });
  throw new Error('Inbox not found after waiting for DOM to render');
}

// New helper functions
async function getResidentialProxy(): Promise<string> {
  if (proxyCache.has('current')) {
    return proxyCache.get('current')!;
  }

  // Use proxy rotation service
  const newProxy = await ProxyChain.anonymizeProxy(PROXY_SERVER);
  proxyCache.set('current', newProxy);
  
  // Rotate every 30 minutes
  setTimeout(() => proxyCache.delete('current'), 30 * 60 * 1000);
  
  return newProxy;
}

async function warmUpAccount(page: any) {
  console.log('Starting account warm-up sequence');
  
  // Visit non-sensitive pages first
  await page.goto('https://www.instagram.com/explore/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  await randomSleep(3000, 5000);
  await handleAllPopups(page);
  
  // Simulate organic browsing
  await page.evaluate(() => {
    window.scrollBy(0, 500);
  });
  
  await randomSleep(2000, 4000);
  
  // Go directly to home instead of unreliable selector
  await page.goto('https://www.instagram.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await handleAllPopups(page);
  await randomSleep(3000, 6000);
  
  console.log('Account warm-up complete');
}

async function loadInboxWithRetry(page: any, credentials: { username: string; password: string }) {
  const MAX_RETRIES = 2;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // NEW: Clear cache and storage before retry
      if (attempt > 1) {
        await page.context().clearCookies();
        await page.goto('about:blank');
      }

      await page.goto('https://www.instagram.com/direct/inbox/', {
        waitUntil: 'networkidle',
        timeout: 45000
      });
      // Log current URL and DOM snippet
      console.log(`Attempt ${attempt}: Current URL:`, page.url());
      const domSnippet = await page.evaluate(() => document.body.innerHTML.slice(0, 1000));
      console.log(`DOM snippet (first 1000 chars):`, domSnippet);
      // Save screenshot and HTML for debugging
      await page.screenshot({ path: `inbox-attempt-${attempt}.png` });
      const html = await page.content();
      fs.writeFileSync(`inbox-attempt-${attempt}.html`, html);
      // Check if login is required
      if (await isLoginPage(page)) {
        console.log(`Authentication required (attempt ${attempt}/${MAX_RETRIES})`);
        await enhancedStealthLogin(page, credentials);
        await randomSleep(3000, 7000);
        continue;
      }
      // Handle popups and add a small delay
      await handleAllPopups(page);
      await randomSleep(1000, 2000);
      // Check if inbox loaded
      if (await isInboxVisible(page)) {
        return;
      }

      if (await page.isVisible('text="Your account has been suspended"')) {
        throw new Error('Account suspended');
      }
    } catch (e) {
      console.log(`Inbox load failed (attempt ${attempt}):`, (e as Error).message);
    }
    await randomSleep(5000, 10000);
  }
  throw new Error('Failed to load inbox after multiple attempts');
}

async function isLoginPage(page: any): Promise<boolean> {
  return await page.evaluate(() => {
    return !!document.querySelector('input[name="username"]');
  });
}

async function isInboxVisible(page: any): Promise<boolean> {
  return await page.evaluate(() => {
    // Ignore if a modal or overlay is present
    if (document.querySelector('div[role="dialog"], [aria-modal="true"]')) return false;
    // Check for thread list items
    const threadCount = document.querySelectorAll('div[role="listitem"]').length;
    // Check for the Messages header
    const hasMessagesHeader = Array.from(document.querySelectorAll('h2, h3, span')).some(
      el => el.textContent && el.textContent.trim() === 'Messages'
    );
    // Check for Requests tab
    const hasRequestsTab = Array.from(document.querySelectorAll('a, span')).some(
      el => el.textContent && el.textContent.trim() === 'Requests'
    );
    return threadCount > 0 || hasMessagesHeader || hasRequestsTab;
  });
}

// Enhanced thread scraping
async function scrapeThreads(page: any) {
  return await page.evaluate(() => {
    const threads = [];
    // Try to find all message list items
    const threadElements = document.querySelectorAll('div[role="listitem"]');
    for (const el of threadElements) {
      // Avatar and username
      const avatarImg = el.querySelector('img');
      const usernameEl = el.querySelector('span, div > span');
      // Preview (last message)
      let previewEl = null;
      // Try to find a preview message (may be in a span or div)
      const previewCandidates = el.querySelectorAll('span, div');
      for (const cand of previewCandidates) {
        if (cand.textContent && cand.textContent.trim() && cand !== usernameEl && cand.textContent.length < 100) {
          previewEl = cand;
          break;
        }
      }
      // Skip if no username
      if (!usernameEl) continue;
      const username = usernameEl.textContent ? usernameEl.textContent.trim() : '';
      const preview = previewEl && previewEl.textContent ? previewEl.textContent.trim().replace(/\s+/g, ' ') : '';
      threads.push({
        username,
        preview,
        avatar: avatarImg ? avatarImg.src : null,
        raw: el.outerHTML
      });
    }
    return threads;
  });
}

// Open specific DM thread
export async function openDirectThread(page: any, threadUrl: string) {
  await page.goto(`https://www.instagram.com${threadUrl}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  // Wait for message list
  await page.waitForSelector('div[role="presentation"] > div > div > div > div', 
    { state: 'visible', timeout: 20000 }
  );
  
  // Scroll to load history
  await scrollMessageHistory(page);
  
  // Extract messages
  return await page.evaluate(() => {
    const messages = [];
    const messageElements = document.querySelectorAll('div[role="presentation"] > div > div > div > div > div');
    
    for (const el of messageElements) {
      const sender = el.querySelector('a[href^="/"]');
      const content = el.querySelector('div > span');
      
      if (!sender || !content) continue;
      
      const senderText = sender.textContent ? sender.textContent.trim() : '';
      const contentText = content.textContent ? content.textContent.trim() : '';
      messages.push({
        sender: senderText,
        text: contentText,
        time: el.querySelector('time')?.getAttribute('datetime') || ''
      });
    }
    
    return messages;
  });
}

async function scrollMessageHistory(page: any) {
  const scrollContainer = await page.$('div[role="presentation"] > div > div > div');
  
  if (scrollContainer) {
    let previousHeight = 0;
    let currentHeight = await scrollContainer.evaluate((el: any) => el.scrollHeight);
    let scrollAttempts = 0;
    
    while (previousHeight < currentHeight && scrollAttempts < 10) {
      await scrollContainer.evaluate((el: any) => {
        el.scrollTop = 0;
      });
      
      await page.waitForTimeout(2000);
      
      previousHeight = currentHeight;
      currentHeight = await scrollContainer.evaluate((el: any) => el.scrollHeight);
      scrollAttempts++;
    }
  }
}

export async function fetchInstagramEngagement(
  credentials: { username: string; password: string }
) {
  
}

// --- Account State Helpers ---
function getAccountStatePath(username: string) {
  return `./account-${username}.json`;
}

function loadAccountState(username: string) {
  const accountStatePath = getAccountStatePath(username);
  if (fs.existsSync(accountStatePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(accountStatePath, 'utf8'));
      ACCOUNT_STATE.set(username, state);
      return state;
    } catch (e) {
      console.error('Failed to load account state:', e);
    }
  }
  // Default state
  return {
    lastRun: 0,
    device: '',
    userAgent: '',
    ipAddress: '',
    sessionAge: 0
  };
}

function saveAccountState(username: string, state: any) {
  const accountStatePath = getAccountStatePath(username);
  fs.writeFileSync(accountStatePath, JSON.stringify(state));
  ACCOUNT_STATE.set(username, state);
}

function updateAccountState(username: string, updates: Partial<any>) {
  const prev = loadAccountState(username);
  const next = { ...prev, ...updates };
  saveAccountState(username, next);
  return next;
}