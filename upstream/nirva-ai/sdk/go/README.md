# NMD Platform Go SDK

Official Go client library for NMD Platform.

## Installation

```bash
go get github.com/nirvacore/nmd-sdk-go
```

## Quick Start

```go
package main

import (
	"fmt"
	"log"
	
	"github.com/nirvacore/nmd-sdk-go"
)

func main() {
	config := &nmd.Config{
		APIKey:  "your-api-key",
		BaseURL: "https://api.nmd.platform",
		Timeout: 30 * time.Second,
		Retries: 3,
	}
	
	client := nmd.NewClient(config)
	
	// Create content
	content, err := client.Content.Create(map[string]interface{}{
		"title":          "My Article",
		"body":           "Content here",
		"type":           "blog",
		"organizationId": "org_123",
	})
	if err != nil {
		log.Fatal(err)
	}
	
	fmt.Printf("Created: %v\n", content["id"])
}
```

## API Reference

### Content Management

```go
// Create content
content, err := client.Content.Create(map[string]interface{}{
	"title":          "Title",
	"body":           "Body",
	"type":           "blog",
	"organizationId": "org_id",
})

// Get content
content, err := client.Content.Get("content_id")

// List content
list, err := client.Content.List("org_id", map[string]interface{}{
	"status": "published",
})

// Update content
updated, err := client.Content.Update("content_id", map[string]interface{}{
	"title": "New Title",
})

// Delete content
err := client.Content.Delete("content_id")

// Publish content
published, err := client.Content.Publish("content_id")

// Archive content
archived, err := client.Content.Archive("content_id")
```

### Templates

```go
// Create template
template, err := client.Templates.Create(map[string]interface{}{
	"name":           "Blog Template",
	"fields":         map[string]interface{}{"title": nil, "body": nil},
	"organizationId": "org_id",
})

// Get template
template, err := client.Templates.Get("template_id")

// List templates
templates, err := client.Templates.List("org_id")

// Update template
updated, err := client.Templates.Update("template_id", map[string]interface{}{
	"name": "Updated Template",
})
```

### Health Checks

```go
// Check status
status, err := client.Health.Status()

// Check readiness
ready, err := client.Health.Ready()

// Get metrics
metrics, err := client.Health.Metrics()
```

## Error Handling

```go
if err != nil {
	log.Printf("Error: %v\n", err)
}
```

## Configuration

```go
config := &nmd.Config{
	APIKey:  "your-api-key",           // Required
	BaseURL: "https://api.nmd.platform", // Optional
	Timeout: 30 * time.Second,          // Optional
	Retries: 3,                         // Optional
}
```

## Features

- Type-safe Go interface
- Automatic retry with exponential backoff
- Full API coverage
- Timeout handling
- Error handling
- JSON serialization

## Support

- Documentation: https://docs.nmd.platform
- Issues: https://github.com/nirvacore/nirva-ai/issues
- Email: support@nmd.platform
