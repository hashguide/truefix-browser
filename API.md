# API Documentation

## Base URL

```
http://localhost:3000
```

## Authentication

Currently, the API uses JWT tokens. Include the token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Or use API key header:

```
X-API-Key: <api-key>
```

## Endpoints

### Jobs API

#### Create Job

Creates a new scraping job.

```
POST /jobs
Content-Type: application/json
```

Request:
```json
{
  "type": "part_search",
  "vehicle": {
    "year": 2015,
    "make": "Toyota",
    "model": "Camry"
  },
  "query": {
    "part": "brake pads"
  }
}
```

Response (202 Accepted):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "createdAt": "2024-01-20T10:30:00Z",
  "_links": {
    "self": { "href": "/jobs/550e8400-e29b-41d4-a716-446655440000" },
    "stream": { "href": "/jobs/550e8400-e29b-41d4-a716-446655440000/stream" }
  }
}
```

#### Get Job

Retrieve job status and results.

```
GET /jobs/:id
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "part_search",
  "status": "completed",
  "input": { "vehicle": { "year": 2015, "make": "Toyota", "model": "Camry" } },
  "result": {
    "parts": [
      {
        "source": "autozone.com",
        "price": 45.99,
        "title": "Raybestos Premium Brake Pads",
        "url": "https://...",
        "availability": "In Stock"
      }
    ]
  },
  "attempts": 1,
  "maxAttempts": 3,
  "createdAt": "2024-01-20T10:30:00Z",
  "updatedAt": "2024-01-20T10:35:00Z",
  "completedAt": "2024-01-20T10:35:00Z"
}
```

#### Stream Job Progress

Get real-time updates using Server-Sent Events (SSE).

```
GET /jobs/:id/stream
```

Response (streaming):
```
data: {"jobId":"550e8400...","status":"running","timestamp":"2024-01-20T10:30:05Z"}
data: {"jobId":"550e8400...","status":"completed","result":{...},"timestamp":"2024-01-20T10:35:00Z"}
```

#### List Recent Jobs

```
GET /jobs?limit=50
```

Response:
```json
{
  "jobs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "part_search",
      "status": "completed",
      "createdAt": "2024-01-20T10:30:00Z",
      "completedAt": "2024-01-20T10:35:00Z",
      "_links": {
        "self": { "href": "/jobs/550e8400-e29b-41d4-a716-446655440000" }
      }
    }
  ],
  "total": 1,
  "_links": {
    "self": { "href": "/jobs" }
  }
}
```

### Workflows API

#### List Workflows

```
GET /workflows
```

Response:
```json
{
  "workflows": [
    {
      "id": "wf-001",
      "domain": "autozone.com",
      "path": "/jobs/part-search",
      "version": 2,
      "successRate": 0.95,
      "totalRuns": 100,
      "lastSuccessfulRun": "2024-01-20T09:00:00Z",
      "createdAt": "2024-01-10T00:00:00Z",
      "updatedAt": "2024-01-20T10:00:00Z"
    }
  ],
  "total": 1
}
```

#### Get Workflow

```
GET /workflows/:id
```

Response:
```json
{
  "id": "wf-001",
  "domain": "autozone.com",
  "path": "/jobs/part-search",
  "version": 2,
  "steps": [
    { "type": "navigate", "url": "https://autozone.com" },
    { "type": "input", "selector": "#year", "valueKey": "year" },
    { "type": "extract", "selector": ".results", "key": "parts", "multiple": true }
  ],
  "selectors": {
    "yearInput": "#year",
    "makeInput": "#make",
    "partResults": ".results"
  },
  "validationRules": [
    { "key": "parts", "required": true, "type": "array" },
    { "key": "price", "required": true, "type": "number" }
  ],
  "successRate": 0.95,
  "totalRuns": 100,
  "createdAt": "2024-01-10T00:00:00Z",
  "updatedAt": "2024-01-20T10:00:00Z"
}
```

### Status API

#### System Status

```
GET /status
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00Z",
  "services": {
    "browser": {
      "initialized": true,
      "activePages": 2,
      "maxConcurrent": 4,
      "contexts": 2
    },
    "queue": {
      "scrapeJobs": {
        "active": 2,
        "waiting": 5,
        "completed": 150,
        "failed": 3
      }
    }
  }
}
```

### Webhooks API

#### Subscribe to Events

```
POST /webhooks/subscribe
Content-Type: application/json
```

Request:
```json
{
  "url": "https://your-service.com/webhook",
  "events": ["job.completed", "job.failed"]
}
```

Response (201 Created):
```json
{
  "id": "sub-001",
  "url": "https://your-service.com/webhook",
  "events": ["job.completed", "job.failed"],
  "active": true,
  "createdAt": "2024-01-20T10:30:00Z"
}
```

#### Get Webhook Subscription

```
GET /webhooks/:id
```

#### Unsubscribe

```
DELETE /webhooks/:id
```

Response: 204 No Content

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "details": []
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `JOB_NOT_FOUND` | 404 | Job ID not found |
| `WORKFLOW_NOT_FOUND` | 404 | Workflow ID not found |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limiting

The API implements rate limiting:

- **Limit**: 100 requests per 15 minutes
- **Header**: `X-RateLimit-Remaining`
- **Response Code**: 429 Too Many Requests

## Pagination

For list endpoints:

```
GET /jobs?limit=50&offset=0
```

Parameters:
- `limit`: Results per page (default: 50, max: 500)
- `offset`: Starting position (default: 0)

## Examples

### Complete Workflow: Search and Stream Results

```bash
# 1. Create job
JOB_ID=$(curl -s -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "part_search",
    "vehicle": {"year": 2015, "make": "Toyota", "model": "Camry"},
    "query": {"part": "brake pads"}
  }' | jq -r '.id')

echo "Job ID: $JOB_ID"

# 2. Stream progress
curl http://localhost:3000/jobs/$JOB_ID/stream

# 3. Get final results
curl http://localhost:3000/jobs/$JOB_ID
```

### Using Webhooks

```bash
# Subscribe to job completion
curl -X POST http://localhost:3000/webhooks/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/webhook",
    "events": ["job.completed", "job.failed"]
  }'
```

When a job completes, we'll POST:

```json
{
  "id": "evt-001",
  "event": "job.completed",
  "timestamp": "2024-01-20T10:35:00Z",
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "result": { "parts": [...] }
  }
}
```
