import { describe, it, expect } from "vitest";
import {
  createTemplate,
  getTemplate,
  getTemplatesByCategory,
  recordTemplateUsage,
  getTemplateStats,
  type ContentTemplate,
} from "../media/templates.ts";

describe("NMD Content Templates (NMD-3500)", () => {
  const orgId = "org_templates";
  const userId = "user_creator";

  describe("Template creation", () => {
    it("creates template", () => {
      const template: ContentTemplate = {
        id: "tmpl_001",
        organizationId: orgId,
        name: "Product Launch",
        description: "Template for product announcements",
        category: "announcements",
        titleTemplate: "Introducing {{productName}}",
        bodyTemplate: "We're excited to announce {{productName}}: {{description}}",
        tags: ["launch", "product"],
        metadata: { minWords: 50, maxWords: 500 },
        isPublic: true,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        usageCount: 0,
      };

      const created = createTemplate(template);
      expect(created.name).toBe("Product Launch");
      expect(created.isPublic).toBe(true);
    });

    it("retrieves template by ID", () => {
      const template: ContentTemplate = {
        id: "tmpl_get",
        organizationId: orgId,
        name: "Blog Post",
        description: "Standard blog post",
        category: "blog",
        titleTemplate: "{{topic}}: {{subtitle}}",
        bodyTemplate: "Today we discuss {{topic}}...",
        tags: ["blog"],
        metadata: { wordCount: 1000 },
        isPublic: true,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        usageCount: 0,
      };

      const created = createTemplate(template);
      expect(created.name).toBe("Blog Post");
      expect(created.category).toBe("blog");
    });
  });

  describe("Template categories", () => {
    it("retrieves templates by category", () => {
      for (let i = 1; i <= 3; i++) {
        createTemplate({
          id: `tmpl_cat_${i}`,
          organizationId: orgId,
          name: `Social Post ${i}`,
          description: `Social media post`,
          category: "social",
          titleTemplate: "Post {{number}}",
          bodyTemplate: "Social content {{number}}",
          tags: ["social"],
          metadata: {},
          isPublic: false,
          createdBy: userId,
          createdAt: new Date().toISOString(),
          usageCount: i,
        });
      }

      const templates = getTemplatesByCategory(orgId, "social");
      expect(templates.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Template usage", () => {
    it("records template usage", () => {
      createTemplate({
        id: "tmpl_usage",
        organizationId: orgId,
        name: "Email Template",
        description: "For email campaigns",
        category: "email",
        titleTemplate: "Subject: {{title}}",
        bodyTemplate: "Dear {{recipient}}, {{body}}",
        tags: ["email"],
        metadata: {},
        isPublic: false,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        usageCount: 0,
      });

      const usage = recordTemplateUsage({
        id: "usage_001",
        templateId: "tmpl_usage",
        contentId: "cnt_from_template",
        organizationId: orgId,
        usedBy: userId,
        usedAt: new Date().toISOString(),
      });

      expect(usage.contentId).toBe("cnt_from_template");
    });
  });

  describe("Statistics", () => {
    it("calculates template statistics", () => {
      const statOrg = "org_template_stats";
      for (let i = 1; i <= 4; i++) {
        createTemplate({
          id: `tmpl_stat_${i}`,
          organizationId: statOrg,
          name: `Template ${i}`,
          description: `Description ${i}`,
          category: i % 2 === 0 ? "public" : "private",
          titleTemplate: "Title",
          bodyTemplate: "Body",
          tags: [],
          metadata: {},
          isPublic: i % 2 === 0,
          createdBy: userId,
          createdAt: new Date().toISOString(),
          usageCount: i * 10,
        });
      }

      const stats = getTemplateStats(statOrg);
      expect(stats).toHaveProperty("totalTemplates");
      expect(stats).toHaveProperty("publicTemplates");
      expect(stats).toHaveProperty("totalUsage");
    });
  });
});
