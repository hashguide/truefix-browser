import { Pool, PoolClient } from 'pg'
import config from '@config/index'
import logger from '@logging/logger'

let pool: Pool

export async function initializeDatabase(): Promise<Pool> {
  pool = new Pool({
    connectionString: config.database.url,
    min: config.database.pool.min,
    max: config.database.pool.max,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })

  pool.on('error', (err: Error) => {
    logger.error({ err }, 'Unexpected error on idle client')
  })

  try {
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    logger.info('Database connection established successfully')
  } catch (err) {
    logger.error({ err }, 'Failed to connect to database')
    throw err
  }

  return pool
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.')
  }
  return pool
}

export async function query(text: string, params?: unknown[]): Promise<unknown[]> {
  const result = await getPool().query(text, params)
  return result.rows
}

export async function queryOne<T = unknown>(text: string, params?: unknown[]): Promise<T | null> {
  const result = await getPool().query(text, params)
  return result.rows[0] || null
}

export async function executeTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end()
    logger.info('Database connection pool closed')
  }
}
