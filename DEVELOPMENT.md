# Development Guide

## Project Structure

```
src/
├── index.ts                 # Application entry point
├── api/                     # REST API layer
│   ├── server.ts           # Fastify configuration
│   ├── routes/             # API endpoint handlers
│   │   ├── jobs.ts
│   │   ├── workflows.ts
│   │   ├── status.ts
│   │   └── webhooks.ts
│   └── middleware/         # Custom middleware
│       ├── auth.ts
│       └── validation.ts
├── core/                    # Core services
│   ├── orchestrator/       # Job orchestration
│   │   └── service.ts
│   └── queue/              # Job queue management
│       └── manager.ts
├── ai/                      # AI integration
│   ├── service.ts          # OpenAI API calls
│   └── prompts/            # AI prompt templates
├── browser/                # Browser automation
│   └── worker/
│       └── manager.ts      # Playwright manager
├── workflows/              # Workflow execution
│   ├── engine/
│   │   └── executor.ts     # Step execution
│   ├── storage.ts          # Workflow storage
│   └── templates.ts        # Site-specific templates
├── storage/                # Data persistence
│   ├── db/
│   │   └── connection.ts   # PostgreSQL client
│   ├── migrations/         # Schema migrations
│   ├── workflows.ts        # Workflow queries
│   └── jobs.ts             # Job queries
├── common/                 # Shared utilities
│   ├── types/              # TypeScript interfaces
│   ├── config/             # Configuration
│   └── logging/            # Logger setup
└── validators/             # Input validation schemas
```

## Adding a New Website Scraper

### 1. Create Site Template

In `src/workflows/templates.ts`:

```typescript
export const newSiteTemplate: Workflow = {
  id: 'template-newsite',
  domain: 'newsite.com',
  path: '/jobs/part-search',
  version: 1,
  steps: [
    // Define automation steps
    { type: 'navigate', url: 'https://newsite.com' },
    { type: 'input', selector: '#search', valueKey: 'query' },
    { type: 'extract', selector: '.results', key: 'results', multiple: true },
  ],
  selectors: {
    searchInput: '#search',
    resultsContainer: '.results',
  },
  validationRules: [
    { key: 'results', required: true, type: 'array' },
  ],
  successRate: 0,
  totalRuns: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}
```

### 2. Update Site Mapping

Add to `siteTemplates` object in same file:

```typescript
export const siteTemplates = {
  // ... existing sites
  'newsite.com': newSiteTemplate,
}
```

### 3. Test the Template

```typescript
// Create test file in tests/integration/
import { WorkflowExecutionEngine } from '@workflows/engine/executor.ts'
import { newSiteTemplate } from '@workflows/templates.ts'

// Test with mock data
```

## Working with Workflows

### Creating a Workflow Programmatically

```typescript
import * as workflowStorage from '@storage/workflows.ts'

const workflow = await workflowStorage.createWorkflow(
  'autozone.com',
  '/jobs/part-search',
  steps,
  selectors,
  validationRules
)

console.log('Workflow created:', workflow.id)
```

### Executing a Workflow

```typescript
import { WorkflowExecutionEngine } from '@workflows/engine/executor.ts'
import { getBrowserWorker } from '@browser/worker/manager.ts'

const browserWorker = await getBrowserWorker()
const page = await browserWorker.getPage()

try {
  const engine = new WorkflowExecutionEngine(page)
  const results = await engine.execute(workflow.steps, inputData)
  console.log('Results:', results)
} finally {
  await browserWorker.releasePage(page)
}
```

### Updating Workflow Selectors

```typescript
import * as workflowStorage from '@storage/workflows.ts'

const updated = await workflowStorage.updateWorkflowSelectors(
  workflowId,
  newSelectors,
  'Updated selectors after site redesign'
)
```

## Working with AI Service

### Generate Workflow from Website

```typescript
import { getAIService } from '@ai/service.ts'

const aiService = getAIService()

const response = await aiService.discoverWorkflow(
  {
    url: 'https://example.com',
    html: pageContent,
    screenshot: screenshotBase64,
  },
  'Find brake pads for 2015 Toyota Camry'
)

console.log('Generated workflow:', response.steps)
console.log('Confidence:', response.confidence)
```

### Validate Extraction Results

```typescript
const validation = await aiService.validateResults(
  extractedData,
  validationRules
)

if (validation.isValid) {
  console.log('Valid data extracted')
} else {
  console.log('Validation issues:', validation.issues)
}
```

### Repair Broken Workflow

```typescript
const repair = await aiService.repairWorkflow(
  {
    url: 'https://example.com',
    html: pageContent,
  },
  oldSelectors,
  'Selector .old-selector not found'
)

await workflowStorage.updateWorkflowSelectors(
  workflowId,
  repair.updatedSelectors,
  repair.changeNote
)
```

## Queue System

### Add Job to Queue

```typescript
import { getQueueManager } from '@core/queue/manager.ts'

const queueManager = getQueueManager()
await queueManager.addJob('scrape-jobs', {
  jobId: 'job-123',
  workflowId: 'wf-001',
}, 5) // priority 5
```

### Register Queue Worker

```typescript
queueManager.registerWorker(
  'scrape-jobs',
  async (job) => {
    console.log('Processing job:', job.data.jobId)
    // Handle job
  },
  4 // concurrency
)
```

### Check Queue Status

```typescript
const status = await queueManager.getQueueStatus('scrape-jobs')
console.log('Active:', status.active)
console.log('Waiting:', status.waiting)
console.log('Completed:', status.completed)
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest'

describe('MyFeature', () => {
  it('should do something', () => {
    expect(true).toBe(true)
  })
})
```

### Running Tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test -- --watch

# Coverage
npm run test:coverage
```

## Debugging

### Enable Debug Logging

```bash
LOG_LEVEL=debug npm run dev
```

### Playwright Inspector

```bash
PWDEBUG=1 npm run dev
```

### Browser Headful Mode

```bash
PLAYWRIGHT_HEADLESS=false npm run dev
```

This will show the browser UI while executing workflows.

## Performance Tips

1. **Workflow Reuse**: Cache successful workflows in Redis
2. **Parallel Execution**: Adjust `MAX_PARALLEL_WORKERS` based on system resources
3. **Input Caching**: Cache vehicle data that doesn't change
4. **Selector Optimization**: Use specific, stable selectors
5. **Timeout Tuning**: Adjust timeouts based on website speed

## Common Issues

### "Element not visible" Error

The element exists in DOM but isn't visible. Solutions:
- Increase wait time before interaction
- Scroll to element first
- Check if element is behind modal/overlay

### "Selector not found" Error

Workflow selectors are outdated. AI will trigger repair automatically.
To manually trigger:

```bash
# Trigger workflow repair
POST /jobs with error flag
```

### Memory Leaks

Ensure pages are always released:

```typescript
try {
  const page = await browserWorker.getPage()
  // ... use page
} finally {
  await browserWorker.releasePage(page) // ALWAYS call this
}
```

## Contributing

1. Create feature branch
2. Follow TypeScript strict mode
3. Add tests for new features
4. Run linter: `npm run lint`
5. Format code: `npm run format`
6. Submit PR

## Resources

- [Playwright Documentation](https://playwright.dev)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Fastify Guide](https://www.fastify.io/docs/latest/)
