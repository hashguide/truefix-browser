import dotenv from 'dotenv'

dotenv.config()

interface Config {
  env: string
  port: number
  logLevel: string
  database: {
    url: string
    pool: {
      min: number
      max: number
    }
  }
  redis: {
    url: string
  }
  jwt: {
    secret: string
    expiration: string
  }
  ai: {
    enabled: boolean
    apiKey: string
    model: string
  }
  scraper: {
    timeout: number
    headless: boolean
    slowMo: number
    maxParallelWorkers: number
  }
  proxy: {
    enabled: boolean
    url?: string
  }
  security: {
    rateLimitEnabled: boolean
    rateLimitRequests: number
    rateLimitWindow: number
  }
  webhooks: {
    retryAttempts: number
    retryDelay: number
  }
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/price_scraper',
    pool: {
      min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
      max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    },
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-dev-secret-change-in-production-min-32-chars',
    expiration: process.env.JWT_EXPIRATION || '24h',
  },
  ai: {
    enabled: process.env.AI_ENABLED !== 'false',
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4-turbo-preview',
  },
  scraper: {
    timeout: parseInt(process.env.SCRAPER_TIMEOUT || '30000', 10),
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    slowMo: parseInt(process.env.PLAYWRIGHT_SLOW_MO || '0', 10),
    maxParallelWorkers: parseInt(process.env.MAX_PARALLEL_WORKERS || '4', 10),
  },
  proxy: {
    enabled: process.env.PROXY_ENABLED === 'true',
    url: process.env.PROXY_URL,
  },
  security: {
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100', 10),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
  },
  webhooks: {
    retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY || '5000', 10),
  },
}

export default config
