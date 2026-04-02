# Troubleshooting Guide

## Common Issues & Solutions

### Installation & Setup

#### "npm install" fails

**Problem**: Dependencies installation fails

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Check for system package requirements
npm list --depth=0
```

#### Docker containers won't start

**Problem**: Containers fail to start or immediately exit

**Solutions**:
```bash
# Check Docker daemon
docker ps

# View container logs
docker-compose logs postgres
docker-compose logs redis
docker-compose logs app

# Remove old containers
docker-compose down -v
docker volume prune

# Rebuild images
docker-compose build --no-cache
docker-compose up
```

#### Port already in use

**Problem**: "Address already in use" error for port 3000, 5432, or 6379

**Solutions**:
```bash
# Check what's using the port
lsof -i :3000
lsof -i :5432
lsof -i :6379

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
# ports:
#   - "3001:3000"
```

---

### Database Issues

#### Database migration fails

**Problem**: "tables already exist" or "migrations not found"

**Solutions**:
```bash
# Check database connection
psql $DATABASE_URL -c "\dt"

# Reset database (development only!)
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-run migrations
npm run db:migrate

# Verify tables
psql $DATABASE_URL -c "\d+"
```

#### Database connection timeout

**Problem**: "connect ECONNREFUSED 127.0.0.1:5432"

**Solutions**:
```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check if service is healthy
docker-compose ps

# Wait for database to be ready
sleep 30

# Test connection
pg_isready -h localhost -p 5432

# Update .env with correct DATABASE_URL
DATABASE_URL=postgresql://admin:password@postgres:5432/price_scraper
```

#### Query performance issues

**Problem**: Slow queries, high CPU/memory usage

**Solutions**:
```sql
-- Check slow queries
SELECT query, calls, total_time 
FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;

