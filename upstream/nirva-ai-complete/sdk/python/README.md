# NMD Platform Python SDK

Official Python client library for NMD Platform.

## Installation

```bash
pip install nmd-sdk
```

## Quick Start

```python
import asyncio
from nmd_sdk import NMDClient, NMDConfig

async def main():
    # Initialize client
    config = NMDConfig(
        api_key="your-api-key",
        base_url="https://api.nmd.platform",
        timeout=30000,
        retries=3
    )
    
    client = NMDClient(config)
    
    # Create content
    content = await client.content.create({
        "title": "My Article",
        "body": "Content here",
        "type": "blog",
        "organizationId": "org_123"
    })
    
    print(f"Created: {content['id']}")

# Run async code
asyncio.run(main())
```

## API Reference

### Content Management

```python
# Create content
await client.content.create({
    "title": "Title",
    "body": "Body",
    "type": "blog",
    "organizationId": "org_id"
})

# Get content
await client.content.get("content_id")

# List content
await client.content.list("org_id", params={"status": "published"})

# Update content
await client.content.update("content_id", {"title": "New Title"})

# Delete content
await client.content.delete("content_id")

# Publish content
await client.content.publish("content_id")

# Archive content
await client.content.archive("content_id")
```

### Templates

```python
# Create template
await client.templates.create({
    "name": "Blog Template",
    "fields": {"title": {}, "body": {}},
    "organizationId": "org_id"
})

# Get template
await client.templates.get("template_id")

# List templates
await client.templates.list("org_id")

# Update template
await client.templates.update("template_id", {"name": "Updated"})
```

### Metrics

```python
# Create metric
await client.metrics.create({
    "name": "Page Views",
    "type": "counter",
    "organizationId": "org_id"
})

# Record value
await client.metrics.record("metric_id", 100)

# Get readings
await client.metrics.get_readings("metric_id", limit=100)

# Get statistics
await client.metrics.get_stats("metric_id", "7d")
```

### Search

```python
# Full-text search
await client.search.query({
    "q": "search term",
    "organizationId": "org_id",
    "limit": 10
})

# Get suggestions
await client.search.suggest("query", "org_id")

# Get facets
await client.search.facets("category", "org_id")
```

### AI Assistant

```python
# Generate content
await client.ai.generate_content({
    "topic": "AI",
    "type": "blog",
    "tone": "professional",
    "organizationId": "org_id"
})

# Optimize content
await client.ai.optimize_content({
    "content": "Your content",
    "organizationId": "org_id"
})

# Suggest titles
await client.ai.suggest_titles({
    "topic": "AI",
    "count": 5,
    "organizationId": "org_id"
})
```

### Analytics

```python
# Get dashboard
await client.analytics.get_dashboard("org_id")

# Get metrics
await client.analytics.get_metrics("org_id", "7d")

# Get trends
await client.analytics.get_trends("org_id", "page_views")

# Get report
await client.analytics.get_report("org_id", "report_id")
```

### Webhooks

```python
# Subscribe to event
await client.webhooks.subscribe({
    "event": "content.published",
    "url": "https://yourapp.com/webhook",
    "organizationId": "org_id"
})

# List webhooks
await client.webhooks.list("org_id")

# Test webhook
await client.webhooks.test("webhook_id")

# Unsubscribe
await client.webhooks.unsubscribe("webhook_id")
```

### Health Checks

```python
# Check status
await client.health.status()

# Check readiness
await client.health.ready()

# Get metrics
await client.health.metrics()
```

## Batch Operations

```python
batch = NMDBatchClient(client)

batch.add(lambda: client.content.create(...)) \
     .add(lambda: client.metrics.record(...)) \
     .add(lambda: client.search.query(...))

results = await batch.execute()
batch.reset()
```

## Error Handling

```python
try:
    await client.content.get("content_id")
except Exception as e:
    print(f"Error: {str(e)}")
```

## Configuration

```python
config = NMDConfig(
    api_key="your-api-key",          # Required
    base_url="https://api.nmd.platform",  # Optional
    timeout=30000,                    # Optional, in milliseconds
    retries=3                         # Optional
)
```

## Support

- Documentation: https://docs.nmd.platform
- Issues: https://github.com/nirvacore/nirva-ai/issues
- Email: support@nmd.platform
