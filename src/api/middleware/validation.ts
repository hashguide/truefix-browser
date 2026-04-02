/**
 * Input validation middleware
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { ZodSchema, ZodError } from 'zod'

export function createValidator(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      schema.parse(request.body)
    } catch (err) {
      if (err instanceof ZodError) {
        reply.status(400).send({
          error: {
            message: 'Validation failed',
            details: err.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
              code: e.code,
            })),
          },
        })
      } else {
        throw err
      }
    }
  }
}
