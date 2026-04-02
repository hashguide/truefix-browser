/**
 * Scraper Orchestrator - Main coordinator
 */

import { Job as BullJob } from 'bullmq'
import { getQueueManager } from '@core/queue/manager'
import { getAIService } from '@ai/service'
import { getBrowserWorker } from '@browser/worker/manager'
import { WorkflowExecutionEngine } from '@workflows/engine/executor'
import * as workflowStorage from '@storage/workflows'
import * as jobStorage from '@storage/jobs'
import {
  Job,
  Workflow,
  ValidationError,
  WorkflowError,
  AIError,
  PartResult,
  LaborResult,
} from '@mytypes/index'
import logger from '@logging/logger'

export class OrchestratorService {
  private queueManager = getQueueManager()
  private aiService = getAIService()

  async initialize(): Promise<void> {
    logger.info('Initializing Orchestrator Service')

    // Create queues
    this.queueManager.createQueue('scrape-jobs')
    this.queueManager.createQueue('workflow-discovery')
    this.queueManager.createQueue('workflow-repair')

    // Register job handler
    this.queueManager.registerWorker(
      'scrape-jobs',
      (job) => this.handleScrapeJob(job),
      4
    )

    // Register workflow discovery handler
    this.queueManager.registerWorker(
      'workflow-discovery',
      (job) => this.handleWorkflowDiscovery(job),
      2
    )

    // Register workflow repair handler
    this.queueManager.registerWorker(
      'workflow-repair',
      (job) => this.handleWorkflowRepair(job),
      2
    )

    // Register queue events
    this.queueManager.registerQueueEvents('scrape-jobs')
    this.queueManager.registerQueueEvents('workflow-discovery')
    this.queueManager.registerQueueEvents('workflow-repair')

    logger.info('Orchestrator Service initialized')
  }

  /**
   * Submit a new scraping job
   */
  async submitJob(job: Job): Promise<void> {
    // Check if workflow exists
    let workflow: Workflow | null = null
    if (job.type === 'part_search') {
      workflow = await workflowStorage.getWorkflowByDomainPath('autozone.com', '/jobs/part-search')
    } else if (job.type === 'labor_lookup') {
      workflow = await workflowStorage.getWorkflowByDomainPath('alldata.com', '/manuals/labor-time')
    }

    if (!workflow) {
      // Trigger workflow discovery
      logger.info({ jobId: job.id }, 'No workflow found, triggering discovery')
      await this.queueManager.addJob('workflow-discovery', {
        jobId: job.id,
      })
    } else {
      job.workflowId = workflow.id
      await jobStorage.updateJobStatus(job.id, 'running')
      await this.queueManager.addJob('scrape-jobs', {
        jobId: job.id,
        workflowId: workflow.id,
      })
    }
  }

