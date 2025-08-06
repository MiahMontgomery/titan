import puppeteer, { Browser, ElementHandle } from 'puppeteer';
import { storage } from '../server/storage';
import { type Project, type Log } from '@shared/schema';

interface FormElement extends Element {
  action: string;
  method: string;
  elements: HTMLFormControlsCollection;
}

export class BrowserService {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async logAction(projectId: number, action: string, details?: string): Promise<void> {
    await storage.createLog({
      projectId,
      type: 'browser_action',
      title: action,
      details
    });
  }

  async performTask(projectId: number, task: {
    url: string;
    actions: Array<{
      type: 'click' | 'type' | 'select' | 'wait' | 'screenshot';
      selector?: string;
      value?: string;
      timeout?: number;
    }>;
  }): Promise<{ success: boolean; result?: string; error?: string }> {
    try {
      await this.initialize();
      if (!this.browser) throw new Error('Browser not initialized');

      const page = await this.browser.newPage();
      await page.goto(task.url, { waitUntil: 'networkidle0' });

      for (const action of task.actions) {
        switch (action.type) {
          case 'click':
            if (!action.selector) throw new Error('Selector required for click action');
            await page.waitForSelector(action.selector);
            await page.click(action.selector);
            await this.logAction(projectId, `Clicked element: ${action.selector}`);
            break;

          case 'type':
            if (!action.selector || !action.value) throw new Error('Selector and value required for type action');
            await page.waitForSelector(action.selector);
            await page.type(action.selector, action.value);
            await this.logAction(projectId, `Typed into element: ${action.selector}`);
            break;

          case 'select':
            if (!action.selector || !action.value) throw new Error('Selector and value required for select action');
            await page.waitForSelector(action.selector);
            await page.select(action.selector, action.value);
            await this.logAction(projectId, `Selected option in element: ${action.selector}`);
            break;

          case 'wait':
            await page.waitForTimeout(action.timeout || 1000);
            await this.logAction(projectId, `Waited for ${action.timeout || 1000}ms`);
            break;

          case 'screenshot':
            const screenshot = await page.screenshot({ encoding: 'base64' });
            await this.logAction(projectId, 'Took screenshot', `data:image/png;base64,${screenshot}`);
            break;
        }
      }

      await page.close();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logAction(projectId, 'Browser task failed', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  async analyzePage(projectId: number, url: string): Promise<{
    title: string;
    description: string;
    links: string[];
    forms: Array<{ action: string; method: string; inputs: string[] }>;
  }> {
    try {
      await this.initialize();
      if (!this.browser) throw new Error('Browser not initialized');

      const page = await this.browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle0' });

      const title = await page.title();
      const description = await page.$eval('meta[name="description"]', el => el.getAttribute('content') || '');
      
      const links = await page.$$eval('a', anchors => 
        anchors.map(a => a.href).filter(href => href && !href.startsWith('javascript:'))
      );

      const forms = await page.$$eval('form', (forms: FormElement[]) => 
        forms.map(form => ({
          action: form.action,
          method: form.method,
          inputs: Array.from(form.elements).map(input => 
            (input as HTMLInputElement).name || (input as HTMLInputElement).id || 'unnamed'
          )
        }))
      );

      await page.close();
      await this.logAction(projectId, 'Analyzed page', `Title: ${title}, Links: ${links.length}, Forms: ${forms.length}`);

      return { title, description, links, forms };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logAction(projectId, 'Page analysis failed', errorMessage);
      throw new Error(`Failed to analyze page: ${errorMessage}`);
    }
  }
} 