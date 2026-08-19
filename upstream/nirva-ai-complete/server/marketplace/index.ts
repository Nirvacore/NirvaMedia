import {
  CURATED_PACKS,
  computeRating,
  validateAgentPack,
  type AgentPackConfig,
  type MarketplaceListing,
} from "../../shared/marketplace.ts";
import {
  getAgentFromDb,
  updateAgentInDb,
  getDb,
} from "../db/index.ts";

interface DbListingRow {
  id: string;
  agent_name: string;
  title: string;
  description: string;
  author: string;
  author_id: string | null;
  tags: string;
  config_json: string;
  downloads: number;
  rating_sum: number;
  rating_count: number;
  featured: number;
  created_at: string;
  updated_at: string;
}

function rowToListing(row: DbListingRow): MarketplaceListing {
  return {
    id: row.id,
    agentName: row.agent_name,
    title: row.title,
    description: row.description,
    author: row.author,
    authorId: row.author_id,
    tags: JSON.parse(row.tags) as string[],
    config: JSON.parse(row.config_json) as AgentPackConfig,
    downloads: row.downloads,
    rating: computeRating(row.rating_sum, row.rating_count),
    ratingCount: row.rating_count,
    featured: row.featured === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function seedMarketplaceIfEmpty() {
  const count = getDb().prepare("SELECT COUNT(*) as c FROM marketplace_listings").get() as { c: number };
  if (count.c > 0) return;

  const insert = getDb().prepare(`
    INSERT INTO marketplace_listings
      (id, agent_name, title, description, author, author_id, tags, config_json,
       downloads, rating_sum, rating_count, featured, created_at, updated_at)
    VALUES
      (@id, @agent_name, @title, @description, @author, @author_id, @tags, @config_json,
       @downloads, @rating_sum, @rating_count, @featured, @created_at, @updated_at)
  `);

  const now = new Date().toISOString();
  const seed = getDb().transaction(() => {
    for (const pack of CURATED_PACKS) {
      const id = `pack_${pack.agentName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      insert.run({
        id,
        agent_name: pack.agentName,
        title: pack.title,
        description: pack.description,
        author: pack.author,
        author_id: pack.authorId,
        tags: JSON.stringify(pack.tags),
        config_json: JSON.stringify(pack.config),
        downloads: Math.floor(Math.random() * 50) + 10,
        rating_sum: 45,
        rating_count: 10,
        featured: pack.featured ? 1 : 0,
        created_at: now,
        updated_at: now,
      });
    }
  });
  seed();
}

export function listMarketplaceListings(filters?: {
  search?: string;
  tag?: string;
  featured?: boolean;
  agentName?: string;
}) {
  seedMarketplaceIfEmpty();
  let sql = "SELECT * FROM marketplace_listings WHERE 1=1";
  const params: (string | number)[] = [];

  if (filters?.featured) {
    sql += " AND featured = 1";
  }
  if (filters?.agentName) {
    sql += " AND agent_name = ?";
    params.push(filters.agentName.toUpperCase());
  }
  if (filters?.tag) {
    sql += " AND tags LIKE ?";
    params.push(`%"${filters.tag}"%`);
  }
  if (filters?.search) {
    const q = `%${filters.search.toLowerCase()}%`;
    sql += " AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(agent_name) LIKE ?)";
    params.push(q, q, q);
  }

  sql += " ORDER BY featured DESC, downloads DESC, updated_at DESC";
  const rows = getDb().prepare(sql).all(...params) as DbListingRow[];
  return rows.map(rowToListing);
}

export function getMarketplaceListing(id: string): MarketplaceListing | null {
  seedMarketplaceIfEmpty();
  const row = getDb().prepare("SELECT * FROM marketplace_listings WHERE id = ?").get(id) as DbListingRow | undefined;
  return row ? rowToListing(row) : null;
}

export function publishMarketplaceListing(data: {
  agentName: string;
  title: string;
  description?: string;
  tags?: string[];
  author: string;
  authorId?: string | null;
  config?: AgentPackConfig;
}) {
  const agent = getAgentFromDb(data.agentName);
  if (!agent) return null;

  const config: AgentPackConfig = data.config ?? {
    name: agent.name,
    role: agent.role,
    tier: agent.tier as AgentPackConfig["tier"],
    category: agent.category,
    systemPrompt: agent.systemPrompt,
    capabilities: agent.capabilities,
    tools: agent.tools,
    model: agent.model,
    description: agent.description,
    useCases: agent.useCases,
  };

  if (!validateAgentPack(config)) return null;

  const id = `pack_user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO marketplace_listings
      (id, agent_name, title, description, author, author_id, tags, config_json,
       downloads, rating_sum, rating_count, featured, created_at, updated_at)
    VALUES
      (@id, @agent_name, @title, @description, @author, @author_id, @tags, @config_json,
       0, 0, 0, 0, @created_at, @updated_at)
  `).run({
    id,
    agent_name: config.name.toUpperCase(),
    title: data.title,
    description: data.description || config.description,
    author: data.author,
    author_id: data.authorId ?? null,
    tags: JSON.stringify(data.tags || []),
    config_json: JSON.stringify(config),
    created_at: now,
    updated_at: now,
  });

  return getMarketplaceListing(id);
}

export function importMarketplaceListing(id: string) {
  const listing = getMarketplaceListing(id);
  if (!listing) return null;

  const { config } = listing;
  const updated = updateAgentInDb(config.name, {
    systemPrompt: config.systemPrompt,
    capabilities: config.capabilities,
    tools: config.tools,
    model: config.model,
    description: config.description,
    useCases: config.useCases,
  });

  if (!updated) return null;

  getDb().prepare(`
    UPDATE marketplace_listings SET downloads = downloads + 1, updated_at = datetime('now') WHERE id = ?
  `).run(id);

  return { agent: updated, listing: getMarketplaceListing(id)! };
}

export function rateMarketplaceListing(id: string, stars: number) {
  if (stars < 1 || stars > 5) return null;
  const listing = getMarketplaceListing(id);
  if (!listing) return null;

  getDb().prepare(`
    UPDATE marketplace_listings
    SET rating_sum = rating_sum + ?, rating_count = rating_count + 1, updated_at = datetime('now')
    WHERE id = ?
  `).run(stars, id);

  return getMarketplaceListing(id);
}

export function exportAgentPack(agentName: string): AgentPackConfig | null {
  const agent = getAgentFromDb(agentName);
  if (!agent) return null;
  return {
    name: agent.name,
    role: agent.role,
    tier: agent.tier as AgentPackConfig["tier"],
    category: agent.category,
    systemPrompt: agent.systemPrompt,
    capabilities: agent.capabilities,
    tools: agent.tools,
    model: agent.model,
    description: agent.description,
    useCases: agent.useCases,
  };
}

export function importAgentPackFromJson(config: unknown) {
  if (!validateAgentPack(config)) return null;
  const updated = updateAgentInDb(config.name, {
    systemPrompt: config.systemPrompt,
    capabilities: config.capabilities,
    tools: config.tools,
    model: config.model,
    description: config.description,
    useCases: config.useCases,
  });
  return updated;
}

export function getMarketplaceStats() {
  seedMarketplaceIfEmpty();
  const row = getDb().prepare(`
    SELECT
      COUNT(*) as total,
      SUM(downloads) as totalDownloads,
      SUM(featured) as featuredCount
    FROM marketplace_listings
  `).get() as { total: number; totalDownloads: number; featuredCount: number };
  return {
    total: row.total,
    totalDownloads: row.totalDownloads || 0,
    featuredCount: row.featuredCount || 0,
  };
}
