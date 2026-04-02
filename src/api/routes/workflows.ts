/**
 * Workflows route - Manage scraping workflows
 */

import { FastifyInstance } from 'fastify'
import * as workflowStorage from '@storage/workflows'

export default async function workflowsRoute(server: FastifyInstance) {
  // List all workflows
  server.get('/', async (_request, reply) => {
    const workflows = await workflowStorage.getAllWorkflows()

    reply.send({
      workflows: workflows.map((w) => ({
        id: w.id,
        domain: w.domain,
        path: w.path,
        version: w.version,
        successRate: w.successRate,
        totalRuns: w.totalRuns,
        lastSuccessfulRun: w.lastSuccessfulRun,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
        _links: {
          self: { href: `/workflows/${w.id}` },
        },
      })),
      total: workflows.length,
    })
  })

  // Get workflow by ID
  server.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const workflow = await workflowStorage.getWorkflowById(request.params.id)

    if (!workflow) {
      reply.status(404).send({
        error: {
          message: 'Workflow not found',
          code: 'WORKFLOW_NOT_FOUND',
        },
      })
      return
    }

    reply.send({
      id: workflow.id,
      domain: workflow.domain,
      path: workflow.path,
      version: workflow.version,
      steps: workflow.steps,
      selectors: workflow.selectors,
      validationRules: workflow.validationRules,
      successRate: workflow.successRate,
      totalRuns: workflow.totalRuns,
      lastSuccessfulRun: workflow.lastSuccessfulRun,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    })
  })
}
