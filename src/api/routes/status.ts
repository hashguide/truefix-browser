/**
 * Status route - System health and statistics
 */

import { FastifyInstance } from 'fastify'
import { getBrowserWorker } from '@browser/worker/manager'
import { getOrchestratorService } from '@core/orchestrator/service'

export default async function statusRoute(server: FastifyInstance) {
  server.get('/', async (_request, reply) => {
    const browserWorker = await getBrowserWorker()
    const orchestrator = getOrchestratorService()

    const browserStatus = browserWorker.getStatus()
    const queueStats = await orchestrator.getQueueStats()

    reply.send({
      status: 'healthy',
      timestamp: new Date(),
      services: {
        browser: {
          initialized: browserStatus.initialized,
          activePages: browserStatus.activePages,
          maxConcurrent: browserStatus.maxConcurrent,
          contexts: browserStatus.contexts,
        },
        queue: queueStats,
      },
    })
  })
}
