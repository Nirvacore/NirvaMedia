/**
 * NMD SDK - Official TypeScript Client
 * Simple, type-safe API for NMD Platform
 */

export interface NMDConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  timeout?: number;
}

export class NMDClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor(config: NMDConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.nmd.platform";
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
  }

  /**
   * Content Management APIs
   */
  content = {
    create: async (data: {
      title: string;
      body: string;
      type: string;
      organizationId: string;
    }) => this._request("POST", "/content", data),

    get: async (contentId: string) =>
      this._request("GET", `/content/${contentId}`),

    list: async (organizationId: string, params?: RequestOptions) =>
      this._request("GET", `/content`, params, {
        organizationId,
      }),

    update: async (
      contentId: string,
      data: Partial<{
        title: string;
        body: string;
        status: string;
      }>
    ) => this._request("PUT", `/content/${contentId}`, data),

    delete: async (contentId: string) =>
      this._request("DELETE", `/content/${contentId}`),

    publish: async (contentId: string) =>
      this._request("POST", `/content/${contentId}/publish`, {}),

    archive: async (contentId: string) =>
      this._request("POST", `/content/${contentId}/archive`, {}),
  };

  /**
   * Template APIs
   */
  templates = {
    create: async (data: {
      name: string;
      fields: Record<string, unknown>;
      organizationId: string;
    }) => this._request("POST", "/templates", data),

    get: async (templateId: string) =>
      this._request("GET", `/templates/${templateId}`),

    list: async (organizationId: string) =>
      this._request("GET", `/templates`, { organizationId }),

    update: async (
      templateId: string,
      data: Partial<{
        name: string;
        fields: Record<string, unknown>;
      }>
    ) => this._request("PUT", `/templates/${templateId}`, data),
  };

  /**
   * Metrics APIs
   */
  metrics = {
    create: async (data: {
      name: string;
      type: string;
      organizationId: string;
    }) => this._request("POST", "/metrics", data),

    record: async (metricId: string, value: number) =>
      this._request("POST", `/metrics/${metricId}/record`, { value }),

    getReadings: async (metricId: string, limit?: number) =>
      this._request("GET", `/metrics/${metricId}/readings`, {
        limit: limit || 100,
      }),

    getStats: async (metricId: string, period: string) =>
      this._request("GET", `/metrics/${metricId}/stats`, { period }),
  };

  /**
   * Analytics APIs
   */
  analytics = {
    getDashboard: async (organizationId: string) =>
      this._request("GET", "/analytics/dashboard", { organizationId }),

    getMetrics: async (organizationId: string, period: string) =>
      this._request("GET", "/analytics/metrics", {
        organizationId,
        period,
      }),

    getTrends: async (organizationId: string, metric: string) =>
      this._request("GET", "/analytics/trends", {
        organizationId,
        metric,
      }),

    getReport: async (organizationId: string, reportId: string) =>
      this._request("GET", `/analytics/reports/${reportId}`, {
        organizationId,
      }),
  };

  /**
   * Webhooks APIs
   */
  webhooks = {
    subscribe: async (data: {
      event: string;
      url: string;
      organizationId: string;
    }) => this._request("POST", "/webhooks/subscribe", data),

    list: async (organizationId: string) =>
      this._request("GET", "/webhooks", { organizationId }),

    unsubscribe: async (webhookId: string) =>
      this._request("DELETE", `/webhooks/${webhookId}`, {}),

    test: async (webhookId: string) =>
      this._request("POST", `/webhooks/${webhookId}/test`, {}),
  };

  /**
   * Search APIs
   */
  search = {
    query: async (data: {
      q: string;
      filters?: Record<string, unknown>;
      limit?: number;
      organizationId: string;
    }) => this._request("POST", "/search", data),

    suggest: async (q: string, organizationId: string) =>
      this._request("GET", "/search/suggest", { q, organizationId }),

    facets: async (field: string, organizationId: string) =>
      this._request("GET", "/search/facets", { field, organizationId }),
  };

  /**
   * AI Assistant APIs
   */
  ai = {
    generateContent: async (data: {
      topic: string;
      type: "blog" | "social" | "email" | "video";
      tone: string;
      organizationId: string;
    }) => this._request("POST", "/ai/generate", data),

    optimizeContent: async (data: {
      content: string;
      organizationId: string;
    }) => this._request("POST", "/ai/optimize", data),

    suggestTitles: async (data: {
      topic: string;
      count?: number;
      organizationId: string;
    }) => this._request("POST", "/ai/suggest-titles", data),
  };

  /**
   * Health & Status APIs
   */
  health = {
    status: async () => this._request("GET", "/health", {}),

    ready: async () => this._request("GET", "/health/ready", {}),

    metrics: async () => this._request("GET", "/metrics/health", {}),
  };

  /**
   * Internal request handler
   */
  private async _request(
    method: string,
    path: string,
    data?: unknown,
    params?: Record<string, unknown>,
    retryCount: number = 0
  ): Promise<unknown> {
    try {
      const url = new URL(`${this.baseUrl}${path}`);

      if (params) {
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        }
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      };

      const options: RequestInit = {
        method,
        headers,
      };

      if (data && (method === "POST" || method === "PUT")) {
        options.body = JSON.stringify(data);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url.toString(), {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status >= 500 && retryCount < this.retries) {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, retryCount) * 1000)
            );
            return this._request(method, path, data, params, retryCount + 1);
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          return await response.json();
        }

        return await response.text();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      if (retryCount < this.retries && error instanceof Error) {
        if (
          error.message.includes("timeout") ||
          error.message.includes("network")
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, retryCount) * 1000)
          );
          return this._request(method, path, data, params, retryCount + 1);
        }
      }

      throw new Error(`NMD SDK Error: ${error}`);
    }
  }
}

/**
 * Batch operations helper
 */
export class NMDBatchClient {
  private client: NMDClient;
  private batch: Array<() => Promise<unknown>> = [];

  constructor(client: NMDClient) {
    this.client = client;
  }

  add(operation: () => Promise<unknown>): this {
    this.batch.push(operation);
    return this;
  }

  async execute(): Promise<unknown[]> {
    return Promise.all(this.batch.map((op) => op()));
  }

  reset(): this {
    this.batch = [];
    return this;
  }
}

export default NMDClient;
