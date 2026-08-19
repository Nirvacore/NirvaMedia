import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb, listAuditLogs } from "../db/index.ts";
import { ensureMediaSchema, saveBrandBrief, listContent } from "../media/index.ts";
import { generateCampaign, setStrategistProvider } from "../media/strategy.ts";

describe("NMD strategy skill", () => {
  beforeAll(() => {
    getDb();
    ensureMediaSchema();
  });

  beforeEach(() => {
    delete process.env.NMD_DEMO_CONNECTORS;
  });

  it("generates a campaign plan and lands drafts in the pipeline with brand context", async () => {
    const org = `org-strategy-${Date.now()}`;
    saveBrandBrief({
      organizationId: org,
      brandName: "พันนา",
      product: "น้ำมันสมุนไพร",
      audience: "คนทำงานออฟฟิศ",
      tone: "พรีเมียม",
      competitors: "",
      bannedWords: [],
      notes: "",
    }, "tester");

    let seenBrand: string | undefined;
    setStrategistProvider("fake-strategist", async (req) => {
      seenBrand = req.brand?.brandName;
      return {
        campaignName: "พักสีเขียว",
        bigIdea: "เปลี่ยนยาแก้ปวดเป็นพิธีกรรมพัก 15 วินาที",
        insight: "คนวัยทำงานไม่ได้อายที่จะปวด แต่อายที่จะแก้ปวดแบบคนแก่",
        posts: Array.from({ length: req.postCount }, (_, i) => ({
          title: `โพสต์ ${i + 1}`,
          hook: `ฮุก ${i + 1}`,
          caption: `แคปชัน ${i + 1}`,
          contentType: "post" as const,
        })),
      };
    });

    const result = await generateCampaign({ goal: "เปิดตัวแคมเปญใหม่", lang: "th", organizationId: org, postCount: 4 }, "tester");
    expect(result.error).toBeUndefined();
    expect(result.plan?.campaignName).toBe("พักสีเขียว");
    expect(result.items).toHaveLength(4);
    expect(seenBrand).toBe("พันนา");

    const drafts = listContent({ organizationId: org, contentStatus: "draft" });
    expect(drafts).toHaveLength(4);
    expect(drafts[0].tags).toContain("campaign");
    expect(drafts[0].tags).toContain("พักสีเขียว");
    expect(drafts.some((d) => d.body.includes("ฮุก"))).toBe(true);
  });

  it("reports strategist failure without creating drafts", async () => {
    const org = `org-fail-${Date.now()}`;
    setStrategistProvider("broken", async () => {
      throw new Error("model offline");
    });
    const result = await generateCampaign({ goal: "x", lang: "th", organizationId: org }, "tester");
    expect(result.plan).toBeNull();
    expect(result.error).toContain("Strategist unavailable");
    expect(listContent({ organizationId: org })).toHaveLength(0);
  });

  it("sanitizes malformed posts and never creates partial drafts", async () => {
    const org = `org-malformed-${Date.now()}`;
    setStrategistProvider("malformed", async () => ({
      campaignName: "messy",
      bigIdea: "x",
      insight: "y",
      posts: [
        { title: "ดี", hook: "h", caption: "c", contentType: "post" as const },
        { title: "", hook: "no title", caption: "", contentType: "post" as const },
        { title: "no body", hook: "", caption: "", contentType: "post" as const },
        { title: "แปลก", hook: "ok", caption: "ok", contentType: "banana" as never },
      ],
    }));
    const result = await generateCampaign({ goal: "g", lang: "th", organizationId: org }, "tester");
    expect(result.error).toBeUndefined();
    expect(result.items).toHaveLength(2); // only the 2 valid posts
    expect(result.items.every((i) => i.title && i.body)).toBe(true);
    expect(result.items[1].contentType).toBe("post"); // unknown type coerced

    const allInvalidOrg = `org-invalid-${Date.now()}`;
    setStrategistProvider("all-invalid", async () => ({
      campaignName: "empty", bigIdea: "x", insight: "y",
      posts: [{ title: "", hook: "", caption: "", contentType: "post" as const }],
    }));
    const bad = await generateCampaign({ goal: "g", lang: "th", organizationId: allInvalidOrg }, "tester");
    expect(bad.error).toContain("no valid posts");
    expect(listContent({ organizationId: allInvalidOrg })).toHaveLength(0);
  });

  it("clamps post count and audits campaign generation", async () => {
    const org = `org-clamp-${Date.now()}`;
    setStrategistProvider("count-check", async (req) => ({
      campaignName: "clamp",
      bigIdea: "x",
      insight: "y",
      posts: Array.from({ length: req.postCount }, (_, i) => ({
        title: `p${i}`, hook: "h", caption: "c", contentType: "post" as const,
      })),
    }));
    const result = await generateCampaign({ goal: "g", lang: "th", organizationId: org, postCount: 999 }, "tester");
    expect(result.items).toHaveLength(20);
    expect(listAuditLogs({ limit: 500 }).map((e) => e.action)).toContain("media.campaign.generate");
  });
});
