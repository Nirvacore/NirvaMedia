import { describe, it, expect, beforeAll } from "vitest";
import {
  CURATED_PACKS,
  computeRating,
  validateAgentPack,
} from "../marketplace.ts";

describe("marketplace shared", () => {
  it("has curated starter packs", () => {
    expect(CURATED_PACKS.length).toBeGreaterThanOrEqual(5);
    expect(CURATED_PACKS.some((p) => p.agentName === "CODE")).toBe(true);
    expect(CURATED_PACKS.some((p) => p.agentName === "RAG-BUILDER")).toBe(true);
  });

  it("computes average rating", () => {
    expect(computeRating(45, 10)).toBe(4.5);
    expect(computeRating(0, 0)).toBe(0);
  });

  it("validates agent pack shape", () => {
    const pack = CURATED_PACKS[0].config;
    expect(validateAgentPack(pack)).toBe(true);
    expect(validateAgentPack({ name: "X" })).toBe(false);
    expect(validateAgentPack(null)).toBe(false);
  });
});

describe("marketplace server", () => {
  beforeAll(() => {
    process.env.DATABASE_PATH = ":memory:";
  });

  it("lists seeded marketplace packs", async () => {
    const { listMarketplaceListings, getMarketplaceStats } = await import("../../server/marketplace/index.ts");
    const listings = listMarketplaceListings();
    expect(listings.length).toBe(CURATED_PACKS.length);
    const stats = getMarketplaceStats();
    expect(stats.total).toBe(CURATED_PACKS.length);
  });

  it("imports a pack into agent config", async () => {
    const { listMarketplaceListings, importMarketplaceListing } = await import("../../server/marketplace/index.ts");
    const listing = listMarketplaceListings({ agentName: "CODE" })[0];
    const result = importMarketplaceListing(listing.id);
    expect(result?.agent.name).toBe("CODE");
    expect(result?.agent.systemPrompt).toContain("CODE");
    expect(result?.listing.downloads).toBeGreaterThan(listing.downloads);
  });

  it("publishes a user pack", async () => {
    const { publishMarketplaceListing, listMarketplaceListings } = await import("../../server/marketplace/index.ts");
    const before = listMarketplaceListings().length;
    const published = publishMarketplaceListing({
      agentName: "DESK",
      title: "Test Pack",
      description: "Test description",
      author: "Test User",
      tags: ["test"],
    });
    expect(published?.title).toBe("Test Pack");
    expect(listMarketplaceListings().length).toBe(before + 1);
  });
});
