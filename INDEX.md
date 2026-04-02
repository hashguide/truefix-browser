# Project Documentation Index

## 📚 Documentation Map

### Getting Started
1. **[QUICKSTART.md](./QUICKSTART.md)** - Get running in 5 minutes
   - Quick commands
   - Basic API usage
   - Common operations

2. **[README.md](./README.md)** - Project overview
   - Features overview
   - Architecture introduction
   - Installation instructions

### Development

3. **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Developer guide
   - Project structure
   - Adding new websites
   - Working with workflows
   - Working with AI service
   - Testing guide
   - Common debugging tips

4. **[API.md](./API.md)** - REST API reference
   - All endpoints documented
   - Request/response examples
   - Error codes
   - Complete workflows

### Architecture & Design

5. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design
   - High-level architecture diagram
   - Component details
   - Data flow diagrams
   - Performance characteristics
   - Scalability information

### Deployment

6. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment
   - Local setup
   - Docker Compose
   - Kubernetes deployment
   - AWS ECS/CloudFormation
   - Environment configuration
   - SSL/TLS setup
   - Monitoring setup
   - Backup & recovery

### Troubleshooting

7. **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Issue resolution
   - Common problems & solutions
   - Installation issues
   - Database troubleshooting
   - API issues
   - Scraping issues
   - Queue issues
   - Browser issues
   - Debugging tips

## 🗂️ Project Structure

```
price-scraper/
├── README.md                    # Project overview
├── QUICKSTART.md                # Quick reference
├── API.md                       # API documentation
├── DEVELOPMENT.md               # Development guide
├── ARCHITECTURE.md              # System architecture
├── DEPLOYMENT.md                # Deployment guide
├── TROUBLESHOOTING.md           # Troubleshooting
│
├── src/
│   ├── index.ts                 # Application entry point
│   ├── api/                     # REST API layer
│   │   ├── server.ts            # Fastify configuration
│   │   ├── routes/              # API endpoints
│   │   │   ├── jobs.ts          # Job management
│   │   │   ├── workflows.ts     # Workflow queries
│   │   │   ├── status.ts        # System status
│   │   │   └── webhooks.ts      # Webhook management
│   │   └── middleware/          # Custom middleware
│   │       ├── auth.ts          # Authentication
│   │       └── validation.ts    # Input validation
│   │
│   ├── core/                    # Core services
│   │   ├── orchestrator/        # Job orchestration
│   │   │   └── service.ts
│   │   └── queue/               # Queue management
│   │       └── manager.ts
│   │
│   ├── ai/                      # AI integration
│   │   ├── service.ts           # OpenAI API wrapper
│   │   └── prompts/             # AI prompt templates
│   │
│   ├── browser/                 # Browser automation
│   │   └── worker/
│   │       └── manager.ts       # Playwright manager
│   │
│   ├── workflows/               # Workflow execution
│   │   ├── engine/
│   │   │   └── executor.ts      # Step execution
│   │   ├── templates.ts         # Site templates
│   │   └── storage.ts           # Workflow queries
│   │
│   ├── storage/                 # Data persistence
│   │   ├── db/
│   │   │   └── connection.ts    # PostgreSQL client
│   │   ├── migrations/          # Schema migrations
│   │   ├── workflows.ts         # Workflow queries
│   │   └── jobs.ts              # Job queries
│   │
│   └── common/                  # Shared utilities
│       ├── types/               # TypeScript types
│       ├── config/              # Configuration
│       └── logging/             # Logger setup
│
├── docker/
│   └── Dockerfile               # Multi-stage build
│
├── tests/
│   ├── unit/                    # Unit tests
│   └── integration/             # Integration tests
│
├── scripts/
│   ├── setup.sh                 # Initial setup
│   ├── health-check.sh          # Health checking
│   ├── test.sh                  # Test runner
│   └── clean.sh                 # Cleanup
│
├── .github/workflows/
│   └── ci.yml                   # GitHub Actions CI/CD
│
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── docker-compose.yml           # Local deployment
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── Makefile                     # Common commands
└── vitest.config.ts             # Test configuration
```

## 🚀 Quick Start Commands

