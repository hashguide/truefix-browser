# AI-Driven Async Scraping Service

A production-grade, self-learning web scraping service that uses AI to discover website workflows and automates data extraction from automotive parts retailers and labor databases.

## Features

- **AI-Powered Workflow Discovery**: Uses LLM (OpenAI GPT-4) to automatically discover website workflows
- **Deterministic Execution**: Once a workflow is learned, extraction is fast and reliable without AI
- **Self-Healing**: Automatically repairs workflows when websites change
- **Scalable Architecture**: Queue-based system with horizontal scaling capability
- **Real-Time Updates**: SSE (Server-Sent Events) for job progress streaming
- **Webhook Support**: Push results to external systems
- **Production-Ready**: Security, logging, monitoring, and error handling built-in

## Architecture

The system consists of:

1. **API Gateway** (Fastify): REST endpoints for job creation and status
2. **Orchestrator Service**: Coordinates workflow execution and AI tasks
3. **Browser Workers**: Playwright-based execution engine
4. **AI Service**: LLM integration for workflow discovery and validation
5. **Workflow Storage**: PostgreSQL for persistent workflow definitions
6. **Queue System**: BullMQ + Redis for distributed job processing

## Quick Start

### Prerequisites

- Node.js >= 18
- Docker & Docker Compose
- OpenAI API Key

### Installation

```bash
# Clone repository
git clone <repo>
cd price-scraper

# Copy environment file
cp .env.example .env

# Start Docker services
docker-compose up -d

# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### API Examples

#### Create a scraping job

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "part_search",
    "vehicle": {
      "year": 2015,
      "make": "Toyota",
      "model": "Camry"
    },
    "query": {
      "part": "brake pads"
    }
  }'
```

#### Get job status

```bash
curl http://localhost:3000/jobs/{job-id}
```

#### Stream job progress (SSE)

```bash
curl http://localhost:3000/jobs/{job-id}/stream
```

#### List workflows

```bash
curl http://localhost:3000/workflows
```

#### Check system status

```bash
curl http://localhost:3000/status
```

## Workflow Definition

Workflows consist of automation steps:

```typescript
type WorkflowStep =
  | { type: "navigate"; url: string }
  | { type: "click"; selector: string }
  | { type: "input"; selector: string; valueKey: string }
  | { type: "wait"; ms: number }
  | { type: "extract"; selector: string; key: string; multiple?: boolean }
  | { type: "evaluate"; code: string; resultKey: string }
```

## Supported Websites

- **Auto Parts**: O'Reilly Auto, AutoZone, Advance Auto Parts, NAPA
- **Labor Manuals**: Alldata

## Configuration

All settings are in `.env`. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection |
| `REDIS_URL` | Redis connection |
| `OPENAI_API_KEY` | OpenAI API key for AI service |
| `JWT_SECRET` | Secret for JWT tokens |
| `PLAYWRIGHT_HEADLESS` | Run browser in headless mode |

## Deployment

### Docker

```bash
docker-compose -f docker-compose.yml up -d
```

### Kubernetes

See `k8s/` directory for manifests.

## Security Considerations

1. **API Authentication**: JWT-based (implement as needed)
2. **Rate Limiting**: Built-in per-endpoint rate limiting
3. **Input Validation**: Zod schemas on all inputs
4. **Secrets Management**: Use environment variables, never commit secrets
5. **Container Isolation**: Browser workers run in isolated contexts
6. **HTTPS**: Use reverse proxy (nginx/Traefik) in production

## Monitoring & Logging

- **Log Level**: Configurable via `LOG_LEVEL` env var
- **Structured Logging**: JSON format for log aggregation
- **Queue Metrics**: Check `/status` endpoint for queue statistics
- **Browser Status**: Monitor active pages and context usage

## Performance

- **Workflow Caching**: Learned workflows are cached in Redis
- **Parallel Execution**: Configurable concurrent workers
- **Timeout Management**: Automatic timeout handling with retry logic
- **Memory Optimization**: Page pooling to reduce memory footprint

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Test
npm run test

# Lint
npm run lint

# Format
npm run format
```

## Testing

```bash
# Unit tests
npm run test

# Coverage
npm run test:coverage

# Integration tests
npm run test:integration
```

## Troubleshooting

### Browser Worker Issues
- Check Docker logs: `docker-compose logs app`
- Verify Chromium installation: `docker-compose exec app which chromium`

### Database Connection
- Verify PostgreSQL is running: `docker-compose ps`
- Check logs: `docker-compose logs postgres`

### Queue Issues
- Check Redis: `redis-cli ping`
- Review queue status: `GET /status`

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
