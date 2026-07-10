import { JobQueueService } from "./job-queue.service";

export function stubJobQueueService(): Pick<JobQueueService, "dispatch" | "mode" | "getQueueDepth"> {
  return {
    mode: "inline",
    dispatch: async () => {},
    getQueueDepth: async () => 0,
  };
}
