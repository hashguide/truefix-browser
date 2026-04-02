# Quick Reference

## Getting Started (5 minutes)

```bash
# 1. Setup project
make setup

# 2. Start development
make dev

# 3. Create your first job
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "part_search",
    "vehicle": {"year": 2015, "make": "Toyota", "model": "Camry"},
    "query": {"part": "brake pads"}
  }'

# 4. Get results
curl http://localhost:3000/jobs/{job-id}
```

## Common Commands

```bash
# Development
make dev                    # Start dev server
make build                  # Build TypeScript
make test                   # Run tests
make lint                   # Run linter
make format                 # Format code

# Docker
make docker-up              # Start services
make docker-down            # Stop services
docker-compose logs -f      # View logs

# Database
make migrate                # Run migrations
npm run db:seed             # Seed sample data
```

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `OPENAI_API_KEY` | Yes | - | OpenAI API authentication |
| `DATABASE_URL` | Yes | postgres://... | PostgreSQL connection |
| `REDIS_URL` | Yes | redis://... | Redis connection |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `NODE_ENV` | No | development | Environment (dev/prod) |
| `PORT` | No | 3000 | API server port |
| `LOG_LEVEL` | No | info | Logging level |

## API Endpoints

```bash
# Jobs
POST   /jobs                 # Create job
GET    /jobs/:id             # Get job status
GET    /jobs/:id/stream      # Stream progress (SSE)
GET    /jobs                 # List recent jobs

# Workflows
GET    /workflows            # List workflows
GET    /workflows/:id        # Get workflow details

# System
GET    /health               # Health check
GET    /status               # System status

# Webhooks
POST   /webhooks/subscribe   # Subscribe to events
GET    /webhooks/:id         # Get subscription
DELETE /webhooks/:id         # Unsubscribe
```

## Job Status Lifecycle

```
queued
  ↓
running
  ├→ completed (success)
  ├→ failed (max retries exceeded)
  └→ queued (retry via queue)
```

## Error Codes

```
VALIDATION_ERROR         400  Input validation failed
JOB_NOT_FOUND           404  Job doesn't exist
WORKFLOW_NOT_FOUND      404  Workflow doesn't exist
UNAUTHORIZED            401  Authentication failed
MAX_ATTEMPTS_EXCEEDED   500  Job failed after retries
BROWSER_ERROR           500  Browser/Playwright error
WORKFLOW_ERROR          500  Workflow execution error
AI_ERROR                500  AI service error
```

## File Structure Reference

```
src/
├── index.ts                 # Main entry point
├── api/                     # REST API
├── core/                    # Core services
├── ai/                      # AI integration
├── browser/                 # Playwright browser
├── workflows/               # Workflow execution
├── storage/                 # Data persistence
├── common/                  # Shared utilities
└── validators/              # Input validation

docker/                      # Docker configs
tests/                       # Test files
scripts/                     # Utility scripts
docs/                        # Documentation
```

## Workflow Step Types

```typescript
navigate     // Load URL
click        // Click element
input        // Fill form field
wait         // Delay execution
extract      // Get data from DOM
evaluate     // Run JavaScript
```

## Debugging Checklist

- [ ] Check logs: `docker-compose logs -f app`
- [ ] Verify env vars: `echo $OPENAI_API_KEY`
- [ ] Test connectivity: `curl http://localhost:3000/health`
- [ ] Check database: `psql $DATABASE_URL`
- [ ] Monitor services: `docker-compose ps`
- [ ] View queue status: `curl http://localhost:3000/status`

## Performance Tips

1. **Reuse workflows** - Learned workflows are cached
2. **Optimize selectors** - Use specific, stable selectors
3. **Parallel execution** - Scale workers for more throughput
4. **Caching** - Redis caches frequently accessed data
5. **Monitoring** - Track success rates and optimize

## Security Checklist

- [ ] JWT_SECRET is 32+ characters
- [ ] OPENAI_API_KEY is not in version control
- [ ] Database credentials are in .env
- [ ] HTTPS enforced in production
- [ ] Rate limiting enabled
- [ ] CORS properly configured

## Deployment Quick Links

- **Local**: `make docker-up` → http://localhost:3000
- **Staging**: See DEPLOYMENT.md
- **Production**: See DEPLOYMENT.md + ARCHITECTURE.md

## Resources

- API Docs: [API.md](./API.md)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Development: [DEVELOPMENT.md](./DEVELOPMENT.md)
- Deployment: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Troubleshooting: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Workflows: [Website Templates](./src/workflows/templates.ts)

## Support

For issues and questions:
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review logs: `docker-compose logs app`
3. Check [DEVELOPMENT.md](./DEVELOPMENT.md) for examples
4. Open GitHub issue with:
   - Error message
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant logs (redact secrets)
