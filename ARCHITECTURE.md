# Architecture Overview

## System Design

The Price Scraper Service is built on a modular, scalable architecture designed for production use.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│  (Mechanic Shops, Auto Repair Services, Fleet Managers)         │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────┴─────────────┬────────────────┐
         │                         │                │
      REST API              SSE (Streaming)    Webhooks
         │                         │                │
┌────────┴──────────────────┬──────┴─────────┬──────┴────────┐
│                           │                │               │
│     API Gateway           │            Events             │
│     (Fastify)             │            System             │
│                           │                               │
│  ┌─────────────────────┐  │  ┌──────────────────────┐   │
│  │ Handler Functions   │  │  │ Event Dispatcher     │   │
│  │                     │  │  │ (Job Events)         │   │
│  │ • Create Job        │  │  └──────────────────────┘   │
│  │ • Get Status        │  │                             │
│  │ • List Jobs         │  │                             │
│  │ • Webhook Mgmt      │  │                             │
│  └─────────────────────┘  │                             │
│                           │                             │
└───────────┬───────────────┴─────────────────────────────┘
            │
            │ Internal API
            │
    ┌───────▼─────────────────────────────────────────────┐
    │         Orchestrator Service                         │
    │  (Core Coordination & Job Routing)                   │
    │                                                       │
    │  ┌────────────────────────────────────────────────┐ │
    │  │ • Job Lifecycle Management                     │ │
    │  │ • Workflow Discovery Routing                   │ │
    │  │ • Workflow Repair Triggering                   │ │
    │  │ • Result Validation                            │ │
    │  │ • Statistics Aggregation                       │ │
    │  └────────────────────────────────────────────────┘ │
    └──────┬──────────────────┬──────────────────┬────────┘
           │                  │                  │
    ┌──────▼──────────────────▼──────────────────▼────────┐
    │              Queue System (BullMQ)                   │
    │                                                       │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
    │  │ Scrape Jobs  │  │ Discovery    │  │  Repair  │  │
    │  │ Queue        │  │ Queue        │  │  Queue   │  │
    │  │              │  │              │  │          │  │
    │  │ 3 workers    │  │ 2 workers    │  │ 2 workers│  │
    │  └──────────────┘  └──────────────┘  └──────────┘  │
    └───────────┬──────────────────────────────────────┬──┘
                │                                      │
        ┌───────▼──────────────┐             ┌────────▼──────┐
        │   Worker Processors   │             │   AI Service  │
        │                       │             │               │
        │ ┌──────────────────┐  │            │ ┌────────────┐│
        │ │ Workflow         │  │            │ │ Workflow   ││
        │ │ Execution Engine │  │            │ │ Discovery  ││
        │ │ (Browser Tasks)  │  │            │ │ Validation ││
        │ └──────────────────┘  │            │ │ Repair     ││
        │                       │            │ └────────────┘│
        │ ┌──────────────────┐  │            │               │
        │ │ Data Extraction  │  │            │ OpenAI API    │
        │ │ & Parsing        │  │            │ (GPT-4)       │
        │ └──────────────────┘  │            │               │
        └───────────┬───────────┘            └───────────────┘
                    │
        ┌───────────▼────────────────┐
        │   Browser Worker Pool      │
        │                            │
        │ ┌──────────────────────┐  │
        │ │ Playwright Instances │  │
        │ │ (Chrome/Chromium)    │  │
        │ │                      │  │
        │ │ • Page Pooling       │  │
        │ │ • Context Isolation  │  │
        │ │ • Concurrent Exec    │  │
        │ └──────────────────────┘  │
        └──────────┬─────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Target Websites    │
        │                     │
        │ • AutoZone          │
        │ • O'Reilly Auto     │
        │ • NAPA              │
        │ • Advance Auto      │
        │ • Alldata           │
        └─────────────────────┘


