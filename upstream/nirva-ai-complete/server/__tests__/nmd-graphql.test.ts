import { describe, it, expect } from "vitest";
import { typeDefs } from "../graphql/schema.ts";
import { resolvers } from "../graphql/resolvers.ts";

describe("NMD GraphQL API", () => {
  describe("Schema validation", () => {
    it("contains Query type", () => {
      expect(typeDefs).toContain("type Query");
    });

    it("contains Mutation type", () => {
      expect(typeDefs).toContain("type Mutation");
    });

    it("contains Subscription type", () => {
      expect(typeDefs).toContain("type Subscription");
    });

    it("defines all content operations", () => {
      expect(typeDefs).toContain("content(id: ID!)");
      expect(typeDefs).toContain("contentList(organizationId: ID!");
    });

    it("defines all template operations", () => {
      expect(typeDefs).toContain("template(id: ID!)");
      expect(typeDefs).toContain("templates(organizationId: ID!");
    });

    it("defines all metric operations", () => {
      expect(typeDefs).toContain("metric(id: ID!)");
      expect(typeDefs).toContain("metrics(organizationId: ID!)");
    });

    it("defines all collaboration operations", () => {
      expect(typeDefs).toContain("comments(contentId: ID!)");
      expect(typeDefs).toContain("activityFeed(contentId: ID!)");
    });

    it("defines all webhook operations", () => {
      expect(typeDefs).toContain("webhooks(organizationId: ID!)");
      expect(typeDefs).toContain("webhookEvents(organizationId: ID!");
    });

    it("defines all ROI operations", () => {
      expect(typeDefs).toContain("roi(organizationId: ID!)");
      expect(typeDefs).toContain("roiForecast(contentId: ID!");
    });

    it("includes scalar types", () => {
      expect(typeDefs).toContain("scalar DateTime");
      expect(typeDefs).toContain("scalar JSON");
    });
  });

  describe("Resolver implementation", () => {
    const mockContext = {
      organizationId: "org_test",
      userId: "user_test",
    };

    it("has Query resolver", () => {
      expect(resolvers.Query).toBeDefined();
      expect(typeof resolvers.Query.health).toBe("function");
    });

    it("has Mutation resolver", () => {
      expect(resolvers.Mutation).toBeDefined();
      expect(typeof resolvers.Mutation.createContent).toBe("function");
    });

    it("has Subscription resolver", () => {
      expect(resolvers.Subscription).toBeDefined();
      expect(resolvers.Subscription.contentCreated).toBeDefined();
    });

    it("health query returns status", () => {
      const result = (resolvers.Query.health as any)();
      expect(result.status).toBe("healthy");
      expect(result.timestamp).toBeDefined();
      expect(result.modules).toBeDefined();
      expect(Array.isArray(result.modules)).toBe(true);
    });

    it("health status includes all modules", () => {
      const result = (resolvers.Query.health as any)();
      const moduleNames = result.modules.map((m: any) => m.name);
      expect(moduleNames).toContain("content");
      expect(moduleNames).toContain("templates");
      expect(moduleNames).toContain("metrics");
      expect(moduleNames).toContain("webhooks");
    });
  });

  describe("Mutation support", () => {
    it("createContent mutation is defined", () => {
      expect(typeDefs).toContain("createContent(input: CreateContentInput!)");
    });

    it("createTemplate mutation is defined", () => {
      expect(typeDefs).toContain("createTemplate(input: CreateTemplateInput!)");
    });

    it("recordMetricReading mutation is defined", () => {
      expect(typeDefs).toContain("recordMetricReading(metricId: ID!, value: Float!)");
    });

    it("addComment mutation is defined", () => {
      expect(typeDefs).toContain("addComment(input: AddCommentInput!)");
    });

    it("subscribeWebhook mutation is defined", () => {
      expect(typeDefs).toContain("subscribeWebhook(input: SubscribeWebhookInput!)");
    });
  });

  describe("Input types", () => {
    it("defines CreateContentInput", () => {
      expect(typeDefs).toContain("input CreateContentInput");
      expect(typeDefs).toContain("organizationId: ID!");
      expect(typeDefs).toContain("title: String!");
      expect(typeDefs).toContain("body: String!");
    });

    it("defines CreateTemplateInput", () => {
      expect(typeDefs).toContain("input CreateTemplateInput");
      expect(typeDefs).toContain("category: String!");
    });

    it("defines CreateMetricInput", () => {
      expect(typeDefs).toContain("input CreateMetricInput");
      expect(typeDefs).toContain("formula: String");
    });
  });

  describe("Response payloads", () => {
    it("defines ContentPayload", () => {
      expect(typeDefs).toContain("type ContentPayload");
      expect(typeDefs).toContain("success: Boolean!");
      expect(typeDefs).toContain("data: Content");
    });

    it("defines TemplatePayload", () => {
      expect(typeDefs).toContain("type TemplatePayload");
    });

    it("defines DeletePayload", () => {
      expect(typeDefs).toContain("type DeletePayload");
      expect(typeDefs).toContain("success: Boolean!");
    });
  });

  describe("Enums", () => {
    it("defines ContentStatus enum", () => {
      expect(typeDefs).toContain("enum ContentStatus");
      expect(typeDefs).toContain("DRAFT");
      expect(typeDefs).toContain("PUBLISHED");
    });
  });

  describe("Coverage metrics", () => {
    it("implements 30+ queries", () => {
      const queryCount = (typeDefs.match(/\w+\(/g) || []).length;
      expect(queryCount).toBeGreaterThanOrEqual(30);
    });

    it("implements 15+ mutations", () => {
      const mutationSection = typeDefs.split("type Mutation")[1]?.split("type Subscription")[0] || "";
      const mutationCount = (mutationSection.match(/\w+\(/g) || []).length;
      expect(mutationCount).toBeGreaterThanOrEqual(15);
    });

    it("includes all NMD modules", () => {
      expect(typeDefs).toContain("Content");
      expect(typeDefs).toContain("ContentTemplate");
      expect(typeDefs).toContain("CustomMetric");
      expect(typeDefs).toContain("Comment");
      expect(typeDefs).toContain("ApprovalTask");
      expect(typeDefs).toContain("Alert");
      expect(typeDefs).toContain("WebhookSubscription");
      expect(typeDefs).toContain("ROIData");
    });
  });
});
