# Deployment Guide

## Production Deployment Strategies

This guide covers deploying the Price Scraper service to different environments.

## Local Development

```bash
# Setup
make setup

# Start services
make docker-up

# Run migrations
make migrate

# Start development server
make dev
```

The service will be available at `http://localhost:3000`

## Docker Compose (Staging)

```bash
# Build and start
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Services running:
- PostgreSQL: `postgres:5432`
- Redis: `redis:6379`
- App: `:3000`

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.21+)
- `kubectl` configured
- Helm (optional)

### Database Setup

```bash
# Create namespace
kubectl create namespace price-scraper

# Create PostgreSQL PersistentVolume
kubectl apply -f k8s/postgres-pv.yaml

# Create PostgreSQL deployment
kubectl apply -f k8s/postgres.yaml

# Create Redis deployment
kubectl apply -f k8s/redis.yaml

# Wait for services to be ready
kubectl -n price-scraper wait --for=condition=ready pod -l app=postgres --timeout=300s
kubectl -n price-scraper wait --for=condition=ready pod -l app=redis --timeout=300s
```

### Application Deployment

```bash
# Create ConfigMap with environment variables
kubectl create configmap price-scraper-config \
  --from-env-file=.env \
  -n price-scraper

# Create Secret for sensitive data
kubectl create secret generic price-scraper-secrets \
  --from-literal=openai-api-key=$OPENAI_API_KEY \
  --from-literal=jwt-secret=$JWT_SECRET \
  -n price-scraper

# Deploy application
kubectl apply -f k8s/app-deployment.yaml

# Create service
kubectl apply -f k8s/service.yaml

# Create ingress
kubectl apply -f k8s/ingress.yaml

# Check deployment status
kubectl -n price-scraper rollout status deployment/price-scraper-app
```

### Scaling

```bash
# Scale to 3 replicas
kubectl -n price-scraper scale deployment price-scraper-app --replicas=3

# Auto-scale based on CPU
kubectl autoscale deployment price-scraper-app \
  --min=2 --max=10 \
  --cpu-percent=80 \
  -n price-scraper
```

### Monitoring

```bash
# Get pods
kubectl -n price-scraper get pods

# View logs
kubectl -n price-scraper logs -f deploy/price-scraper-app

# Port forward
kubectl -n price-scraper port-forward svc/price-scraper 3000:3000
```

## AWS ECS Deployment

### Create ECS Task Definition

```json
{
  "family": "price-scraper",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "price-scraper",
      "image": "your-ecr-url/price-scraper:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "hostPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgresql://..."
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/price-scraper",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Deploy with CloudFormation

```bash
aws cloudformation create-stack \
  --stack-name price-scraper \
  --template-body file://cloudformation/template.yaml \
  --parameters \
    ParameterKey=Environment,ParameterValue=production \
    ParameterKey=OpenAIKey,ParameterValue=$OPENAI_API_KEY
```

## Environment Configuration

### Production `.env`

```dotenv
NODE_ENV=production
LOG_LEVEL=info
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@db.example.com:5432/price_scraper
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=50

# Redis
REDIS_URL=redis://redis.example.com:6379

# AI
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4-turbo-preview

# Security
JWT_SECRET=your-very-long-random-secret-min-32-chars
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=900000

# Scraping
PLAYWRIGHT_HEADLESS=true
MAX_PARALLEL_WORKERS=8

# Proxy (if needed)
PROXY_ENABLED=false

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
DATADOG_API_KEY=...
```

## SSL/TLS Setup

### With Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name api.price-scraper.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://price-scraper:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # SSE support
        proxy_buffering off;
        proxy_cache off;
    }
}

server {
    listen 80;
    server_name api.price-scraper.com;
    return 301 https://$server_name$request_uri;
}
```

### With Let's Encrypt

```bash
certbot certonly --standalone \
  -d api.price-scraper.com \
  --email admin@price-scraper.com \
  --agree-tos
```

## Monitoring & Logging

### ELK Stack Setup

```yaml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      discovery.type: single-node
    ports:
      - "9200:9200"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
```

### Send Logs to Kibana

Update your logger to forward JSON logs to Elasticsearch.

## Backup & Recovery

### Database Backup

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup-20240120.sql
```

### Redis Backup

```bash
# RDB snapshot
redis-cli SAVE

# Copy snapshot
docker cp redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb
```

## Performance Tuning

### Database

```sql
-- Optimize indexes
CREATE INDEX CONCURRENTLY idx_jobs_created_efficient 
ON jobs(created_at DESC) WHERE status != 'completed';

-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM jobs WHERE workflow_id = 'xyz';
```

### Application

```env
# Increase database pool for higher concurrency
DATABASE_POOL_MAX=100

# Adjust worker concurrency
MAX_PARALLEL_WORKERS=16

# Cache optimization
REDIS_CACHE_TTL=3600
```

## Health Checks

### Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### AWS ECS

```json
"healthCheck": {
  "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
  "interval": 30,
  "timeout": 5,
  "retries": 3,
  "startPeriod": 60
}
```

## Rollback Procedure

### Docker Compose

```bash
# Rollback to previous version
docker-compose down
docker pull price-scraper:v1.2.0
docker-compose up -d
```

### Kubernetes

```bash
# Check rollout history
kubectl -n price-scraper rollout history deployment/price-scraper-app

# Rollback to previous revision
kubectl -n price-scraper rollout undo deployment/price-scraper-app

# Rollback to specific revision
kubectl -n price-scraper rollout undo deployment/price-scraper-app --to-revision=2
```

## Disaster Recovery

### RTO (Recovery Time Objective): < 5 minutes
### RPO (Recovery Point Objective): < 1 minute

1. Maintain automated backups
2. Test recovery procedures regularly
3. Document runbooks
4. Monitor critical metrics
5. Have standby infrastructure ready

## Security Hardening

### Application

- ✅ JWT authentication
- ✅ Rate limiting
- ✅ Input validation
- ✅ HTTPS enforced
- ✅ CORS configured
- ✅ Helmet security headers

### Infrastructure

- ✅ Network isolation
- ✅ VPC configuration
- ✅ Secrets management (AWS Secrets Manager, HashiCorp Vault)
- ✅ API Gateway authentication
- ✅ CloudTrail logging
- ✅ Regular security updates

## Compliance

- ✅ Data encryption in transit (TLS)
- ✅ Data encryption at rest (database)
- ✅ Audit logging
- ✅ GDPR compliance (data retention policies)
- ✅ SOC 2 readiness

## Support & Troubleshooting

See TROUBLESHOOTING.md for common issues and solutions.
