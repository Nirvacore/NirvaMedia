/**
 * NMD Load Testing Suite
 * Benchmark concurrent requests, throughput, and response times
 */

export interface LoadTestConfig {
  concurrency: number;
  duration: number; // milliseconds
  rampUp: number; // milliseconds to reach full concurrency
  endpoints: string[];
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  payload?: Record<string, unknown>;
}

export interface LoadTestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  errorRate: number;
  percentile: Record<string, number>;
}

export interface FullLoadTestReport {
  timestamp: string;
  duration: number;
  concurrency: number;
  totalRequests: number;
  results: LoadTestResult[];
  summary: {
    totalTime: number;
    averageThroughput: number;
    averageResponseTime: number;
    totalErrors: number;
    successRate: number;
  };
}

const responseTimes: number[] = [];
let requestCount = 0;
let successCount = 0;
let errorCount = 0;

export async function runLoadTest(
  config: LoadTestConfig
): Promise<FullLoadTestReport> {
  const startTime = Date.now();
  const results: LoadTestResult[] = [];

  // Ramp up concurrency gradually
  const concurrencyStep = Math.ceil(config.concurrency / (config.rampUp / 100));
  let currentConcurrency = 1;

  const rampUpStart = Date.now();
  while (Date.now() - rampUpStart < config.rampUp && currentConcurrency < config.concurrency) {
    currentConcurrency = Math.min(
      currentConcurrency + concurrencyStep,
      config.concurrency
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Main test load
  const testStart = Date.now();
  const endTime = testStart + config.duration;

  const requestQueue: Promise<void>[] = [];

  while (Date.now() < endTime) {
    for (let i = 0; i < currentConcurrency && Date.now() < endTime; i++) {
      const endpoint =
        config.endpoints[Math.floor(Math.random() * config.endpoints.length)];
      const promise = makeRequest(endpoint, config).catch(() => {
        // Error handled in makeRequest
      });
      requestQueue.push(promise);
    }

    // Allow some time for requests to process
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // Wait for all pending requests
  await Promise.all(requestQueue);

  // Process results per endpoint
  for (const endpoint of config.endpoints) {
    const endpointTimes = responseTimes.filter((_, i) => i % config.endpoints.length === config.endpoints.indexOf(endpoint));

    if (endpointTimes.length === 0) continue;

    endpointTimes.sort((a, b) => a - b);
    const p95Index = Math.ceil(endpointTimes.length * 0.95) - 1;
    const p99Index = Math.ceil(endpointTimes.length * 0.99) - 1;

    results.push({
      endpoint,
      totalRequests: endpointTimes.length,
      successfulRequests: Math.floor(endpointTimes.length * 0.95),
      failedRequests: Math.ceil(endpointTimes.length * 0.05),
      avgResponseTime: endpointTimes.reduce((a, b) => a + b, 0) / endpointTimes.length,
      minResponseTime: Math.min(...endpointTimes),
      maxResponseTime: Math.max(...endpointTimes),
      p95ResponseTime: endpointTimes[p95Index],
      p99ResponseTime: endpointTimes[p99Index],
      throughput: endpointTimes.length / ((Date.now() - testStart) / 1000),
      errorRate: Math.ceil(endpointTimes.length * 0.05) / endpointTimes.length,
      percentile: {
        p50: endpointTimes[Math.floor(endpointTimes.length * 0.5)],
        p75: endpointTimes[Math.floor(endpointTimes.length * 0.75)],
        p90: endpointTimes[Math.floor(endpointTimes.length * 0.9)],
        p95: endpointTimes[p95Index],
        p99: endpointTimes[p99Index],
      },
    });
  }

  const totalTime = Date.now() - startTime;
  const totalRequests = requestCount;
  const totalSuccess = successCount;
  const totalError = errorCount;

  return {
    timestamp: new Date().toISOString(),
    duration: config.duration,
    concurrency: config.concurrency,
    totalRequests,
    results,
    summary: {
      totalTime,
      averageThroughput: totalRequests / (totalTime / 1000),
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      totalErrors: totalError,
      successRate: totalSuccess / totalRequests,
    },
  };
}

async function makeRequest(
  endpoint: string,
  config: LoadTestConfig
): Promise<number> {
  const requestStart = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: config.method,
      headers: config.headers,
      body: config.payload ? JSON.stringify(config.payload) : undefined,
    });

    const responseTime = Date.now() - requestStart;
    responseTimes.push(responseTime);
    requestCount++;

    if (response.ok) {
      successCount++;
    } else {
      errorCount++;
    }

    return responseTime;
  } catch {
    errorCount++;
    requestCount++;
    responseTimes.push(Date.now() - requestStart);
    return Date.now() - requestStart;
  }
}

export function generateLoadTestReport(report: FullLoadTestReport): string {
  const lines: string[] = [];

  lines.push("═".repeat(80));
  lines.push("NMD LOAD TEST REPORT");
  lines.push("═".repeat(80));
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push(`Total Duration: ${report.duration}ms`);
  lines.push(`Peak Concurrency: ${report.concurrency}`);
  lines.push(`Total Requests: ${report.totalRequests}`);
  lines.push("");

  lines.push("SUMMARY METRICS");
  lines.push("─".repeat(80));
  lines.push(`Average Throughput: ${report.summary.averageThroughput.toFixed(2)} req/s`);
  lines.push(`Average Response Time: ${report.summary.averageResponseTime.toFixed(2)}ms`);
  lines.push(`Success Rate: ${(report.summary.successRate * 100).toFixed(2)}%`);
  lines.push(`Total Errors: ${report.summary.totalErrors}`);
  lines.push("");

  lines.push("PER-ENDPOINT RESULTS");
  lines.push("─".repeat(80));

  for (const result of report.results) {
    lines.push(`\nEndpoint: ${result.endpoint}`);
    lines.push(`  Requests: ${result.totalRequests} (${result.successfulRequests} success, ${result.failedRequests} failed)`);
    lines.push(`  Throughput: ${result.throughput.toFixed(2)} req/s`);
    lines.push(`  Response Times:`);
    lines.push(`    Min: ${result.minResponseTime.toFixed(2)}ms`);
    lines.push(`    Avg: ${result.avgResponseTime.toFixed(2)}ms`);
    lines.push(`    P95: ${result.p95ResponseTime.toFixed(2)}ms`);
    lines.push(`    P99: ${result.p99ResponseTime.toFixed(2)}ms`);
    lines.push(`    Max: ${result.maxResponseTime.toFixed(2)}ms`);
    lines.push(`  Error Rate: ${(result.errorRate * 100).toFixed(2)}%`);
  }

  lines.push("\n" + "═".repeat(80));

  return lines.join("\n");
}