```bash
# First time setup
make setup

# Development
make dev              # Start with hot reload
make build            # Build TypeScript
make test             # Run tests

# Docker
make docker-up        # Start all services
make docker-down      # Stop all services

# Database
make migrate          # Run migrations
npm run db:seed       # Seed sample data

# Utilities
make lint             # Run ESLint
make format           # Format with Prettier
make clean            # Clean dependencies
```

## 🔗 Important Files

### Configuration
- `.env.example` - Environment variables template
- `tsconfig.json` - TypeScript compiler options
- `docker-compose.yml` - Docker services orchestration
- `vitest.config.ts` - Test framework configuration

### Entry Points
- `src/index.ts` - Application startup
- `src/api/server.ts` - API server
- `src/core/orchestrator/service.ts` - Main orchestrator

### Key Services
- `src/ai/service.ts` - OpenAI integration
- `src/browser/worker/manager.ts` - Browser pool
- `src/core/queue/manager.ts` - Job queue
- `src/workflows/engine/executor.ts` - Workflow engine

## 📖 Reading Order

### For New Developers
1. Start with: **QUICKSTART.md**
2. Read: **README.md**
3. Explore: **DEVELOPMENT.md**
4. Deep dive: **ARCHITECTURE.md**

### For DevOps/SRE
1. Start with: **DEPLOYMENT.md**
2. Reference: **ARCHITECTURE.md**
3. Troubleshoot: **TROUBLESHOOTING.md**

### For API Consumers
1. Start with: **API.md**
2. Reference: **QUICKSTART.md**
3. Validate: **TROUBLESHOOTING.md**

## 🛠️ Development Tools Setup

```bash
# Install Node.js 20+
brew install node  # macOS
# or download from nodejs.org

# Install Docker
brew install docker  # macOS
# or download from docker.com

# Install make (optional but recommended)
brew install make  # macOS or already included on Linux

# IDE Recommendations
# VSCode with extensions:
# - ESLint
# - Prettier
# - TypeScript
# - REST Client
```

## 🔍 Key Concepts

### Workflows
- **Definition**: Step-by-step automation for websites
- **Discovery**: AI generates workflows automatically
- **Versioning**: Track changes and enable rollback
- **Success Rate**: Metrics for workflow reliability

### Jobs
- **Types**: `part_search`, `labor_lookup`
- **Status**: queued → running → completed/failed
- **Results**: Parts with prices, or labor hours
- **Retry**: Automatic retry with exponential backoff

### Queues
- **scrape-jobs**: Main extraction tasks (4 workers)
- **workflow-discovery**: Learn new websites (2 workers)
- **workflow-repair**: Fix broken selectors (2 workers)

### AI Service
- **Discovery**: Generate workflow from website
- **Validation**: Verify extracted data quality
- **Repair**: Fix broken selectors when sites change

## 🔐 Security Checklist

Before deployment:
- [ ] Update `JWT_SECRET` (32+ chars)
- [ ] Set `OPENAI_API_KEY`
- [ ] Update database credentials
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS origins
- [ ] Enable rate limiting
- [ ] Set up secrets management
- [ ] Configure firewalls/security groups

## 📊 Performance Tuning

Reference: **ARCHITECTURE.md** section "Performance Characteristics"

Key levers:
- `MAX_PARALLEL_WORKERS` - Concurrent scraping tasks
- `DATABASE_POOL_MAX` - Database connections
- `SCRAPER_TIMEOUT` - Per-request timeout
- Redis cache TTL - Result caching

## 🐛 Common Issues

Quick links to solutions:
- Installation issues → **TROUBLESHOOTING.md** - "Installation & Setup"
- Database problems → **TROUBLESHOOTING.md** - "Database Issues"
- API errors → **TROUBLESHOOTING.md** - "API Issues"
- Scraping failures → **TROUBLESHOOTING.md** - "Scraping Issues"

## 📞 Support Resources

1. **Documentation** - Start here for questions
2. **Troubleshooting Guide** - For common issues
3. **Architecture Docs** - For system understanding
4. **Code Examples** - In DEVELOPMENT.md

## 🎯 Next Steps

1. **Setup**: Follow QUICKSTART.md
2. **Learn API**: Read API.md
3. **Understand System**: Study ARCHITECTURE.md
4. **Deploy**: Follow DEPLOYMENT.md
5. **Extend**: Create custom scrapers per DEVELOPMENT.md

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Status**: Production Ready
