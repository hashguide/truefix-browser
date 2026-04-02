/**
 * Database seeding for development/testing
 */

import { query } from '../db/connection'
import logger from '@logging/logger'
import { v4 as uuidv4 } from 'uuid'

async function seedWorkflows() {
  logger.info('Seeding workflows...')

  // Seed a basic autozone workflow template (for reference)
  const workflowId = uuidv4()

  await query(
    `
    INSERT INTO workflows (id, domain, path, version, steps, selectors, validation_rules, success_rate, total_runs, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    ON CONFLICT (domain, path) DO NOTHING
  `,
    [
      workflowId,
      'autozone.com',
      '/jobs/part-search',
      1,
      JSON.stringify([
        { type: 'navigate', url: 'https://www.autozone.com' },
        { type: 'wait', ms: 2000 },
        { type: 'click', selector: '[data-test="vehicle-selector"]' },
        { type: 'input', selector: '#year-input', valueKey: 'year' },
        { type: 'wait', ms: 1000 },
        { type: 'click', selector: '[data-year="year-selected"]' },
        { type: 'input', selector: '#make-input', valueKey: 'make' },
        { type: 'wait', ms: 1000 },
        { type: 'click', selector: '[data-make="make-selected"]' },
        { type: 'input', selector: '#model-input', valueKey: 'model' },
        { type: 'wait', ms: 1000 },
        { type: 'click', selector: '[data-model="model-selected"]' },
        { type: 'input', selector: 'input[placeholder="Search parts"]', valueKey: 'part' },
        { type: 'wait', ms: 500 },
        { type: 'click', selector: 'button:has-text("Search")' },
        { type: 'wait', ms: 3000 },
        {
          type: 'extract',
          selector: '.product-item',
          key: 'parts',
          multiple: true,
        },
      ]),
      JSON.stringify({
        vehicleSelector: '[data-test="vehicle-selector"]',
        yearInput: '#year-input',
        makeInput: '#make-input',
        modelInput: '#model-input',
        partInput: 'input[placeholder="Search parts"]',
        searchButton: 'button:has-text("Search")',
        partResults: '.product-item',
        partPrice: '.product-price',
        partLink: '.product-item a',
      }),
      JSON.stringify([
        { key: 'parts', required: true, type: 'array' },
        { key: 'price', required: true, type: 'number' },
        { key: 'title', required: true, type: 'string' },
      ]),
      0,
      0,
    ]
  )

  logger.info('Workflows seeded successfully')
}

async function seedWebhooks() {
  logger.info('Seeding webhook subscriptions...')

  // You can seed webhook subscriptions if needed
  logger.info('Webhook subscriptions seeded')
}

async function main() {
  try {
    await seedWorkflows()
    await seedWebhooks()
    logger.info('Database seeding completed')
  } catch (err) {
    logger.error({ err }, 'Database seeding failed')
    process.exit(1)
  }
}

export default main
