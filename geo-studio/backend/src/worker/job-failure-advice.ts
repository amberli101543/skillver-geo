import { JOB_TYPES, type JobFailureAdvice, type JobRecord, type JobType } from "./job.types";

interface AdviceMatch {
  category: string;
  summary: string;
  actions: string[];
}

function advice(match: AdviceMatch): JobFailureAdvice {
  return match;
}

function hasWholeWord(text: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`).test(text);
}

function matchByError(errorLower: string, jobType: JobType): JobFailureAdvice | undefined {
  if (errorLower.includes("dispatch failed") || errorLower.includes("econnrefused") || errorLower.includes("redis")) {
    return advice({
      category: "queue",
      summary: "任务未能进入队列或 Worker 不可达",
      actions: [
        "确认 Redis 已启动且 REDIS_URL 正确（BullMQ 模式）",
        "分离部署时确认 Worker 进程在运行并监听同一 Redis",
        "开发环境可设置 JOB_QUEUE_MODE=inline 绕过队列",
      ],
    });
  }

  if (errorLower.includes("perplexity")) {
    return advice({
      category: "engine",
      summary: "Perplexity 引擎调用失败",
      actions: [
        "配置 PERPLEXITY_API_KEY，或设置 PERPLEXITY_MODE=stub 使用演示模式",
        "检查 PERPLEXITY_TIMEOUT_MS 是否过短导致超时",
      ],
    });
  }

  if (
    errorLower.includes("openai_api_key") ||
    errorLower.includes("openai") ||
    (errorLower.includes("api key") && !errorLower.includes("perplexity")) ||
    errorLower.includes("401") ||
    errorLower.includes("unauthorized")
  ) {
    return advice({
      category: "llm",
      summary: "LLM / 引擎 API 认证失败",
      actions: [
        "在环境变量或 AI 设置中配置有效的 OPENAI_API_KEY",
        "确认 ENGINE_MODE 与 Key 匹配（live 需有效 Key，否则走 stub）",
        jobType === JOB_TYPES.DIAGNOSTIC_BATCH
          ? "跑批前可在「引擎试跑」单题验证 Key 是否可用"
          : "重试前先在引擎试跑面板验证单题调用",
      ],
    });
  }

  if (errorLower.includes("engine connector not found") || errorLower.includes("engine connector")) {
    return advice({
      category: "engine",
      summary: "指定的引擎连接器不存在",
      actions: [
        "在 GET /engines 查看可用 engineId，跑批/试跑时使用列表中的 ID",
        "检查 DIAGNOSTIC_ENGINE_IDS 环境变量是否包含无效 ID",
      ],
    });
  }

  if (errorLower.includes("brand") && errorLower.includes("not found")) {
    return advice({
      category: "data",
      summary: "关联品牌不存在或已被删除",
      actions: ["刷新看板并重新选择品牌", "确认任务 payload 中的 brandId 仍有效"],
    });
  }

  if (errorLower.includes("cannot be executed") || errorLower.includes("distribution task")) {
    return advice({
      category: "distribution",
      summary: "分发任务状态不允许执行",
      actions: [
        "仅 pending / in_progress 状态可执行；completed 任务需新建分发任务",
        "失败任务请检查信源渠道配置后重新创建任务",
      ],
    });
  }

  if (
    errorLower.includes("publish") ||
    errorLower.includes("cms") ||
    errorLower.includes("connector") ||
    errorLower.includes("bad gateway")
  ) {
    return advice({
      category: "distribution",
      summary: "发布连接器或 CMS 调用失败",
      actions: [
        "检查 CMS_API_URL / CMS_API_KEY 等发布相关环境变量",
        "api 渠道失败时可改用 export/manual 渠道导出稿件后人工发布",
      ],
    });
  }

  if (errorLower.includes("content draft") && errorLower.includes("not found")) {
    return advice({
      category: "content",
      summary: "关联内容初稿不存在",
      actions: ["在矩阵中重新生成初稿后再创建分发任务", "确认任务引用的 contentDraftId 未删除"],
    });
  }

  if (
    errorLower.includes("matrix cell") ||
    errorLower.includes("cell not found") ||
    hasWholeWord(errorLower, "cell")
  ) {
    return advice({
      category: "content",
      summary: "矩阵单元不可用",
      actions: ["确认矩阵单元仍存在", "重新生成初稿后再触发内容生成 Job"],
    });
  }

  if (errorLower.includes("timeout") || errorLower.includes("timed out") || errorLower.includes("abort")) {
    return advice({
      category: "timeout",
      summary: "任务执行超时",
      actions: [
        "缩小跑批题集或降低 DIAGNOSTIC_BATCH_CONCURRENCY",
        "检查外部 API 延迟；必要时增大引擎/LLM 超时配置",
        "BullMQ 模式下确认 Worker 未因 OOM 被杀死",
      ],
    });
  }

  if (errorLower.includes("unsupported job type")) {
    return advice({
      category: "system",
      summary: "Worker 不支持该任务类型",
      actions: ["升级 Worker 至与 API 相同版本", "确认 JOB_TYPES 在 runner 中均已实现"],
    });
  }

  return undefined;
}

function fallbackByJobType(jobType: JobType): JobFailureAdvice {
  switch (jobType) {
    case JOB_TYPES.DIAGNOSTIC_BATCH:
      return advice({
        category: "diagnostic",
        summary: "诊断跑批失败",
        actions: [
          "检查 OPENAI_API_KEY / 引擎配置后重试跑批",
          "查看任务备注中的原始 error 定位具体环节",
          "可先单题引擎试跑确认引擎可用再跑全量",
        ],
      });
    case JOB_TYPES.CONTENT_GENERATE:
      return advice({
        category: "content",
        summary: "内容生成失败",
        actions: [
          "确认 LLM API Key 与矩阵单元有效",
          "在矩阵面板手动生成初稿验证链路",
        ],
      });
    case JOB_TYPES.DISTRIBUTION_EXECUTE:
      return advice({
        category: "distribution",
        summary: "分发执行失败",
        actions: [
          "检查信源渠道类型与 CMS 环境变量",
          "任务失败后可更新任务状态并重新执行，或改用手动记录发布",
        ],
      });
    case JOB_TYPES.ENGINE_TEST:
      return advice({
        category: "engine",
        summary: "引擎试跑失败",
        actions: [
          "确认 OPENAI_API_KEY 或目标引擎 Key 已配置",
          "切换默认引擎或在请求中指定有效 engineId",
        ],
      });
    default:
      return advice({
        category: "unknown",
        summary: "任务执行失败",
        actions: ["查看原始 error 信息", "修复配置后重新触发同类任务"],
      });
  }
}

export function buildJobFailureAdvice(job: Pick<JobRecord, "type" | "status" | "error">): JobFailureAdvice | undefined {
  if (job.status !== "failed" || !job.error?.trim()) {
    return undefined;
  }
  const errorLower = job.error.toLowerCase();
  const jobType = job.type as JobType;
  return matchByError(errorLower, jobType) ?? fallbackByJobType(jobType);
}

export function enrichJobWithFailureAdvice(job: JobRecord): JobRecord {
  const failureAdvice = buildJobFailureAdvice(job);
  return failureAdvice ? { ...job, failureAdvice } : job;
}
