/**
 * Job storage layer
 */

import { query, queryOne } from '@storage/db/connection'
import { Job, JobStatus, JobInput, JobResult, JobType } from '@mytypes/index'
import { v4 as uuidv4 } from 'uuid'

export async function createJob(
  type: JobType,
  input: JobInput,
  workflowId?: string
): Promise<Job> {
  const id = uuidv4()
  const now = new Date()

  const job: Job = {
    id,
    type,
    status: 'queued',
    input,
    workflowId,
    attempts: 0,
    maxAttempts: 3,
    createdAt: now,
    updatedAt: now,
  }

  await query(
    `
    INSERT INTO jobs (id, type, status, input, workflow_id, attempts, max_attempts, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `,
    [id, type, 'queued', JSON.stringify(input), workflowId, 0, 3, now, now]
  )

  return job
}

export async function getJobById(id: string): Promise<Job | null> {
  const result = await queryOne<{
    id: string
    type: string
    status: string
    input: string
    result: string | null
    workflow_id: string | null
    attempts: number
    max_attempts: number
    error: string | null
    created_at: string
    updated_at: string
    completed_at: string | null
  }>(`SELECT * FROM jobs WHERE id = $1`, [id])

  if (!result) return null

  return {
    id: result.id,
    type: result.type as JobType,
    status: result.status as JobStatus,
    input: JSON.parse(result.input),
    result: result.result ? JSON.parse(result.result) : undefined,
    workflowId: result.workflow_id || undefined,
    attempts: result.attempts,
    maxAttempts: result.max_attempts,
    error: result.error ? JSON.parse(result.error) : undefined,
    createdAt: new Date(result.created_at),
    updatedAt: new Date(result.updated_at),
    completedAt: result.completed_at ? new Date(result.completed_at) : undefined,
  }
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  result?: JobResult | null,
  error?: { code: string; message: string; timestamp: Date } | null
): Promise<void> {
  const now = new Date()
  const completedAt = status === 'completed' || status === 'failed' ? now : null

  await query(
    `
    UPDATE jobs 
    SET status = $1, result = $2, error = $3, updated_at = $4, completed_at = $5
    WHERE id = $6
  `,
    [
      status,
      result ? JSON.stringify(result) : null,
      error ? JSON.stringify(error) : null,
      now,
      completedAt,
      jobId,
    ]
  )
}

export async function incrementJobAttempts(jobId: string): Promise<number> {
  const result = await queryOne<{ attempts: number }>(
    `
    UPDATE jobs 
    SET attempts = attempts + 1, updated_at = NOW()
    WHERE id = $1
    RETURNING attempts
  `,
    [jobId]
  )

  return result?.attempts || 0
}

export async function getJobsByStatus(status: JobStatus, limit: number = 100): Promise<Job[]> {
  const results = await query(
    `
    SELECT * FROM jobs
    WHERE status = $1
    ORDER BY created_at ASC
    LIMIT $2
  `,
    [status, limit]
  )

  return (results as unknown[]).map((row: any) => ({
    id: row.id,
    type: row.type as JobType,
    status: row.status as JobStatus,
    input: JSON.parse(row.input),
    result: row.result ? JSON.parse(row.result) : undefined,
    workflowId: row.workflow_id || undefined,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    error: row.error ? JSON.parse(row.error) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  }))
}

export async function getRecentJobs(limit: number = 100): Promise<Job[]> {
  const results = await query(
    `
    SELECT * FROM jobs
    ORDER BY created_at DESC
    LIMIT $1
  `,
    [limit]
  )

  return (results as unknown[]).map((row: any) => ({
    id: row.id,
    type: row.type as JobType,
    status: row.status as JobStatus,
    input: JSON.parse(row.input),
    result: row.result ? JSON.parse(row.result) : undefined,
    workflowId: row.workflow_id || undefined,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    error: row.error ? JSON.parse(row.error) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
  }))
}
