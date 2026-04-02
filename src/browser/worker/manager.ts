/**
 * Browser Worker - Manages Playwright browser instances
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright'
import config from '@config/index'
import { BrowserError } from '@mytypes/index'
import logger from '@logging/logger'

interface BrowserPoolOptions {
  maxConcurrent?: number
  headless?: boolean
  slowMo?: number
  proxy?: { server: string }
}

export class BrowserWorker {
  private browser: Browser | null = null
  private contexts: BrowserContext[] = []
  private activePagesCount = 0
  private readonly maxConcurrent: number
  private readonly options: BrowserPoolOptions

  constructor(options: BrowserPoolOptions = {}) {
    this.options = {
      headless: options.headless ?? config.scraper.headless,
      slowMo: options.slowMo ?? config.scraper.slowMo,
      proxy: options.proxy,
    }
    this.maxConcurrent = options.maxConcurrent ?? config.scraper.maxParallelWorkers
  }

  async initialize(): Promise<void> {
    try {
      logger.info({ headless: this.options.headless }, 'Initializing browser worker')

      this.browser = await chromium.launch({
        headless: this.options.headless,
        slowMo: this.options.slowMo,
        proxy: this.options.proxy as any,
      })

      logger.info('Browser worker initialized successfully')
    } catch (err) {
      throw new BrowserError('Failed to initialize browser', {
        originalError: (err as Error).message,
      })
    }
  }

  async getPage(): Promise<Page> {
    if (!this.browser) {
      throw new BrowserError('Browser not initialized')
    }

    // Wait if we're at capacity
    while (this.activePagesCount >= this.maxConcurrent) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    try {
      const context = await this.browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
      })

      const page = await context.newPage()
      this.contexts.push(context)
      this.activePagesCount++

      logger.debug(
        { activePages: this.activePagesCount, maxConcurrent: this.maxConcurrent },
        'Page created'
      )

      return page
    } catch (err) {
      throw new BrowserError('Failed to create page', {
        originalError: (err as Error).message,
      })
    }
  }

  async releasePage(page: Page): Promise<void> {
    try {
      const context = page.context()
      await page.close()
      await context.close()

      this.contexts = this.contexts.filter((c) => c !== context)
      this.activePagesCount = Math.max(0, this.activePagesCount - 1)

      logger.debug({ activePages: this.activePagesCount }, 'Page released')
    } catch (err) {
      logger.warn(
        { error: (err as Error).message },
        'Error releasing page, continuing'
      )
    }
  }

  async close(): Promise<void> {
    try {
      logger.info('Closing browser worker')

      for (const context of this.contexts) {
        try {
          await context.close()
        } catch (err) {
          logger.warn('Error closing context')
        }
      }

      if (this.browser) {
        await this.browser.close()
      }

      this.browser = null
      this.contexts = []
      this.activePagesCount = 0

      logger.info('Browser worker closed')
    } catch (err) {
      logger.error({ err }, 'Error closing browser worker')
    }
  }

  getStatus(): {
    initialized: boolean
    activePages: number
    maxConcurrent: number
    contexts: number
  } {
    return {
      initialized: this.browser !== null,
      activePages: this.activePagesCount,
      maxConcurrent: this.maxConcurrent,
      contexts: this.contexts.length,
    }
  }
}

let workerInstance: BrowserWorker | null = null

export async function getBrowserWorker(): Promise<BrowserWorker> {
  if (!workerInstance) {
    workerInstance = new BrowserWorker()
    await workerInstance.initialize()
  }
  return workerInstance
}

export async function closeBrowserWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.close()
    workerInstance = null
  }
}
