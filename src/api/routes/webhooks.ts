/**
 * Webhooks route - Manage webhook subscriptions
 */

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const WebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
})

// In-memory webhook storage (should use database in production)
const webhooks = new Map()

export default async function webhooksRoute(server: FastifyInstance) {
  // Subscribe to events
  server.post<{ Body: any }>('/subscribe', async (request, reply) => {
    try {
      const validated = WebhookSchema.parse(request.body)

      const webhook = {
        id: uuidv4(),
        url: validated.url,
        events: validated.events,
        active: true,
        secret: uuidv4(),
        createdAt: new Date(),
      }

      webhooks.set(webhook.id, webhook)

      reply.status(201).send({
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        createdAt: webhook.createdAt,
        _links: {
          self: { href: `/webhooks/${webhook.id}` },
        },
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        reply.status(400).send({
          error: {
            message: 'Invalid webhook configuration',
            details: err.errors,
          },
        })
      } else {
        throw err
      }
    }
  })

  // Get webhook
  server.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const webhook = webhooks.get(request.params.id)

    if (!webhook) {
      reply.status(404).send({
        error: { message: 'Webhook not found' },
      })
      return
    }

    reply.send({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      active: webhook.active,
      createdAt: webhook.createdAt,
    })
  })

  // Unsubscribe
  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!webhooks.has(request.params.id)) {
      reply.status(404).send({
        error: { message: 'Webhook not found' },
      })
      return
    }

    webhooks.delete(request.params.id)
    reply.status(204).send()
  })

  // List webhooks
  server.get('/', async (_request, reply) => {
    const webhookList = Array.from(webhooks.values())

    reply.send({
      webhooks: webhookList.map((w) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        active: w.active,
        createdAt: w.createdAt,
      })),
      total: webhookList.length,
    })
  })
}