  /**
   * Handle scraping job execution
   */
  private async handleScrapeJob(bullJob: BullJob<any>): Promise<void> {
    const { jobId, workflowId } = bullJob.data
    const job = await jobStorage.getJobById(jobId)

    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    let attempts = await jobStorage.incrementJobAttempts(jobId)

    try {
      logger.info(
        { jobId, workflowId, attempt: attempts },
        'Executing scrape job'
      )

      const workflow = await workflowStorage.getWorkflowById(workflowId)
      if (!workflow) {
        throw new WorkflowError(`Workflow ${workflowId} not found`)
      }

      const browserWorker = await getBrowserWorker()
      const page = await browserWorker.getPage()

      try {
        const engine = new WorkflowExecutionEngine(page)
        const results = await engine.execute(workflow.steps, job.input as any)

        // Validate results with AI
        const validation = await this.aiService.validateResults(
          results,
          workflow.validationRules
        )

        if (!validation.isValid && validation.confidence < 0.7) {
          throw new ValidationError('Extracted data failed validation', {
            issues: validation.issues,
            confidence: validation.confidence,
          })
        }

        // Update success stats
        await workflowStorage.updateWorkflowStats(workflowId, true)

        // Complete job
        await jobStorage.updateJobStatus(job.id, 'completed', {
          parts: (results.parts as PartResult[] | undefined),
          labor: (results.labor as LaborResult | undefined),
          notes: 'Scraping completed successfully',
        })

        logger.info({ jobId }, 'Scrape job completed successfully')
      } finally {
        await browserWorker.releasePage(page)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error({ jobId, error: error.message, attempt: attempts }, 'Scrape job failed')

      // Check if we should retry or trigger repair
      if (attempts < job.maxAttempts) {
        if (
          error.message.includes('selector') ||
          error.message.includes('element not found')
        ) {
          // Trigger repair workflow
          logger.info({ jobId, workflowId }, 'Triggering workflow repair')
          await this.queueManager.addJob('workflow-repair', {
            jobId,
            workflowId,
            error: error.message,
          })
        }
        // Retry will happen automatically via BullMQ backoff
      } else {
        // Max attempts reached
        await jobStorage.updateJobStatus(job.id, 'failed', null, {
          code: 'MAX_ATTEMPTS_EXCEEDED',
          message: `Job failed after ${attempts} attempts: ${error.message}`,
          timestamp: new Date(),
        })

        await workflowStorage.updateWorkflowStats(workflowId, false)
      }

      throw error
    }
  }

  /**
   * Discover workflow for a new website
   */
  private async handleWorkflowDiscovery(bullJob: BullJob<any>): Promise<void> {
    const { jobId } = bullJob.data
    const job = await jobStorage.getJobById(jobId)

    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    try {
      logger.info({ jobId }, 'Starting workflow discovery')

      const browserWorker = await getBrowserWorker()
      const page = await browserWorker.getPage()

      try {
        // Navigate to target site (example: autozone.com)
        const targetUrl = 'https://www.autozone.com'
        await page.goto(targetUrl, { waitUntil: 'networkidle' })

        // Capture page content
        const html = await page.content()
        const screenshot = await page.screenshot({ type: 'png' })

        // Get AI to generate workflow
        const task = `Find brake pads for 2015 Toyota Camry at ${targetUrl}`
        const aiResponse = await this.aiService.discoverWorkflow(
          {
            url: targetUrl,
            html,
            screenshot: screenshot?.toString('base64'),
          },
          task
        )

        if (aiResponse.confidence < 0.6) {
          throw new AIError(
            'Low confidence workflow generation',
            { confidence: aiResponse.confidence }
          )
        }

        // Store workflow
        const workflow = await workflowStorage.createWorkflow(
          'autozone.com',
          '/jobs/part-search',
          aiResponse.steps,
          aiResponse.selectors,
          aiResponse.validationRules
        )

        logger.info(
          {
            jobId,
            workflowId: workflow.id,
            confidence: aiResponse.confidence,
          },
          'Workflow discovered and stored'
        )

        // Update job reference
        await jobStorage.updateJobStatus(job.id, 'running')

        // Retry the original job
        await this.queueManager.addJob('scrape-jobs', {
          jobId,
          workflowId: workflow.id,
        })
      } finally {
        await browserWorker.releasePage(page)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error({ jobId, error: error.message }, 'Workflow discovery failed')

      await jobStorage.updateJobStatus(job.id, 'failed', null, {
        code: 'DISCOVERY_FAILED',
        message: `Workflow discovery failed: ${error.message}`,
        timestamp: new Date(),
      })

      throw error
    }
  }

  /**
   * Repair a broken workflow
   */
  private async handleWorkflowRepair(bullJob: BullJob<any>): Promise<void> {
    const { jobId, workflowId, error } = bullJob.data

    try {
      logger.info({ jobId, workflowId, error }, 'Starting workflow repair')

      const workflow = await workflowStorage.getWorkflowById(workflowId)
      if (!workflow) {
        throw new WorkflowError(`Workflow ${workflowId} not found`)
      }

      const browserWorker = await getBrowserWorker()
      const page = await browserWorker.getPage()

      try {
        // Navigate to target site
        const targetUrl = `https://${workflow.domain}`
        await page.goto(targetUrl, { waitUntil: 'networkidle' })

        // Capture page content
        const html = await page.content()
        const screenshot = await page.screenshot({ type: 'png' })

        // Ask AI to fix selectors
        const repairResponse = await this.aiService.repairWorkflow(
          {
            url: targetUrl,
            html,
            screenshot: screenshot?.toString('base64'),
          },
          workflow.selectors,
          error
        )

        // Update workflow with new selectors
        await workflowStorage.updateWorkflowSelectors(
          workflowId,
          repairResponse.updatedSelectors,
          repairResponse.changeNote
        )

        logger.info(
          {
            jobId,
            workflowId,
            confidence: repairResponse.confidence,
          },
          'Workflow repaired successfully'
        )

        // Retry the original job
        await this.queueManager.addJob('scrape-jobs', {
          jobId,
          workflowId,
        })
      } finally {
        await browserWorker.releasePage(page)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error({ jobId, workflowId, error: error.message }, 'Workflow repair failed')
      throw error
    }
  }

  /**
   * Get job execution status
   */
  async getJobStatus(jobId: string): Promise<Job | null> {
    return await jobStorage.getJobById(jobId)
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<Record<string, any>> {
    const scrapeJobsStatus = await this.queueManager.getQueueStatus('scrape-jobs')
    const discoveryStatus = await this.queueManager.getQueueStatus('workflow-discovery')
    const repairStatus = await this.queueManager.getQueueStatus('workflow-repair')

    return {
      scrapeJobs: scrapeJobsStatus,
      discovery: discoveryStatus,
      repair: repairStatus,
    }
  }
}

let orchestratorInstance: OrchestratorService

export function getOrchestratorService(): OrchestratorService {
  if (!orchestratorInstance) {
    orchestratorInstance = new OrchestratorService()
  }
  return orchestratorInstance
}
