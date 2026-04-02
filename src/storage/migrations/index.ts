/**
 * Database migration runner
 * Executes all migrations in sequence
 */

import { query } from '../db/connection'
import logger from '@logging/logger'

export interface Migration {
  name: string
  up: () => Promise<void>
}

// All migrations in order
const migrations: Migration[] = [
  {
    name: '001_create_workflows_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS workflows (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          domain VARCHAR(255) NOT NULL,
          path VARCHAR(255) NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          steps JSONB NOT NULL,
          selectors JSONB NOT NULL,
          validation_rules JSONB NOT NULL,
          success_rate FLOAT NOT NULL DEFAULT 0,
          total_runs INTEGER NOT NULL DEFAULT 0,
          last_successful_run TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(domain, path)
        )
      `)
      await query(
        `CREATE INDEX IF NOT EXISTS idx_workflows_domain_path ON workflows(domain, path)`
      )
    },
  },
  {
    name: '002_create_workflow_versions_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS workflow_versions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
          version INTEGER NOT NULL,
          steps JSONB NOT NULL,
          selectors JSONB NOT NULL,
          validation_rules JSONB NOT NULL,
          change_note TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(workflow_id, version)
        )
      `)
      await query(`CREATE INDEX IF NOT EXISTS idx_workflow_versions_workflow_id 
                   ON workflow_versions(workflow_id)`)
    },
  },
  {
    name: '003_create_jobs_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS jobs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'queued',
          input JSONB NOT NULL,
          result JSONB,
          workflow_id UUID REFERENCES workflows(id),
          attempts INTEGER NOT NULL DEFAULT 0,
          max_attempts INTEGER NOT NULL DEFAULT 3,
          error JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          completed_at TIMESTAMPTZ
        )
      `)
      await query(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_jobs_workflow_id ON jobs(workflow_id)`)
    },
  },
  {
    name: '004_create_webhook_subscriptions_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS webhook_subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          url VARCHAR(2048) NOT NULL,
          events TEXT[] NOT NULL,
          active BOOLEAN NOT NULL DEFAULT true,
          secret VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await query(`CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active 
                   ON webhook_subscriptions(active)`)
    },
  },
  {
    name: '005_create_execution_history_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS execution_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
          workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
          attempt_number INTEGER NOT NULL,
          execution_time_ms INTEGER,
          status VARCHAR(50) NOT NULL,
          error JSONB,
          extracted_data JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await query(
        `CREATE INDEX IF NOT EXISTS idx_execution_history_job_id ON execution_history(job_id)`
      )
      await query(
        `CREATE INDEX IF NOT EXISTS idx_execution_history_workflow_id ON execution_history(workflow_id)`
      )
    },
  },
  {
    name: '006_create_workflow_selectors_audit_table',
    up: async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS selector_audit (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
          previous_selectors JSONB NOT NULL,
          new_selectors JSONB NOT NULL,
          reason VARCHAR(50) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await query(
        `CREATE INDEX IF NOT EXISTS idx_selector_audit_workflow_id ON selector_audit(workflow_id)`
      )
    },
  },
]

async function runMigrations() {
  try {
    logger.info('Starting database migrations...')

    const migrationsRan: string[] = []

    for (const migration of migrations) {
      logger.info(`Running migration: ${migration.name}`)
      await migration.up()
      migrationsRan.push(migration.name)
    }

    logger.info({ migrations: migrationsRan }, 'All migrations completed successfully')
  } catch (err) {
    logger.error({ err }, 'Migration failed')
    throw err
  }
}

export default runMigrations
