/**
 * Migration runner - Execute this to set up the database
 */

import { initializeDatabase, closeDatabase } from '../db/connection'
import runMigrations from './index'
import logger from '@logging/logger'

async function main() {
  try {
    await initializeDatabase()
    await runMigrations()
    logger.info('Database migration completed successfully')
  } catch (err) {
    logger.error({ err }, 'Database migration failed')
    process.exit(1)
  } finally {
    await closeDatabase()
  }
}

main()
