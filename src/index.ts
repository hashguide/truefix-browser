/**
 * Application entry point
 */

import { initializeDatabase } from '@storage/db/connection'
import { getOrchestratorService } from '@core/orchestrator/service'
import { getBrowserWorker, closeBrowserWorker } from '@browser/worker/manager'
import { closeQueueManager } from '@core/queue/manager'
import { createServer } from '@api/server'
import { registerRoutes } from '@api/routes/index'
import config from '@config/index'
import logger from '@logging/logger'

async function main() {
  try {
    logger.info({ env: config.env, port: config.port }, 'Starting application')

    // Initialize database
    await initializeDatabase()

    // Initialize orchestrator
    const orchestrator = getOrchestratorService()
    await orchestrator.initialize()

    // Initialize browser worker
    await getBrowserWorker()

    // Create Fastify server
    const server = await createServer()

    // Register routes
    await registerRoutes(server)

    // Start server
    await server.listen({ port: config.port, host: '0.0.0.0' })

    logger.info({ port: config.port }, 'Server started successfully')

    // Graceful shutdown
    const signals = ['SIGTERM', 'SIGINT']
    for (const signal of signals) {
      process.on(signal, async () => {
        logger.info({ signal }, 'Shutdown signal received')

        // Close server
        await server.close()

        // Close browser worker
        await closeBrowserWorker()

        // Close queue
        await closeQueueManager()

        logger.info('Application shut down gracefully')
        process.exit(0)
      })
    }
  } catch (err) {
    logger.error({ err }, 'Failed to start application')
    process.exit(1)
  }
}

main()
