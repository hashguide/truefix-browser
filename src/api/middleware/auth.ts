/**
 * Authentication middleware
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import logger from '@logging/logger'

export async function authenticateToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    logger.warn('JWT verification failed')
    reply.status(401).send({
      error: {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      },
    })
  }
}

export async function verifyAPIKey(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string

  if (!apiKey) {
    reply.status(401).send({
      error: {
        message: 'Missing API key',
        code: 'MISSING_API_KEY',
      },
    })
    return
  }

  // Implement API key verification against database if needed
  if (!isValidAPIKey(apiKey)) {
    logger.warn({ apiKey: apiKey.substring(0, 8) + '...' }, 'Invalid API key')
    reply.status(401).send({
      error: {
        message: 'Invalid API key',
        code: 'INVALID_API_KEY',
      },
    })
  }
}

function isValidAPIKey(apiKey: string): boolean {
  // Implement actual validation against stored keys
  return apiKey.length > 0
}
