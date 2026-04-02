/**
 * API Routes
 */

import { FastifyInstance } from 'fastify'
import jobsRoute from './jobs'
import workflowsRoute from './workflows'
import statusRoute from './status'
import webhooksRoute from './webhooks'

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Health check
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Register route groups
  await server.register(jobsRoute, { prefix: '/jobs' })
  await server.register(workflowsRoute, { prefix: '/workflows' })
  await server.register(statusRoute, { prefix: '/status' })
  await server.register(webhooksRoute, { prefix: '/webhooks' })
}
