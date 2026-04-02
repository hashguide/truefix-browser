/**
 * Fastify server setup
 */

import Fastify, { FastifyInstance } from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import fastifySSE from 'fastify-sse-v2'
import config from '@config/index'
import logger from '@logging/logger'

export async function createServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: config.logLevel,
      transport:
        config.env === 'production'
          ? undefined
          : {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
            },
    },
    bodyLimit: 1048576, // 1MB
  })

  // Register plugins
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })

  await server.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  })

  await server.register(jwt, {
    secret: config.jwt.secret,
    sign: { expiresIn: config.jwt.expiration },
  })

  if (config.security.rateLimitEnabled) {
    await server.register(rateLimit, {
      max: config.security.rateLimitRequests,
      timeWindow: config.security.rateLimitWindow,
      cache: 10000,
      allowList: ['127.0.0.1'],
      redis: process.env.REDIS_URL,
    })
  }

  await server.register(fastifySSE)

  // Request logging middleware
  server.addHook('onRequest', async (request) => {
    logger.debug(
      {
        method: request.method,
        url: request.url,
        ip: request.ip,
      },
      'Incoming request'
    )
  })

  // Error handling
  server.setErrorHandler((error, request, reply) => {
    logger.error(
      {
        statusCode: error.statusCode,
        message: error.message,
        url: request.url,
      },
      'Request error'
    )

    reply.status(error.statusCode || 500).send({
      error: {
        message: error.message,
        code: (error as any).code || 'INTERNAL_ERROR',
        statusCode: error.statusCode || 500,
      },
    })
  })

  return server
}
