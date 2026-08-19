/**
 * NMD Memory Profiler
 * Track heap usage, memory leaks, and GC patterns
 */

export interface MemorySnapshot {
  timestamp: string;
  heapUsed: number; // bytes
  heapTotal: number; // bytes
  external: number; // bytes
  arrayBuffers: number; // bytes
  rss: number; // Resident Set Size
  heapUsedPercent: number;
}

export interface MemoryProfile {
  snapshots: MemorySnapshot[];
  duration: number;
  intervalMs: number;
  maxHeap: number;
  minHeap: number;
  avgHeap: number;
  leakIndicators: LeakIndicator[];
}

export interface LeakIndicator {
  type: "linear_growth" | "spike" | "stalled_gc";
  severity: "low" | "medium" | "high";
  description: string;
  data: MemorySnapshot[];
}

export interface GCEvent {
  timestamp: number;
  type: "start" | "end" | "mark_sweep" | "scavenge";
  duration: number;
  freedMemory: number;
}

const snapshots: MemorySnapshot[] = [];
const gcEvents: GCEvent[] = [];

export function startMemoryProfiling(intervalMs: number = 1000): number {
  const interval = setInterval(() => {
    const mem = process.memoryUsage();
    const totalMemory = require("os").totalmem();

    snapshots.push({
      timestamp: new Date().toISOString(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers || 0,
      rss: mem.rss,
      heapUsedPercent: (mem.heapUsed / totalMemory) * 100,
    });
  }, intervalMs);

  return interval;
}

export function stopMemoryProfiling(intervalId: number): MemoryProfile {
  clearInterval(intervalId);

  if (snapshots.length === 0) {
    return {
      snapshots: [],
      duration: 0,
      intervalMs: 0,
      maxHeap: 0,
      minHeap: 0,
      avgHeap: 0,
      leakIndicators: [],
    };
  }

  const heapUsages = snapshots.map((s) => s.heapUsed);
  const maxHeap = Math.max(...heapUsages);
  const minHeap = Math.min(...heapUsages);
  const avgHeap = heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length;

  const firstTime = new Date(snapshots[0].timestamp).getTime();
  const lastTime = new Date(snapshots[snapshots.length - 1].timestamp).getTime();
  const duration = lastTime - firstTime;

  const leakIndicators = detectMemoryLeaks(snapshots);

  const profile: MemoryProfile = {
    snapshots,
    duration,
    intervalMs: duration / snapshots.length,
    maxHeap,
    minHeap,
    avgHeap,
    leakIndicators,
  };

  snapshots.length = 0;

  return profile;
}

function detectMemoryLeaks(data: MemorySnapshot[]): LeakIndicator[] {
  const indicators: LeakIndicator[] = [];

  if (data.length < 5) return indicators;

  const heapUsages = data.map((s) => s.heapUsed);

  // Linear growth detection
  const firstQuarter = heapUsages.slice(0, Math.floor(data.length / 4));
  const lastQuarter = heapUsages.slice(Math.floor((data.length * 3) / 4));

  const firstAvg = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
  const lastAvg = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
  const growthPercent = ((lastAvg - firstAvg) / firstAvg) * 100;

  if (growthPercent > 50) {
    indicators.push({
      type: "linear_growth",
      severity: growthPercent > 100 ? "high" : "medium",
      description: `Heap memory grew ${growthPercent.toFixed(1)}% over profiling duration`,
      data,
    });
  }

  // Spike detection
  const avgHeap = heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length;
  const stdDev = Math.sqrt(
    heapUsages.reduce((sum, val) => sum + Math.pow(val - avgHeap, 2), 0) / heapUsages.length
  );

  for (let i = 1; i < heapUsages.length - 1; i++) {
    const spike = Math.abs(heapUsages[i] - avgHeap) / stdDev;
    if (spike > 3) {
      indicators.push({
        type: "spike",
        severity: spike > 5 ? "high" : "medium",
        description: `Heap spike detected at ${data[i].timestamp}: ${(heapUsages[i] / 1024 / 1024).toFixed(2)}MB`,
        data: [data[i - 1], data[i], data[i + 1]],
      });
    }
  }

  // Stalled GC detection (if heap doesn't decrease)
  let stalledSegments = 0;
  for (let i = 1; i < heapUsages.length; i++) {
    if (heapUsages[i] >= heapUsages[i - 1]) {
      stalledSegments++;
    }
  }

  const stalledPercent = (stalledSegments / heapUsages.length) * 100;
  if (stalledPercent > 70) {
    indicators.push({
      type: "stalled_gc",
      severity: "medium",
      description: `Garbage collection appears stalled: ${stalledPercent.toFixed(1)}% of samples show non-decreasing heap`,
      data,
    });
  }

  return indicators;
}

export function recordGCEvent(type: GCEvent["type"], duration: number, freed: number): void {
  gcEvents.push({
    timestamp: Date.now(),
    type,
    duration,
    freedMemory: freed,
  });
}

export function getMemoryStats(): {
  current: MemorySnapshot;
  gcEventCount: number;
  totalFreedByGC: number;
  avgGCDuration: number;
} {
  const mem = process.memoryUsage();
  const totalMemory = require("os").totalmem();
  const current: MemorySnapshot = {
    timestamp: new Date().toISOString(),
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external,
    arrayBuffers: mem.arrayBuffers || 0,
    rss: mem.rss,
    heapUsedPercent: (mem.heapUsed / totalMemory) * 100,
  };

  const totalFreed = gcEvents.reduce((sum, event) => sum + event.freedMemory, 0);
  const avgDuration =
    gcEvents.length > 0
      ? gcEvents.reduce((sum, event) => sum + event.duration, 0) / gcEvents.length
      : 0;

  return {
    current,
    gcEventCount: gcEvents.length,
    totalFreedByGC: totalFreed,
    avgGCDuration: avgDuration,
  };
}

export function generateMemoryReport(profile: MemoryProfile): string {
  const lines: string[] = [];

  lines.push("═".repeat(80));
  lines.push("NMD MEMORY PROFILE REPORT");
  lines.push("═".repeat(80));
  lines.push(`Profiling Duration: ${(profile.duration / 1000).toFixed(2)}s`);
  lines.push(`Sample Interval: ${profile.intervalMs.toFixed(0)}ms`);
  lines.push(`Total Snapshots: ${profile.snapshots.length}`);
  lines.push("");

  lines.push("HEAP MEMORY METRICS");
  lines.push("─".repeat(80));
  lines.push(`Max Heap Usage: ${(profile.maxHeap / 1024 / 1024).toFixed(2)}MB`);
  lines.push(`Min Heap Usage: ${(profile.minHeap / 1024 / 1024).toFixed(2)}MB`);
  lines.push(`Avg Heap Usage: ${(profile.avgHeap / 1024 / 1024).toFixed(2)}MB`);
  lines.push(`Heap Growth: ${(((profile.maxHeap - profile.minHeap) / profile.minHeap) * 100).toFixed(2)}%`);
  lines.push("");

  if (profile.leakIndicators.length === 0) {
    lines.push("LEAK DETECTION");
    lines.push("─".repeat(80));
    lines.push("✓ No memory leaks detected");
  } else {
    lines.push("LEAK DETECTION");
    lines.push("─".repeat(80));
    lines.push(`⚠ Found ${profile.leakIndicators.length} potential issues:\n`);

    for (const indicator of profile.leakIndicators) {
      lines.push(`[${indicator.severity.toUpperCase()}] ${indicator.type}`);
      lines.push(`  ${indicator.description}`);
      lines.push("");
    }
  }

  lines.push("═".repeat(80));

  return lines.join("\n");
}
