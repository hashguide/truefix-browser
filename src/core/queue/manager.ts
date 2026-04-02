/**
 * Queue System - Uses BullMQ for job distribution
 */

import { Queue, Worker, QueueEvents } from 'bullmq'
import config from '@config/index'
import logger from '@logging/logger'
import { Job as BullJob } from 'bullmq'

interface JobData {
  jobId: string
  workflowId?: string
  [key: string]: unknown
}

type JobHandler = (job: BullJob<JobData>) => Promise<void>

const redisConnection = {
  url: config.redis.url,
}

export class QueueManager {
  private queues: Map<string, Queue> = new Map()
  private workers: Map<string, Worker> = new Map()
  private queueEvents: Map<string, QueueEvents> = new Map()

  createQueue(name: string): Queue<JobData> {
    if (this.queues.has(name)) {
      return this.queues.get(name)!
    }

    const queue = new Queue<JobData>(name, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 3600, // 1 hour
        },
        removeOnFail: {
          age: 86400, // 1 day
        },
      },
    })

    this.queues.set(name, queue)
    logger.info({ queue: name }, 'Queue created')

    return queue
  }

  registerWorker(name: string, handler: JobHandler, concurrency: number = 4): Worker {
    const worker = new Worker(name, handler, {
      connection: redisConnection,
      concurrency,
    })

    worker.on('completed', (job) => {
      logger.info({ jobId: job.id, queue: name }, 'Job completed')
    })

    worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, queue: name, error: err.message }, 'Job failed')
    })

    worker.on('error', (err) => {
      logger.error({ queue: name, error: err.message }, 'Worker error')
    })

    this.workers.set(name, worker)
    logger.info({ queue: name, concurrency }, 'Worker registered')

    return worker
  }

  registerQueueEvents(name: string): QueueEvents {
    const queueEvents = new QueueEvents(name, {
      connection: redisConnection,
    })

    queueEvents.on('added', ({ jobId }) => {
      logger.debug({ jobId, queue: name }, 'Job added to queue')
    })

    queueEvents.on('completed', ({ jobId }) => {
      logger.info({ jobId, queue: name }, 'Queue event: job completed')
    })

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.warn({ jobId, queue: name, reason: failedReason }, 'Queue event: job failed')
    })

    this.queueEvents.set(name, queueEvents)
    return queueEvents
  }

  async addJob(queueName: string, data: JobData, priority?: number): Promise<void> {
    const queue = this.createQueue(queueName)

    await queue.add(data.jobId, data, {
      priority,
      jobId: data.jobId,
    })

    logger.info({ jobId: data.jobId, queue: queueName }, 'Job added to queue')
  }

  async getQueueStatus(queueName: string): Promise<{
    active: number
    waiting: number
    completed: number
    failed: number
  }> {
    const queue = this.createQueue(queueName)

    const [active, waiting, completed, failed] = await Promise.all([
      queue.getActiveCount(),
      queue.getWaitingCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ])

    return { active, waiting, completed, failed }
  }

  async closeAll(): Promise<void> {
    logger.info('Closing all queues and workers')

    for (const worker of this.workers.values()) {
      await worker.close()
    }

    for (const queue of this.queues.values()) {
      await queue.close()
    }

    for (const events of this.queueEvents.values()) {
      await events.close()
    }

    this.queues.clear()
    this.workers.clear()
    this.queueEvents.clear()

    logger.info('All queues and workers closed')
  }
}

let queueManager: QueueManager

export function getQueueManager(): QueueManager {
  if (!queueManager) {
    queueManager = new QueueManager()
  }
  return queueManager
}

export async function closeQueueManager(): Promise<void> {
  if (queueManager) {
    await queueManager.closeAll()
  }
}
