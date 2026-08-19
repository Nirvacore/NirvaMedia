# NMD Platform API Documentation

Complete API reference for NMD Platform.

## Base URL

```
https://api.nmd.platform/v1
```

## Authentication

All requests require Bearer token authentication:

```
Authorization: Bearer <api-key>
```

Obtain API key from dashboard or via:
```bash
curl -X POST https://api.nmd.platform/v1/auth/generate-key \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'
```

## Response Format

All responses are JSON:

```json
{
  "success": true,
  "data": { /* response data */ },
  "error": null,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Error Handling

Errors follow standard HTTP status codes:

- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

Error response:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { /* additional info */ }
  }
}
```

## Content API

### Create Content

```
POST /content
```

Request:
```json
{
  "title": "My Article",
  "body": "# Article content\n\nBody text here",
  "type": "blog",
  "organizationId": "org_123",
  "metadata": {
    "author": "John Doe",
    "category": "technology"
  }
}
```

Response:
```json
{
  "id": "content_456",
  "title": "My Article",
  "body": "# Article content\n\nBody text here",
  "type": "blog",
  "status": "draft",
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

### Get Content

```
GET /content/:id
```

Response: Content object

### List Content

```
GET /content?organizationId=org_123&status=published&limit=10&offset=0
```

Query Parameters:
- `organizationId` (required): Organization ID
- `status`: Filter by status (draft, published, archived)
- `type`: Filter by type
- `limit`: Results per page (default: 10, max: 100)
- `offset`: Pagination offset (default: 0)

Response:
```json
{
  "data": [{ /* content objects */ }],
  "total": 50,
  "limit": 10,
  "offset": 0
}
```

### Update Content

```
PUT /content/:id
```

Request: Partial content object (only fields to update)

### Delete Content

```
DELETE /content/:id
```

### Publish Content

```
POST /content/:id/publish
```

### Archive Content

```
POST /content/:id/archive
```

## Templates API

### Create Template

```
POST /templates
```

Request:
```json
{
  "name": "Blog Post",
  "fields": {
    "title": { "type": "string", "required": true },
    "body": { "type": "text", "required": true },
    "tags": { "type": "array", "items": "string" }
  },
  "organizationId": "org_123"
}
```

### Get Template

```
GET /templates/:id
```

### List Templates

```
GET /templates?organizationId=org_123
```

### Update Template

```
PUT /templates/:id
```

### Delete Template

```
DELETE /templates/:id
```

## Metrics API

### Create Metric

```
POST /metrics
```

Request:
```json
{
  "name": "Page Views",
  "type": "counter",
  "organizationId": "org_123",
  "description": "Track page views"
}
```

### Record Metric

```
POST /metrics/:id/record
```

Request:
```json
{
  "value": 150,
  "timestamp": "2024-01-01T12:00:00Z",
  "tags": { "page": "/home" }
}
```

### Get Readings

```
GET /metrics/:id/readings?limit=100&period=7d
```

Query Parameters:
- `limit`: Number of readings (default: 100)
- `period`: Time period (1h, 1d, 7d, 30d)

### Get Statistics

```
GET /metrics/:id/stats?period=7d
```

Response:
```json
{
  "metric": "Page Views",
  "period": "7d",
  "count": 1050,
  "sum": 10500,
  "avg": 150.7,
  "min": 50,
  "max": 300,
  "stdDev": 45.2,
  "trend": "up",
  "trendPercent": 12.5
}
```

## Search API

### Full-Text Search

```
POST /search
```

Request:
```json
{
  "q": "search query",
  "organizationId": "org_123",
  "filters": [
    {
      "field": "type",
      "operator": "eq",
      "value": "blog"
    }
  ],
  "limit": 10,
  "offset": 0,
  "sortBy": "relevance"
}
```

Response:
```json
{
  "query": "search query",
  "totalResults": 42,
  "results": [
    {
      "id": "content_123",
      "type": "content",
      "title": "Result Title",
      "description": "Result description",
      "relevanceScore": 0.95,
      "matchedFields": ["title", "body"]
    }
  ],
  "facets": [
    {
      "field": "type",
      "values": [
        { "value": "blog", "count": 30 },
        { "value": "social", "count": 12 }
      ]
    }
  ],
  "executionTimeMs": 145,
  "suggestions": ["search query tips", "search related terms"]
}
```

### Get Suggestions

```
GET /search/suggest?q=search&organizationId=org_123
```

### Get Facets

```
GET /search/facets?field=category&organizationId=org_123
```

## AI Assistant API

### Generate Content

```
POST /ai/generate
```

Request:
```json
{
  "topic": "Artificial Intelligence",
  "type": "blog",
  "tone": "professional",
  "organizationId": "org_123",
  "targetAudience": "tech professionals",
  "keywords": ["AI", "ML"]
}
```

Response:
```json
{
  "id": "ai_content_123",
  "title": "Generated Title",
  "body": "Generated content...",
  "summary": "Brief summary",
  "suggestedTags": ["ai", "technology"],
  "readabilityScore": 78,
  "seoScore": 82,
  "generatedAt": "2024-01-01T12:00:00Z"
}
```

### Optimize Content

```
POST /ai/optimize
```

Request:
```json
{
  "content": "Content to optimize",
  "organizationId": "org_123"
}
```

Response:
```json
{
  "originalContent": "...",
  "optimizedContent": "...",
  "suggestions": [
    {
      "type": "clarity",
      "suggestion": "Simplify this sentence",
      "originalText": "...",
      "suggestedText": "...",
      "impact": "high"
    }
  ],
  "improvementScore": 78
}
```

### Suggest Titles

```
POST /ai/suggest-titles
```

Request:
```json
{
  "topic": "Topic",
  "count": 5,
  "organizationId": "org_123"
}
```

Response:
```json
{
  "topic": "Topic",
  "suggestions": [
    "Title Suggestion 1",
    "Title Suggestion 2"
  ]
}
```

## Webhooks API

### Subscribe to Event

```
POST /webhooks/subscribe
```

Request:
```json
{
  "event": "content.published",
  "url": "https://yourapp.com/webhook",
  "organizationId": "org_123",
  "headers": { "X-Custom-Header": "value" }
}
```

Response:
```json
{
  "id": "webhook_123",
  "event": "content.published",
  "url": "https://yourapp.com/webhook",
  "active": true,
  "createdAt": "2024-01-01T12:00:00Z"
}
```

### List Webhooks

```
GET /webhooks?organizationId=org_123
```

### Test Webhook

```
POST /webhooks/:id/test
```

Sends a test payload to verify webhook is working.

### Unsubscribe

```
DELETE /webhooks/:id
```

## Analytics API

### Get Dashboard

```
GET /analytics/dashboard?organizationId=org_123
```

### Get Metrics

```
GET /analytics/metrics?organizationId=org_123&period=7d
```

### Get Trends

```
GET /analytics/trends?organizationId=org_123&metric=page_views
```

### Get Report

```
GET /analytics/reports/:reportId?organizationId=org_123
```

## Health API

### Check Status

```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "cache": "healthy",
    "search": "healthy"
  }
}
```

### Check Readiness

```
GET /health/ready
```

### Get Metrics

```
GET /metrics/health
```

## Rate Limiting

API requests are rate-limited to 100 requests per 15 minutes.

Headers in response:
- `X-RateLimit-Limit`: 100
- `X-RateLimit-Remaining`: 95
- `X-RateLimit-Reset`: timestamp

## Pagination

List endpoints support pagination:

```
GET /endpoint?limit=10&offset=20
```

Default limit: 10
Maximum limit: 100

Response includes:
- `data`: Array of results
- `total`: Total number of items
- `limit`: Items per page
- `offset`: Current offset

## Batch Operations

Execute multiple operations in single request:

```
POST /batch
```

Request:
```json
{
  "operations": [
    {
      "method": "POST",
      "path": "/content",
      "body": { /* request body */ }
    },
    {
      "method": "GET",
      "path": "/content/123"
    }
  ]
}
```

## SDK Support

Official SDKs available:
- **TypeScript/JavaScript**: `@nmd/sdk`
- **Python**: `nmd-sdk`
- **Go**: `nmd-sdk-go`

See [sdk/README.md](../sdk/README.md) for usage.

## Support

- API Docs: https://docs.nmd.platform/api
- Issues: https://github.com/nirvacore/nirva-ai/issues
- Email: api-support@nmd.platform
