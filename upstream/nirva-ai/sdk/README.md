# NMD Platform TypeScript SDK

Official TypeScript client library for the NMD (Nirva Media Operations) Platform.

## Features

- **Type-Safe**: Full TypeScript support with strict typing
- **Resilient**: Automatic retry logic with exponential backoff
- **Simple**: Intuitive API design following REST conventions
- **Complete**: Full coverage of all platform endpoints
- **Production-Ready**: Battle-tested security and error handling

## Installation

```bash
npm install @nmd/sdk
# or
yarn add @nmd/sdk
```

## Quick Start

```typescript
import NMDClient from '@nmd/sdk';

const client = new NMDClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.nmd.platform',
  timeout: 30000,
  retries: 3,
});

// Create content
const content = await client.content.create({
  title: 'My First Post',
  body: 'Hello, NMD!',
  type: 'blog',
  organizationId: 'org_123',
});
```

## Configuration

```typescript
interface NMDConfig {
  apiKey: string;           // Required: Your API key
  baseUrl?: string;         // Optional: Base URL (default: https://api.nmd.platform)
  timeout?: number;         // Optional: Request timeout in ms (default: 30000)
  retries?: number;         // Optional: Max retries on 5xx errors (default: 3)
}
```

## API Reference

### Content API

Create, read, update, and delete content.

```typescript
// Create content
await client.content.create({
  title: 'Title',
  body: 'Body',
  type: 'blog' | 'social' | 'email' | 'video',
  organizationId: 'org_id',
});

// Get single content
await client.content.get('content_id');

// List content
await client.content.list('org_id', {
  params: { status: 'published', limit: 10 },
});

// Update content
await client.content.update('content_id', {
  title: 'New Title',
  status: 'archived',
});

// Delete content
await client.content.delete('content_id');

// Publish content
await client.content.publish('content_id');

// Archive content
await client.content.archive('content_id');
```

### Templates API

Manage reusable content templates.

```typescript
// Create template
await client.templates.create({
  name: 'Blog Template',
  fields: {
    title: { type: 'string', required: true },
    body: { type: 'text', required: true },
  },
  organizationId: 'org_id',
});

// Get template
await client.templates.get('template_id');

// List templates
await client.templates.list('org_id');

// Update template
await client.templates.update('template_id', {
  name: 'Updated Template',
});
```

### Metrics API

Track and analyze custom metrics.

```typescript
// Create metric
await client.metrics.create({
  name: 'Page Views',
  type: 'counter',
  organizationId: 'org_id',
});

// Record metric value
await client.metrics.record('metric_id', 1500);

// Get metric readings
await client.metrics.getReadings('metric_id', 100);

// Get metric statistics
await client.metrics.getStats('metric_id', '7d');
```

### Analytics API

Access analytics and insights.

```typescript
// Get dashboard
await client.analytics.getDashboard('org_id');

// Get metrics
await client.analytics.getMetrics('org_id', '7d');

// Get trends
await client.analytics.getTrends('org_id', 'page_views');

// Get report
await client.analytics.getReport('org_id', 'report_id');
```

### Search API

Full-text search with filtering and faceting.

```typescript
// Search content
await client.search.query({
  q: 'search term',
  filters: undefined,
  limit: 10,
  organizationId: 'org_id',
});

// Get suggestions
await client.search.suggest('query', 'org_id');

// Get facets
await client.search.facets('category', 'org_id');
```

### AI Assistant API

AI-powered content generation and optimization.

```typescript
// Generate content
await client.ai.generateContent({
  topic: 'AI',
  type: 'blog',
  tone: 'professional',
  organizationId: 'org_id',
});

// Optimize content
await client.ai.optimizeContent({
  content: 'Your content here',
  organizationId: 'org_id',
});

// Suggest titles
await client.ai.suggestTitles({
  topic: 'AI',
  count: 5,
  organizationId: 'org_id',
});
```

### Webhooks API

Subscribe to platform events.

```typescript
// Subscribe to event
await client.webhooks.subscribe({
  event: 'content.published',
  url: 'https://yourapp.com/webhook',
  organizationId: 'org_id',
});

// List webhooks
await client.webhooks.list('org_id');

// Test webhook
await client.webhooks.test('webhook_id');

// Unsubscribe
await client.webhooks.unsubscribe('webhook_id');
```

### Health API

Check platform status and health.

```typescript
// Get API status
await client.health.status();

// Check readiness
await client.health.ready();

// Get system metrics
await client.health.metrics();
```

## Batch Operations

Execute multiple operations in parallel.

```typescript
import { NMDBatchClient } from '@nmd/sdk';

const batch = new NMDBatchClient(client);

batch
  .add(async () =>
    client.content.create({...})
  )
  .add(async () =>
    client.metrics.record('metric_id', 100)
  )
  .add(async () =>
    client.search.query({...})
  );

const results = await batch.execute();
```

## Error Handling

The SDK automatically retries failed requests with exponential backoff.

```typescript
try {
  await client.content.get('content_id');
} catch (error) {
  if (error instanceof Error) {
    console.error('NMD Error:', error.message);
  }
}
```

Errors include:
- `HTTP 4xx`: Client errors (validation, auth, permissions)
- `HTTP 5xx`: Server errors (retried automatically)
- Network timeouts (retried automatically)

## TypeScript Support

Full TypeScript definitions included.

```typescript
import type { NMDConfig, RequestOptions } from '@nmd/sdk';

const config: NMDConfig = {
  apiKey: 'key',
  timeout: 30000,
};
```

## Examples

See `examples/` directory for complete examples:
- `basic-usage.ts` - Common operations
- More examples coming soon

## Authentication

All requests require an API key:

```bash
export NMD_API_KEY=your-api-key
```

Or pass directly to client:

```typescript
const client = new NMDClient({
  apiKey: process.env.NMD_API_KEY,
});
```

## Rate Limiting

The platform enforces rate limits:
- Default: 100 requests per 15 minutes
- Check response headers for limit info

## Timeouts

Default timeout is 30 seconds. Adjust as needed:

```typescript
const client = new NMDClient({
  apiKey: 'key',
  timeout: 60000, // 60 seconds
});
```

## Contributing

Please read our contributing guidelines before submitting PRs.

## License

MIT License - See LICENSE file for details

## Support

- Documentation: https://docs.nmd.platform
- Issues: https://github.com/nirvacore/nirva-ai/issues
- Email: support@nmd.platform