┌────────────────────────────────────────────────────────────────┐
│                    Persistence Layer                            │
│                                                                  │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐ │
│  │   PostgreSQL Database   │  │    Redis Cache/Queue         │ │
│  │                         │  │                              │ │
│  │ • Jobs Table            │  │ • Queue Data                 │ │
│  │ • Workflows Table       │  │ • Session Cache              │ │
│  │ • Workflow Versions     │  │ • Rate Limit Tracking        │ │
│  │ • Execution History     │  │ • Workflow Selectors Cache   │ │
│  │ • Webhooks              │  │                              │ │
│  │ • Audit Log             │  │                              │ │
│  └─────────────────────────┘  └──────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Part Search Job Flow

```
1. Client → POST /jobs (Create job)
   │
   ├── Store job in DB (status: queued)
   ├── Emit: job.queued event
   │
2. Orchestrator → Check for existing workflow
   │
   ├── Workflow exists?
   │   ├── YES → Route to scrape-jobs queue
   │   └── NO → Route to discovery queue
   │
3. Discovery Worker (if needed)
   ├── Open browser
   ├── Navigate to site
   ├── Capture HTML + screenshot
   ├── → AI: Generate workflow
   └── Store workflow → Route to scrape-jobs queue
   │
4. Scrape Worker
   ├── Fetch workflow
   ├── Create browser page
   ├── Execute workflow steps
   ├── Extract data
   │
   ├── AI: Validate results
   │   ├── Valid → Continue
   │   └── Invalid → Retry/Repair
   │
   ├── Store results in DB
   ├── Update job (status: completed)
   ├── Emit: job.completed event
   │
5. Webhook System (optional)
   └── POST to subscribed webhooks

6. Client → GET /jobs/:id/stream (SSE)
   └── Receive status updates in real-time
```

### Workflow Repair Flow

```
1. Extraction fails (element not found)
   │
2. → Repair Worker
   ├── Open new browser session
   ├── Navigate to site
   ├── Capture current HTML
   │
3. → AI: Repair selectors
   ├── Analyze DOM
   ├── Find new selectors
   ├── Return updated workflow
   │
4. Store new workflow version
   │
5. Retry original job with new workflow
```

## Component Details

### API Gateway (Fastify)

```typescript
Responsibilities:
  • HTTP request handling
  • Request validation (Zod schemas)
  • Authentication (JWT)
  • Rate limiting
  • CORS handling
  • Error formatting
  • Response serialization

Endpoints:
  POST   /jobs                 - Create job
  GET    /jobs/:id             - Get job status
  GET    /jobs/:id/stream      - Stream job progress
  GET    /jobs                 - List recent jobs
  GET    /workflows            - List workflows
  GET    /workflows/:id        - Get workflow details
  GET    /status               - System health status
  POST   /webhooks/subscribe   - Subscribe to events
  GET    /webhooks/:id         - Get webhook
  DELETE /webhooks/:id         - Unsubscribe
```

### Orchestrator Service

```typescript
Responsibilities:
  • Job routing to appropriate queues
  • Workflow existence checking
  • Retry logic management
  • Queue consumption setup
  • Event dispatch
  • Statistics aggregation

Decision Logic:
  IF workflow not exists:
    → Route to workflow-discovery queue
  ELSE IF retry attempt < max:
    → Route to scrape-jobs queue
  ELSE IF should repair:
    → Route to workflow-repair queue
  ELSE:
    → Mark job as failed
```

### Browser Worker Pool

```typescript
Responsibilities:
  • Playwright browser lifecycle
  • Page creation & pooling
  • Context isolation
  • Memory management
  • Concurrent execution limits

Configuration:
  • Max concurrent pages: 4-16
  • Headless mode: true (production)
  • User agent: Modern Chrome
  • Viewport: 1280x720
  • Timeout: 30 seconds per page
```

### Workflow Execution Engine

```typescript
Responsibilities:
  • Step sequencing
  • Element waiting & interaction
  • Data extraction
  • Error handling
  • State management

Step Types:
  • navigate: Load URL
  • click: Interact with elements
  • input: Fill forms
  • wait: Add delays
  • extract: Get data from DOM
  • evaluate: Run custom JavaScript
```

### AI Service

```typescript
Responsibilities:
  • Workflow generation from website
  • Result validation
  • Broken workflow repair
  • Confidence scoring

AI Prompts:
  • Discovery: "Analyze website, generate automation steps"
  • Validation: "Check if extracted data is correct"
  • Repair: "Fix broken selectors from current page"

Confidence Thresholds:
  • Discovery: 0.6 minimum
  • Validation: 0.7 minimum for acceptance
  • Repair: 0.5 minimum
```

