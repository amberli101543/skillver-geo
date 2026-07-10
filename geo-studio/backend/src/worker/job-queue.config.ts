export type JobQueueMode = "bullmq" | "inline";

export const GEO_JOB_QUEUE_NAME = "geo-jobs";

export function jobQueueMode(): JobQueueMode {
  const forced = process.env.JOB_QUEUE_MODE?.trim();
  if (forced === "inline") return "inline";
  if (forced === "bullmq" || forced === "redis") return "bullmq";
  if (process.env.REDIS_URL?.trim()) return "bullmq";
  return "inline";
}

export function jobQueueConcurrency(): number {
  const value = Number(process.env.JOB_QUEUE_CONCURRENCY ?? 2);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 2;
}

export function redisConnectionOptions(): { url: string } | { host: string; port: number } {
  const url = process.env.REDIS_URL?.trim();
  if (url) {
    return { url };
  }
  return {
    host: process.env.REDIS_HOST?.trim() || "127.0.0.1",
    port: Number(process.env.REDIS_PORT ?? 6379),
  };
}