-- Add indexes
CREATE INDEX idx_jobs_workflow_id ON jobs(workflow_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_workflows_domain_path ON workflows(domain, path);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM jobs WHERE status = 'completed';

-- Vacuum and analyze
VACUUM ANALYZE;
```

---

### API Issues

#### "401 Unauthorized" on API calls

**Problem**: JWT token validation fails

**Solutions**:
```bash
# Generate valid JWT token
curl -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin"}'

# Use token in requests
curl -H "Authorization: Bearer <token>" http://localhost:3000/jobs

# Check JWT_SECRET is set
echo $JWT_SECRET

# Update .env with valid secret (min 32 chars)
JWT_SECRET=your-very-long-secret-min-32-chars
```

#### "429 Too Many Requests" error

**Problem**: Rate limit exceeded

**Solutions**:
```bash
# Wait before retrying
sleep 60

# Check rate limit settings in .env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900000  # 15 minutes

# Contact admin to increase limits for your API key

# Or disable rate limiting (development only)
RATE_LIMIT_ENABLED=false
```

#### CORS errors on client

**Problem**: "Access to XMLHttpRequest blocked by CORS policy"

**Solutions**:
```bash
# Update .env to allow your domain
ALLOWED_ORIGINS=http://localhost:3000,https://yourapp.com

# Or allow all (development only)
# Check src/api/server.ts CORS config
```

#### "Connection refused" to local API

**Problem**: Cannot connect to http://localhost:3000

**Solutions**:
```bash
# Verify service is running
curl http://localhost:3000/health

# View service logs
npm run dev

# Check if port is correct
# API should be on port 3000 by default

# If using Docker
docker-compose logs -f app
```

---

### Scraping Issues

#### "Element not found" errors

**Problem**: Workflow selector doesn't match elements

**Common Causes & Solutions**:

1. **Website updated its HTML structure**
   ```bash
   # System will automatically trigger repair
   # Or manually trigger by viewing job logs
   curl http://localhost:3000/jobs/<job-id>
   ```

2. **Dynamic content not loaded**
   ```typescript
   // Solution: Add wait steps before extraction
   { type: "wait", ms: 2000 },  // Wait for JS to render
   { type: "click", selector: ".load-more" },
   { type: "wait", ms: 1000 }
   ```

3. **Selector is too specific**
   ```typescript
   // Bad selector
   selector: "div.container > div.row > div.col-md-4 > a"
   
   // Better selector
   selector: "[data-product-id]"
   ```

#### Scraping takes too long

**Problem**: Jobs timeout after 30 seconds

**Solutions**:
```bash
# Increase timeout in .env
SCRAPER_TIMEOUT=60000  # 60 seconds

# Reduce wait times in workflow
# Instead of: { type: "wait", ms: 5000 }
# Use: { type: "click", selector: "button", waitForNavigation: true }

# Check network conditions
# Add request intercepts to skip heavy resources

# Reduce parallel workers during slow sites
MAX_PARALLEL_WORKERS=2
```

#### "Browser crashed" or timeout errors

**Problem**: Playwright browser crashes

**Solutions**:
```bash
# Increase memory allocation
# Docker: memory limit in docker-compose.yml

# Check system resources
free -h
df -h

# Restart browser worker
# This happens automatically on next job

# Disable headless (for debugging)
PLAYWRIGHT_HEADLESS=false

# Check Chromium installation
which chromium
chromium --version
```

#### Cannot connect to website

**Problem**: "ERR_CONNECTION_REFUSED" or "ERR_NAME_NOT_RESOLVED"

**Solutions**:
```bash
# Test network connectivity
ping -c 3 autozone.com
curl https://autozone.com

# Check if site is accessible
# Some sites may block automation

# Enable proxy support
PROXY_ENABLED=true
PROXY_URL=http://proxy.example.com:8080

# Retry with network delay
{ type: "wait", ms: 1000 }  # Between steps
```

#### Data extraction is incomplete

**Problem**: Results missing price or other fields

**Solutions**:
```typescript
// 1. Debug extracted data
await page.screenshot({ path: 'debug.png' })
const html = await page.content()
console.log(html)

// 2. Use correct extraction attribute
{ type: "extract", selector: ".price", attribute: "text" }  // Not "value"

// 3. Handle multiple results
{ type: "extract", selector: ".item", key: "items", multiple: true }

// 4. Parse extracted text
// AI should handle validation automatically
```

---

### Queue Issues

#### Jobs stuck in "running" state

**Problem**: Jobs never complete, stay in running state

**Solutions**:
```bash
# Check Redis connection
redis-cli ping

# Monitor queue
npm run dev  # View worker logs

# Check job in database
psql $DATABASE_URL -c \
  "SELECT id, status, attempts FROM jobs WHERE status='running';"

# Manually reset job (use carefully)
psql $DATABASE_URL -c \
  "UPDATE jobs SET status='queued', attempts=0 WHERE id='job-id';"

# Restart workers
docker-compose restart app
```

#### "NOAUTH Authentication required" error

**Problem**: Redis connection refused

**Solutions**:
```bash
# Check Redis is running
redis-cli ping

# Verify REDIS_URL format
# Should be: redis://localhost:6379
# Or: redis://:password@host:port

# Check credentials
redis-cli -a password ping

# Update .env
REDIS_URL=redis://localhost:6379
```

---

### AI Service Issues

#### "OpenAI API key invalid" errors

**Problem**: AI service calls fail with 401

**Solutions**:
```bash
# Check API key format
echo $OPENAI_API_KEY
# Should start with: sk-

# Verify key is active
# Log in to https://platform.openai.com/account/api-keys

# Test connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Update .env
OPENAI_API_KEY=sk-your-real-key

# Enable AI debug logging
LOG_LEVEL=debug
```

#### "Rate limit exceeded" from OpenAI

**Problem**: OpenAI API rate limit hit

**Solutions**:
```bash
# Wait before retrying (exponential backoff built-in)
# Or upgrade OpenAI account

# Reduce AI calls
AI_ENABLED=false  # For testing without AI

# Check usage
# https://platform.openai.com/account/usage/overview
```

#### AI generates invalid workflows

**Problem**: Discovered workflows have wrong selectors

**Solutions**:
```bash
# Lower confidence threshold triggers manual review
# Check aiResponse.confidence in logs

# Improve AI prompts
# Edit src/ai/prompts/ files

# Manually create workflow for that site
# See DEVELOPMENT.md

# Increase screenshot quality for AI analysis
// In browser worker, increase resolution
viewport: { width: 1920, height: 1080 }
```

---

### Browser & Playwright Issues

#### "Timeout waiting for element"

**Problem**: Element interaction fails with timeout

**Solutions**:
```typescript
// 1. Increase element visibility timeout
await page.locator(selector).isVisible({ timeout: 10000 })

// 2. Scroll element into view
await page.locator(selector).scrollIntoViewIfNeeded()

// 3. Wait for element with dynamic content
await page.waitForSelector(selector)

// 4. Add additional waits
{ type: "wait", ms: 2000 }
```

#### Browser memory leak

**Problem**: Memory usage increases continuously

**Solutions**:
```typescript
// Ensure pages are released properly
try {
  const page = await browserWorker.getPage()
  // ... use page
} finally {
  await browserWorker.releasePage(page)  // CRITICAL
}

// Check for page.evaluate memory issues
// Avoid storing large data in page context

// Monitor with
docker stats
```

---

### Monitoring & Debugging

#### Enable detailed logging

```bash
# Debug level
LOG_LEVEL=debug npm run dev

# Trace level (very verbose)
LOG_LEVEL=trace npm run dev

# View logs from Docker
docker-compose logs -f app
docker-compose logs -f --tail=100 app
```

#### Performance profiling

```bash
# Node profiler
node --prof dist/index.js
node --prof-process isolate-*.log > profile.txt

# Memory snapshot
heapdump  # npm install heapdump

# CPU flame graph
0x dist/index.js
```

#### Database debugging

```bash
# Log all queries (PostgreSQL)
ALTER SYSTEM SET log_min_duration_statement = 0;
SELECT pg_reload_conf();

# Monitor connections
SELECT * FROM pg_stat_activity;

# Kill slow queries
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'active' AND duration > 60000;
```

---

## Getting Help

### Before reporting issue

1. ✅ Check this troubleshooting guide
2. ✅ View logs: `docker-compose logs`
3. ✅ Check error codes in API response
4. ✅ Verify environment variables
5. ✅ Test basic connectivity

### Reporting issues

Include:
- Stack trace / error message
- Logs (redact sensitive data)
- Configuration (.env without secrets)
- Steps to reproduce
- Expected vs actual behavior

### Emergency contacts

- Database issues: DBA team
- AI service issues: AI team
- Infrastructure issues: DevOps team
- General issues: Tech support
