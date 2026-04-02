/**
 * Workflow storage layer
 */

import { query, queryOne } from '@storage/db/connection'
import { Workflow, WorkflowStep, ValidationRule, SelectorMap } from '@mytypes/index'
import { v4 as uuidv4 } from 'uuid'
import logger from '@logging/logger'

export async function createWorkflow(
  domain: string,
  path: string,
  steps: WorkflowStep[],
  selectors: SelectorMap,
  validationRules: ValidationRule[]
): Promise<Workflow> {
  const id = uuidv4()
  const workflow: Workflow = {
    id,
    domain,
    path,
    version: 1,
    steps,
    selectors,
    validationRules,
    successRate: 0,
    totalRuns: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await query(
    `
    INSERT INTO workflows (id, domain, path, version, steps, selectors, validation_rules, success_rate, total_runs, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `,
    [
      id,
      domain,
      path,
      1,
      JSON.stringify(steps),
      JSON.stringify(selectors),
      JSON.stringify(validationRules),
      0,
      0,
      new Date(),
      new Date(),
    ]
  )

  logger.info({ domain, path, workflowId: id }, 'Workflow created')
  return workflow
}

export async function getWorkflowByDomainPath(domain: string, path: string): Promise<Workflow | null> {
  const result = await queryOne<{
    id: string
    domain: string
    path: string
    version: number
    steps: string
    selectors: string
    validation_rules: string
    success_rate: number
    total_runs: number
    last_successful_run: string | null
    created_at: string
    updated_at: string
  }>(`SELECT * FROM workflows WHERE domain = $1 AND path = $2 ORDER BY version DESC LIMIT 1`, [
    domain,
    path,
  ])

  if (!result) return null

  return {
    id: result.id,
    domain: result.domain,
    path: result.path,
    version: result.version,
    steps: JSON.parse(result.steps),
    selectors: JSON.parse(result.selectors),
    validationRules: JSON.parse(result.validation_rules),
    successRate: result.success_rate,
    totalRuns: result.total_runs,
    lastSuccessfulRun: result.last_successful_run ? new Date(result.last_successful_run) : undefined,
    createdAt: new Date(result.created_at),
    updatedAt: new Date(result.updated_at),
  }
}

export async function getWorkflowById(id: string): Promise<Workflow | null> {
  const result = await queryOne<{
    id: string
    domain: string
    path: string
    version: number
    steps: string
    selectors: string
    validation_rules: string
    success_rate: number
    total_runs: number
    last_successful_run: string | null
    created_at: string
    updated_at: string
  }>(`SELECT * FROM workflows WHERE id = $1`, [id])

  if (!result) return null

  return {
    id: result.id,
    domain: result.domain,
    path: result.path,
    version: result.version,
    steps: JSON.parse(result.steps),
    selectors: JSON.parse(result.selectors),
    validationRules: JSON.parse(result.validation_rules),
    successRate: result.success_rate,
    totalRuns: result.total_runs,
    lastSuccessfulRun: result.last_successful_run ? new Date(result.last_successful_run) : undefined,
    createdAt: new Date(result.created_at),
    updatedAt: new Date(result.updated_at),
  }
}

export async function updateWorkflowSelectors(
  workflowId: string,
  selectors: SelectorMap,
  changeNote?: string
): Promise<Workflow> {
  const workflow = await getWorkflowById(workflowId)
  if (!workflow) throw new Error(`Workflow ${workflowId} not found`)

  const newVersion = workflow.version + 1

  // Store new version
  await query(
    `
    INSERT INTO workflow_versions (workflow_id, version, steps, selectors, validation_rules, change_note, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `,
    [
      workflowId,
      newVersion,
      JSON.stringify(workflow.steps),
      JSON.stringify(selectors),
      JSON.stringify(workflow.validationRules),
      changeNote || 'Selectors updated',
    ]
  )

  // Update main workflow
  const now = new Date()
  await query(
    `
    UPDATE workflows 
    SET version = $1, selectors = $2, updated_at = $3
    WHERE id = $4
  `,
    [newVersion, JSON.stringify(selectors), now, workflowId]
  )

  return getWorkflowById(workflowId) as Promise<Workflow>
}

export async function updateWorkflowStats(
  workflowId: string,
  success: boolean
): Promise<void> {
  const workflow = await getWorkflowById(workflowId)
  if (!workflow) throw new Error(`Workflow ${workflowId} not found`)

  const newTotalRuns = workflow.totalRuns + 1
  const newSuccessCount = success ? (workflow.successRate * workflow.totalRuns + 1) / newTotalRuns : workflow.successRate * workflow.totalRuns / newTotalRuns
  const now = new Date()

  await query(
    `
    UPDATE workflows 
    SET total_runs = $1, success_rate = $2, last_successful_run = $3, updated_at = $4
    WHERE id = $5
  `,
    [
      newTotalRuns,
      newSuccessCount,
      success ? now : undefined,
      now,
      workflowId,
    ]
  )
}

export async function getAllWorkflows(): Promise<Workflow[]> {
  const results = await query(`
    SELECT * FROM workflows
    ORDER BY domain, path
  `)

  return (results as unknown[]).map((row: any) => ({
    id: row.id,
    domain: row.domain,
    path: row.path,
    version: row.version,
    steps: JSON.parse(row.steps),
    selectors: JSON.parse(row.selectors),
    validationRules: JSON.parse(row.validation_rules),
    successRate: row.success_rate,
    totalRuns: row.total_runs,
    lastSuccessfulRun: row.last_successful_run ? new Date(row.last_successful_run) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }))
}
