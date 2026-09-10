import fs from 'fs';
import puppeteer, { Browser } from 'puppeteer-core';
import { renderAlertCardWithSatori } from './satoriRenderer';

let browserInstance: Browser | null = null;
let isLaunching = false;

/**
 * Resolves headless Chromium executable path if installed locally.
 * In container / Cloud Run environments where no local Chromium is installed, returns null.
 */
export function getChromiumExecutablePath(): string | null {
  if (fs.existsSync('/usr/bin/chromium')) {
    return '/usr/bin/chromium';
  }
  if (fs.existsSync('/usr/bin/google-chrome')) {
    return '/usr/bin/google-chrome';
  }
  return null;
}

/**
 * Returns a persistent singleton headless Browser instance if local Chromium exists.
 */
export async function getBrowser(): Promise<Browser | null> {
  const execPath = getChromiumExecutablePath();
  if (!execPath) {
    return null;
  }

  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  // Prevent multiple concurrent launch attempts
  while (isLaunching) {
    await new Promise((r) => setTimeout(r, 100));
    if (browserInstance && browserInstance.connected) {
      return browserInstance;
    }
  }

  isLaunching = true;
  try {
    console.log(`[Puppeteer] Launching headless browser via: ${execPath}`);

    browserInstance = await puppeteer.launch({
      executablePath: execPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    });

    browserInstance.on('disconnected', () => {
      console.warn('[Puppeteer] Browser disconnected, clearing singleton instance.');
      browserInstance = null;
    });

    return browserInstance;
  } catch (err: any) {
    console.warn(`[Puppeteer] Failed to launch browser: ${err?.message || err}`);
    return null;
  } finally {
    isLaunching = false;
  }
}

/**
 * Captures screenshot via Puppeteer if available.
 */
export async function captureAlertCardScreenshot(alertId: string, port = 3000): Promise<Buffer | null> {
  const browser = await getBrowser();
  if (!browser) {
    return null;
  }

  const page = await browser.newPage();
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('React DevTools') || text.includes('[vite]') || text.includes('favicon')) {
      return;
    }
    if (msg.type() === 'error') {
      console.warn(`[Puppeteer Render Console Warn] ${text}`);
    }
  });
  page.on('pageerror', (err: any) => {
    console.warn(`[Puppeteer Render Page Warn] ${err?.message || String(err)}`);
  });

  try {
    await page.setViewport({
      width: 520,
      height: 900,
      deviceScaleFactor: 2,
    });

    const targetUrl = `http://127.0.0.1:${port}/internal/render-card/${encodeURIComponent(alertId)}`;

    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });

    const cardEl = await page.waitForSelector('[data-alert-card="true"]', { timeout: 8000 });
    if (!cardEl) {
      throw new Error('AlertCard element [data-alert-card="true"] was not found in rendered DOM');
    }

    await new Promise((r) => setTimeout(r, 150));

    const pngBuffer = await cardEl.screenshot({
      type: 'png',
      omitBackground: false,
    });

    return Buffer.from(pngBuffer);
  } catch (err: any) {
    console.warn(`[Puppeteer] captureAlertCardScreenshot failed for [${alertId}]:`, err?.message || err);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Universal Alert Card PNG Generator.
 * 1) If local Chromium exists, tries Puppeteer 2x DOM screenshot.
 * 2) Seamlessly and reliably falls back to Satori + Resvg (zero external dependencies, runs in all cloud/docker environments).
 */
export async function renderAlertCardAsPngUniversal(alertData: any, port = 3000): Promise<Buffer> {
  // If local chromium binary is present in system, try high-fidelity DOM render
  if (getChromiumExecutablePath()) {
    try {
      const puppeteerBuffer = await captureAlertCardScreenshot(alertData?.id, port);
      if (puppeteerBuffer && puppeteerBuffer.length > 0) {
        return puppeteerBuffer;
      }
    } catch (err: any) {
      console.warn(`[CardRenderer] Puppeteer attempt failed, falling back to Satori: ${err.message}`);
    }
  }

  // Fast, bulletproof Satori + Resvg in-memory render (pure Node runtime)
  return await renderAlertCardWithSatori(alertData);
}

/**
 * Graceful shutdown for browser on server termination.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch {}
    browserInstance = null;
  }
}

