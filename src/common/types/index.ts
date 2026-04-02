/**
 * Core data types for the scraping engine
 */

// Job Types
export type JobType = 'part_search' | 'labor_lookup' | 'workflow_discovery'
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Vehicle {
  year: number
  make: string
  model: string
  engine?: string
  transmission?: string
  driveType?: string
}

export interface JobQuery {
  part?: string
  laborTask?: string
  vehicleSystem?: string
}

export interface JobInput {
  vehicle: Vehicle
  query?: JobQuery
}

export interface PartResult {
  source: string
  price: number
  title: string
  url: string
  partNumber?: string
  availability?: string
  extractedAt: Date
}

export interface LaborResult {
  source: string
  laborHours: number
  description: string
  difficulty?: 'easy' | 'medium' | 'hard'
  tools?: string[]
  extractedAt: Date
}

export interface JobResult {
  parts?: PartResult[]
  labor?: LaborResult
  notes?: string
}

export interface Job {
  id: string
  type: JobType
  status: JobStatus
  input: JobInput
  result?: JobResult
  workflowId?: string
  attempts: number
  maxAttempts: number
  error?: {
    code: string
    message: string
    timestamp: Date
  }
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

// Workflow Types
export type StepType = 'navigate' | 'click' | 'input' | 'wait' | 'extract' | 'evaluate'

export interface NavigateStep {
  type: 'navigate'
  url: string
  waitForNavigation?: boolean
}

export interface ClickStep {
  type: 'click'
  selector: string
  waitForNavigation?: boolean
  delay?: number
}

export interface InputStep {
  type: 'input'
  selector: string
  valueKey: string
  clearFirst?: boolean
  delay?: number
}

export interface WaitStep {
  type: 'wait'
  ms: number
}

export interface ExtractStep {
  type: 'extract'
  selector: string
  key: string
  attribute?: 'text' | 'html' | 'value' | 'href'
  multiple?: boolean
}

export interface EvaluateStep {
  type: 'evaluate'
  code: string
  resultKey: string
}

export type WorkflowStep = NavigateStep | ClickStep | InputStep | WaitStep | ExtractStep | EvaluateStep

export interface ValidationRule {
  key: string
  required: boolean
  type: 'string' | 'number' | 'url' | 'array' | 'object'
  pattern?: RegExp
}

export interface SelectorMap {
  [logicalName: string]: string
}

export interface Workflow {
  id: string
  domain: string
  path: string // /jobs/part-search or /manuals/labor-time
  version: number
  steps: WorkflowStep[]
  selectors: SelectorMap
  validationRules: ValidationRule[]
  successRate: number
  totalRuns: number
  lastSuccessfulRun?: Date
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowVersion {
  id: string
  workflowId: string
  version: number
  steps: WorkflowStep[]
  selectors: SelectorMap
  validationRules: ValidationRule[]
  changeNote?: string
  createdAt: Date
}

// AI Service Types
export interface AIPromptResponse {
  steps: WorkflowStep[]
  selectors: SelectorMap
  validationRules: ValidationRule[]
  confidence: number
  reasoning?: string
}

export interface AIValidationResponse {
  isValid: boolean
  confidence: number
  issues: string[]
  suggestedFixes?: string[]
}

export interface AIRepairResponse {
  updatedSelectors: SelectorMap
  updatedSteps?: WorkflowStep[]
  confidence: number
  changeNote: string
}

// Transport/Event Types
export type EventType =
  | 'job.queued'
  | 'job.started'
  | 'job.progress'
  | 'job.completed'
  | 'job.failed'
  | 'workflow.discovered'
  | 'workflow.updated'
  | 'workflow.failed'

export interface Event {
  type: EventType
  jobId?: string
  workflowId?: string
  data: Record<string, unknown>
  timestamp: Date
}

// Webhook Types
export interface WebhookSubscription {
  id: string
  url: string
  events: EventType[]
  active: boolean
  secret: string
  createdAt: Date
}

export interface WebhookPayload {
  id: string
  event: EventType
  timestamp: Date
  data: Record<string, unknown>
}

// Error Types
export class ScraperError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ScraperError'
  }
}

export class WorkflowError extends ScraperError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('WORKFLOW_ERROR', message, 500, details)
    this.name = 'WorkflowError'
  }
}

export class ValidationError extends ScraperError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details)
    this.name = 'ValidationError'
  }
}

export class BrowserError extends ScraperError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('BROWSER_ERROR', message, 500, details)
    this.name = 'BrowserError'
  }
}

export class AIError extends ScraperError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AI_ERROR', message, 500, details)
    this.name = 'AIError'
  }
}
