/**
 * Jobs route - Create and manage scraping jobs
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as jobStorage from '@storage/jobs'
import { getOrchestratorService } from '@core/orchestrator/service'
import logger from '@logging/logger'

const CreateJobSchema = z.object({
  type: z.enum(['part_search', 'labor_lookup']),
  vehicle: z.object({
    year: z.number().min(1900).max(2100),
    make: z.string().min(1).max(50),
    model: z.string().min(1).max(50),
    engine: z.string().optional(),
  }),
  query: z.object({
    part: z.string().optional(),
    laborTask: z.string().optional(),
  }).optional(),
})

export default async function jobsRoute(server: FastifyInstance) {
  // Create job
  server.post<{ Body: any }>('/', async (request, reply) => {
    try {
      const validated = CreateJobSchema.parse(request.body)

      const job = await jobStorage.createJob(validated.type, {
        vehicle: validated.vehicle,
        query: validated.query,
      })

      const orchestrator = getOrchestratorService()
      await orchestrator.submitJob(job)

      logger.info({ jobId: job.id }, 'Job created')

      reply.status(202).send({
        id: job.id,
        status: job.status,
        createdAt: job.createdAt,
        _links: {
          self: { href: `/jobs/${job.id}` },
          stream: { href: `/jobs/${job.id}/stream` },
        },
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        reply.status(400).send({
          error: {
            message: 'Invalid request',
            details: err.errors,
          },
        })
      } else {
        throw err
      }
    }
  })

  // Get job
  server.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const job = await jobStorage.getJobById(request.params.id)

    if (!job) {
      reply.status(404).send({
        error: {
          message: 'Job not found',
          code: 'JOB_NOT_FOUND',
        },
      })
      return
    }

    reply.send({
      id: job.id,
      type: job.type,
      status: job.status,
      input: job.input,
      result: job.result,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt,
      _links: {
        self: { href: `/jobs/${job.id}` },
        stream: { href: `/jobs/${job.id}/stream` },
      },
    })
  })

  // Stream job progress (SSE)
  server.get<{ Params: { id: string } }>(
    '/:id/stream',
    async (request, reply) => {
      const jobId = request.params.id
      const job = await jobStorage.getJobById(jobId)

      if (!job) {
        reply.status(404).send({ error: 'Job not found' })
        return
      }

      async function* generate() {
        // Send initial status
        yield {
          id: `${jobId}-status`,
          event: 'status',
          data: JSON.stringify({
            jobId: jobId,
            status: job!.status,
            timestamp: new Date(),
          }),
        }

        // Poll job status
        let isComplete = false
        while (!isComplete) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          const updated = await jobStorage.getJobById(jobId)

          if (updated) {
            yield {
              id: `${jobId}-update`,
              event: 'update',
              data: JSON.stringify({
                jobId: updated.id,
                status: updated.status,
                result: updated.result,
                error: updated.error,
                timestamp: new Date(),
              }),
            }

            // Close stream if job is done
            if (updated.status === 'completed' || updated.status === 'failed') {
              isComplete = true
            }
          }
        }
      }

      return reply.sse(generate())
    }
  )

  // List recent jobs
  server.get<{ Querystring: { limit: string } }>('/', async (request, reply) => {
    const limit = Math.min(Math.max(parseInt(request.query.limit || '50', 10), 1), 500)
    const jobs = await jobStorage.getRecentJobs(limit)

    reply.send({
      jobs: jobs.map((job) => ({
        id: job.id,
        type: job.type,
        status: job.status,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        _links: {
          self: { href: `/jobs/${job.id}` },
        },
      })),
      total: jobs.length,
      _links: {
        self: { href: '/jobs' },
      },
    })
  })
}