### Queue System (BullMQ)

```typescript
Queues:
  • scrape-jobs: Main scraping tasks
    - Concurrency: 4 workers
    - Retry: 3 attempts with exponential backoff
  
  • workflow-discovery: New workflow learning
    - Concurrency: 2 workers
    - Used when no workflow exists
  
  • workflow-repair: Selector repair
    - Concurrency: 2 workers
    - Used when extraction fails

Job Lifecycle:
  Created → Queued → Active → Processing → Completed/Failed
```

## Data Models

### Job

```typescript
{
  id: UUID
  type: 'part_search' | 'labor_lookup'
  status: 'queued' | 'running' | 'completed' | 'failed'
  input: { vehicle, query }
  result: { parts[], labor[] }
  workflowId: UUID
  attempts: number
  maxAttempts: number
  error: { code, message, timestamp }
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}
```

### Workflow

```typescript
{
  id: UUID
  domain: string
  path: string
  version: number
  steps: WorkflowStep[]
  selectors: Record<string, string>
  validationRules: ValidationRule[]
  successRate: number
  totalRuns: number
  lastSuccessfulRun?: Date
  createdAt: Date
  updatedAt: Date
}
```

### Part Result

```typescript
{
  source: string // 'autozone.com', 'oreillyauto.com', etc
  price: number
  title: string
  url: string
  partNumber?: string
  availability?: string
  extractedAt: Date
}
```

## Performance Characteristics

### Response Times (P95)

| Operation | Target | Actual |
|-----------|--------|--------|
| Create Job | <100ms | ~50ms |
| Get Job | <50ms | ~20ms |
| List Jobs | <200ms | ~80ms |
| Stream Update | <500ms | ~200ms |

### Throughput

- **Jobs/day**: 10,000+ (with 4 workers)
- **Scale to**: 100,000+ (with 16 workers + load balancing)
- **Parallel sites**: 4 concurrent sites
- **Retry success rate**: 85%+

## Security Considerations

### API Security

- JWT token-based authentication
- Rate limiting (100 req/15 min per user)
- Input validation (Zod schemas)
- CORS configuration
- Helmet security headers
- HTTPS only (in production)

### Data Security

- Database encryption at rest
- TLS for data in transit
- Secrets management (env vars)
- No credentials in logs
- Audit logging enabled

### Browser Security

- Isolated contexts per page
- No persistent state between requests
- User agent rotation
- Proxy support for anonymization
- Timeout protection

## Scalability

### Horizontal Scaling

```
Deploy multiple instances:
  • API Gateway: 2-4 instances (behind load balancer)
  • Workers: 4-16 instances (auto-scaling pool)
  • Database: Primary + replicas
  • Redis: Cluster or Sentinel
```

### Vertical Scaling

```
Resource allocation per instance:
  • CPU: 2-8 cores (workers: 1 core each)
  • Memory: 2-4GB (browser: 512MB each)
  • Network: 1Gbps minimum
```

## Monitoring Points

```
Application:
  • Job creation rate
  • Job success rate
  • Workflow discovery success rate
  • Average extraction time
  • Error rates by type

System:
  • API response times
  • Queue depths
  • Worker utilization
  • Browser pool usage
  • Database query times

Infrastructure:
  • CPU utilization
  • Memory usage
  • Disk I/O
  • Network bandwidth
  • Service availability
```

## Maintenance

### Regular Tasks

- Database optimization (weekly)
- Workflow success rate analysis (daily)
- Log rotation (automated)
- Backup verification (weekly)
- Security updates (as available)

### Monitoring Dashboard

Recommended tools:
- Prometheus + Grafana
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Datadog
- New Relic

## Future Enhancements

- [ ] Vision-based element detection
- [ ] Semantic selectors (AI-based)
- [ ] Multi-language support
- [ ] Advanced proxy rotation
- [ ] Headless detection bypass
- [ ] ML-based success prediction
- [ ] Custom workflow builder UI
- [ ] A/B testing framework
