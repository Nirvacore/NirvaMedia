/**
 * NMD SDK - Basic Usage Examples
 * Quick-start guide for common operations
 */

import NMDClient from "../nmd-sdk";

const client = new NMDClient({
  apiKey: "your-api-key-here",
  baseUrl: "https://api.nmd.platform",
  timeout: 30000,
  retries: 3,
});

/**
 * Content Management
 */
async function contentManagementExample() {
  try {
    // Create content
    const newContent = await client.content.create({
      title: "Getting Started with NMD Platform",
      body: "# Introduction\n\nLearn how to use NMD Platform...",
      type: "blog",
      organizationId: "org_123",
    });
    console.log("Created content:", newContent);

    // Get single content
    const content = await client.content.get("content_456");
    console.log("Retrieved content:", content);

    // List all content
    const contentList = await client.content.list("org_123", {
      params: { status: "published", limit: 10 },
    });
    console.log("Content list:", contentList);

    // Update content
    const updated = await client.content.update("content_456", {
      title: "Updated Title",
      status: "archived",
    });
    console.log("Updated content:", updated);

    // Publish content
    const published = await client.content.publish("content_456");
    console.log("Published:", published);
  } catch (error) {
    console.error("Content management error:", error);
  }
}

/**
 * Template Management
 */
async function templateManagementExample() {
  try {
    // Create template
    const template = await client.templates.create({
      name: "Blog Post Template",
      fields: {
        title: { type: "string", required: true },
        body: { type: "text", required: true },
        tags: { type: "array", items: "string" },
      },
      organizationId: "org_123",
    });
    console.log("Created template:", template);

    // List templates
    const templates = await client.templates.list("org_123");
    console.log("Templates:", templates);
  } catch (error) {
    console.error("Template error:", error);
  }
}

/**
 * Metrics & Analytics
 */
async function metricsExample() {
  try {
    // Create metric
    const metric = await client.metrics.create({
      name: "Page Views",
      type: "counter",
      organizationId: "org_123",
    });
    console.log("Created metric:", metric);

    // Record metric value
    await client.metrics.record(metric.id, 1500);

    // Get metric readings
    const readings = await client.metrics.getReadings(metric.id, 100);
    console.log("Metric readings:", readings);

    // Get metric statistics
    const stats = await client.metrics.getStats(metric.id, "7d");
    console.log("Metric stats:", stats);
  } catch (error) {
    console.error("Metrics error:", error);
  }
}

/**
 * Search & Discovery
 */
async function searchExample() {
  try {
    // Full-text search
    const results = await client.search.query({
      q: "typescript best practices",
      filters: undefined,
      limit: 10,
      organizationId: "org_123",
    });
    console.log("Search results:", results);

    // Get search suggestions
    const suggestions = await client.search.suggest("typescript", "org_123");
    console.log("Suggestions:", suggestions);

    // Get facets
    const facets = await client.search.facets("category", "org_123");
    console.log("Facets:", facets);
  } catch (error) {
    console.error("Search error:", error);
  }
}

/**
 * AI Assistant
 */
async function aiAssistantExample() {
  try {
    // Generate content
    const generated = await client.ai.generateContent({
      topic: "Artificial Intelligence",
      type: "blog",
      tone: "professional",
      organizationId: "org_123",
    });
    console.log("Generated content:", generated);

    // Optimize existing content
    const optimized = await client.ai.optimizeContent({
      content: "This is a blog post about AI...",
      organizationId: "org_123",
    });
    console.log("Optimized content:", optimized);

    // Get title suggestions
    const titles = await client.ai.suggestTitles({
      topic: "Machine Learning",
      count: 5,
      organizationId: "org_123",
    });
    console.log("Title suggestions:", titles);
  } catch (error) {
    console.error("AI error:", error);
  }
}

/**
 * Webhooks
 */
async function webhookExample() {
  try {
    // Subscribe to event
    const webhook = await client.webhooks.subscribe({
      event: "content.published",
      url: "https://yourapp.com/webhooks/content",
      organizationId: "org_123",
    });
    console.log("Webhook created:", webhook);

    // List webhooks
    const webhooks = await client.webhooks.list("org_123");
    console.log("Webhooks:", webhooks);

    // Test webhook
    await client.webhooks.test(webhook.id);
    console.log("Webhook test sent");

    // Unsubscribe
    await client.webhooks.unsubscribe(webhook.id);
    console.log("Webhook deleted");
  } catch (error) {
    console.error("Webhook error:", error);
  }
}

/**
 * Batch Operations
 */
async function batchOperationsExample() {
  const batch = new (require("../nmd-sdk").NMDBatchClient)(client);

  try {
    // Queue multiple operations
    batch
      .add(async () =>
        client.content.create({
          title: "Batch Content 1",
          body: "Content 1",
          type: "blog",
          organizationId: "org_123",
        })
      )
      .add(async () =>
        client.content.create({
          title: "Batch Content 2",
          body: "Content 2",
          type: "blog",
          organizationId: "org_123",
        })
      )
      .add(async () =>
        client.metrics.record("metric_123", 100)
      );

    // Execute all at once
    const results = await batch.execute();
    console.log("Batch results:", results);

    // Reset for next batch
    batch.reset();
  } catch (error) {
    console.error("Batch error:", error);
  }
}

/**
 * Health Checks
 */
async function healthCheckExample() {
  try {
    // Check API status
    const status = await client.health.status();
    console.log("API status:", status);

    // Check if ready for requests
    const ready = await client.health.ready();
    console.log("Ready status:", ready);

    // Get system metrics
    const metrics = await client.health.metrics();
    console.log("System metrics:", metrics);
  } catch (error) {
    console.error("Health check error:", error);
  }
}

// Run examples
async function runAllExamples() {
  console.log("=== NMD SDK Examples ===\n");
  
  console.log("1. Content Management");
  await contentManagementExample();
  
  console.log("\n2. Templates");
  await templateManagementExample();
  
  console.log("\n3. Metrics");
  await metricsExample();
  
  console.log("\n4. Search");
  await searchExample();
  
  console.log("\n5. AI Assistant");
  await aiAssistantExample();
  
  console.log("\n6. Webhooks");
  await webhookExample();
  
  console.log("\n7. Batch Operations");
  await batchOperationsExample();
  
  console.log("\n8. Health Checks");
  await healthCheckExample();
}

// Uncomment to run
// runAllExamples().catch(console.error);

export {
  contentManagementExample,
  templateManagementExample,
  metricsExample,
  searchExample,
  aiAssistantExample,
  webhookExample,
  batchOperationsExample,
  healthCheckExample,
};
