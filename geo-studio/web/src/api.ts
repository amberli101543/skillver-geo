export interface Brand {
  id: string;
  name: string;
  definition: string;
  positioning?: string;
}

export interface MetricTrendPoint {
  value: number;
  capturedAt: string;
}

export interface MetricTrendSeries {
  metric: string;
  points: MetricTrendPoint[];
}

export interface BrandMetricsTrend {
  brandId: string;
  engineId?: string;
  series: MetricTrendSeries[];
  byEngine: Record<string, MetricTrendSeries[]>;
}

export interface DiagnosticBatchResult {
  brandId: string;
  diagnosticRunId?: string;
  runAt: string;
  baseline: {
    questionCount: number;
    mentionRate: number;
    positiveRate: number;
    avgAccuracy: number;
  };
}

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface JobAcceptedResponse {
  jobId: string;
  status: "pending";
  type: string;
}

export interface JobFailureAdvice {
  category: string;
  summary: string;
  actions: string[];
}

export interface JobRecord {
  id: string;
  type: string;
  brandId: string | null;
  status: JobStatus;
  payload: Record<string, unknown>;
  result: unknown;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failureAdvice?: JobFailureAdvice;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJob(jobId: string): Promise<JobRecord> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, { headers: authHeaders() });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return res.json() as Promise<JobRecord>;
}

export interface JobStats {
  counts: Record<JobStatus, number>;
  queueDepth: number;
  queueMode: string;
  updatedAt: string;
  recentJobs: JobRecord[];
}

export async function fetchJobStats(): Promise<JobStats> {
  const res = await fetch(`${API_BASE}/jobs/stats`, { headers: authHeaders() });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return res.json() as Promise<JobStats>;
}

export const JOB_TYPE_LABELS: Record<string, string> = {
  diagnostic_batch: "诊断跑批",
  content_generate: "内容生成",
  distribution_execute: "分发执行",
  engine_test: "引擎试跑",
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: "等待中",
  running: "执行中",
  completed: "已完成",
  failed: "失败",
};

export const JOB_QUEUE_MODE_LABELS: Record<string, string> = {
  inline: "内联（同进程）",
  bullmq: "BullMQ（Redis）",
  disabled: "已禁用",
};

async function waitForJobResult<T>(jobId: string, timeoutMs = 600_000): Promise<T> {
  const effectiveTimeoutMs = Number(import.meta.env.VITE_JOB_WAIT_TIMEOUT_MS ?? timeoutMs);
  const safeTimeoutMs = Number.isFinite(effectiveTimeoutMs) && effectiveTimeoutMs > 0 ? effectiveTimeoutMs : timeoutMs;
  const deadline = Date.now() + safeTimeoutMs;
  let lastStatus: JobStatus | "unknown" = "unknown";
  while (Date.now() < deadline) {
    const job = await fetchJob(jobId);
    lastStatus = job.status;
    if (job.status === "completed") {
      return job.result as T;
    }
    if (job.status === "failed") {
      throw new Error(job.error ?? "任务执行失败");
    }
    await sleep(1000);
  }
  throw new Error(`任务执行超时（jobId=${jobId}，当前状态=${lastStatus}）`);
}

export interface Competitor {
  id: string;
  brandId: string;
  name: string;
}

export type QuestionCategory = "category" | "comparison" | "brand" | "attribute";
export type Sentiment = "positive" | "neutral" | "negative";

export type DiagnosticCredibilityLevel = "business-ready" | "partial" | "demo";

export interface DiagnosticCredibility {
  level: DiagnosticCredibilityLevel;
  label: string;
  reasons: string[];
  stubItemRatio: number;
  avgSourcesCount: number;
  liveEngineIds: string[];
  stubEngineIds: string[];
}

export interface DiagnosticRunSummary {
  id: string;
  brandId: string;
  questionCount: number;
  capturedAt: string;
  scoringMode?: "rule" | "llm";
  metrics: {
    mention_rate?: number;
    positive_rate?: number;
    avg_accuracy?: number;
  };
  credibility: DiagnosticCredibility;
}

export interface DiagnosticRunItem {
  question: {
    id: string;
    brandId: string;
    diagnosticRunId: string;
    category: QuestionCategory;
    text: string;
  };
  engineTest: {
    id: string;
    questionId: string;
    engineId: string;
    answer: string;
    sources: Array<{ url: string; title?: string }>;
    runAt: string;
  };
  score: {
    id: string;
    engineTestId: string;
    mentioned: boolean;
    mentionPosition: number | null;
    sentiment: Sentiment;
    accuracy: number;
    sourcesCount: number;
  };
  scoreAdvice?: {
    issues: string[];
    actions: Array<{ category: string; suggestion: string }>;
    missingAssertions: string[];
  };
}

export interface DiagnosticRunDetail extends DiagnosticRunSummary {
  baseline: {
    questionCount: number;
    mentionRate: number;
    positiveRate: number;
    avgAccuracy: number;
    sentimentBreakdown: Record<Sentiment, number>;
  };
  items: DiagnosticRunItem[];
}

export interface CreateBrandInput {
  name: string;
  definition: string;
  positioning?: string;
}

export interface UpdateBrandInput {
  name?: string;
  definition?: string;
  positioning?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const API_TOKEN = import.meta.env.VITE_API_TOKEN?.trim();

export const STORAGE_KEY_SESSION = "geo-studio:session-token";

export function getSessionToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEY_SESSION);
}

export function setSessionToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEY_SESSION, token);
}

export function clearSessionToken(): void {
  sessionStorage.removeItem(STORAGE_KEY_SESSION);
}

function authHeaders(): HeadersInit {
  const session = getSessionToken();
  if (session) {
    return { Authorization: `Bearer ${session}` };
  }
  return API_TOKEN ? { "x-api-key": API_TOKEN } : {};
}

function formatApiMessage(message: unknown): string | null {
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }
  if (Array.isArray(message)) {
    const parts = message.filter((item): item is string => typeof item === "string" && item.trim() !== "");
    if (parts.length > 0) {
      return parts.join("；");
    }
  }
  return null;
}

async function toApiError(res: Response): Promise<Error> {
  let detail: string | null = null;
  try {
    const data = (await res.json()) as { message?: unknown };
    detail = formatApiMessage(data.message);
  } catch {
    // ignore parse failure, fall back to generic status message
  }

  if (res.status === 401 || res.status === 403) {
    return new Error(detail ?? "未授权，请重新登录");
  }
  if (res.status === 404) {
    return new Error(detail ?? "资源不存在或已删除");
  }
  if (res.status === 429) {
    return new Error(detail ?? "请求过于频繁，请稍后重试");
  }
  if (res.status >= 500) {
    return new Error(detail ?? "服务暂时不可用，请稍后重试");
  }
  if (detail) {
    return new Error(detail);
  }
  return new Error(`请求失败 (${res.status})`);
}

export async function fetchBrands(): Promise<Brand[]> {
  const res = await fetch(`${API_BASE}/brands`, { headers: authHeaders() });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return res.json() as Promise<Brand[]>;
}

export async function createBrand(input: CreateBrandInput): Promise<Brand> {
  const res = await fetch(`${API_BASE}/brands`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return res.json() as Promise<Brand>;
}

export async function updateBrand(brandId: string, input: UpdateBrandInput): Promise<Brand> {
  const res = await fetch(`${API_BASE}/brands/${brandId}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return res.json() as Promise<Brand>;
}

export async function deleteBrand(brandId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/brands/${brandId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
}

export async function fetchBrandMetrics(
  brandId: string,
  engineId?: string,
): Promise<BrandMetricsTrend> {
  const qs = engineId ? `?engineId=${encodeURIComponent(engineId)}` : "";
  const res = await fetch(`${API_BASE}/brands/${brandId}/metrics${qs}`, { headers: authHeaders() });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return res.json() as Promise<BrandMetricsTrend>;
}

export async function runDiagnosticBatch(
  brandId: string,
  options: { engineIds?: string[] } = {},
): Promise<DiagnosticBatchResult> {
  const url = `${API_BASE}/brands/${brandId}/diagnostic-runs`;
  const body =
    options.engineIds && options.engineIds.length > 0 ? { engineIds: options.engineIds } : {};
  const res = await fetch(url, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
  if (res.status === 202) {
    const accepted = (await res.json()) as JobAcceptedResponse;
    return waitForJobResult<DiagnosticBatchResult>(accepted.jobId);
  }
  return res.json() as Promise<DiagnosticBatchResult>;
}

export async function fetchDiagnosticRuns(brandId: string): Promise<DiagnosticRunSummary[]> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/diagnostic-runs`, { headers: authHeaders() });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return res.json() as Promise<DiagnosticRunSummary[]>;
}

export async function fetchDiagnosticRunDetail(
  brandId: string,
  runId: string,
): Promise<DiagnosticRunDetail> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/diagnostic-runs/${runId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return res.json() as Promise<DiagnosticRunDetail>;
}

export async function fetchCompetitors(brandId: string): Promise<Competitor[]> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/competitors`, { headers: authHeaders() });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return res.json() as Promise<Competitor[]>;
}

export async function addCompetitor(brandId: string, name: string): Promise<Competitor> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/competitors`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return res.json() as Promise<Competitor>;
}

export async function deleteCompetitor(brandId: string, competitorId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/competitors/${competitorId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
}

export interface Assertion {
  id: string;
  brandId: string;
  text: string;
  evidence?: string;
}

export async function fetchAssertions(brandId: string): Promise<Assertion[]> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/assertions`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<Assertion[]>;
}

export async function addAssertion(
  brandId: string,
  input: { text: string; evidence?: string },
): Promise<Assertion> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/assertions`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<Assertion>;
}

export async function deleteAssertion(brandId: string, assertionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/assertions/${assertionId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw await toApiError(res);
}

export interface RetestSchedule {
  brandId: string;
  enabled: boolean;
  intervalHours: number;
  lastRunAt?: string;
  nextRunAt?: string;
}

export async function fetchRetestSchedule(brandId: string): Promise<RetestSchedule> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/retest-schedule`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<RetestSchedule>;
}

export async function updateRetestSchedule(
  brandId: string,
  input: { enabled: boolean; intervalHours: number },
): Promise<RetestSchedule> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/retest-schedule`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<RetestSchedule>;
}

export const METRIC_LABELS: Record<string, string> = {
  mention_rate: "提及率",
  positive_rate: "正面率",
  avg_accuracy: "平均准确性",
};

export const CATEGORY_LABELS: Record<string, string> = {
  category: "品类",
  brand: "品牌",
  attribute: "属性",
  comparison: "竞品对比",
};

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: "正面",
  neutral: "中性",
  negative: "负面",
};

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STORAGE_KEY_BRAND = "geo-studio:last-brand";

export interface MatrixCell {
  id: string;
  brandId: string;
  intent: string;
  angle: string;
  stage: string;
  audience: string;
  title: string;
  priority: number;
}

export interface MatrixGap {
  intent: string;
  angle: string;
  title: string;
  priority: number;
  reasons: string[];
  questionCategory: string;
  questionText: string;
}

export interface MatrixGapAnalysis {
  diagnosticRunId: string;
  capturedAt: string;
  gaps: MatrixGap[];
}

export interface MatrixGapSyncResult {
  analysis: MatrixGapAnalysis;
  cells: MatrixCell[];
}

export type ContentDraftStatus = "draft" | "review" | "published";

export type ContentVerificationDirection = "favorable" | "neutral" | "needs_improvement";

export interface ContentVerification {
  verifiedAt: string;
  question: string;
  engineId: string;
  mentioned: boolean;
  accuracy: number;
  sentiment: Sentiment;
  sourcesCount: number;
  direction: ContentVerificationDirection;
  summary: string;
  draftAlignment: {
    keyPhrasesInAnswer: number;
    keyPhrasesChecked: number;
    brandInAnswer: boolean;
  };
  hints: string[];
}

export interface ContentDraft {
  id: string;
  cellId: string;
  body: string;
  status: ContentDraftStatus;
  version: number;
  ragSnippets?: string[];
  verification?: ContentVerification;
  createdAt: string;
  updatedAt: string;
}

export const DRAFT_STATUS_LABELS: Record<ContentDraftStatus, string> = {
  draft: "草稿",
  review: "审核中",
  published: "已发布",
};

export async function fetchMatrixCells(brandId: string): Promise<MatrixCell[]> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/matrix-cells`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<MatrixCell[]>;
}

export async function fetchMatrixGaps(brandId: string): Promise<MatrixGapAnalysis> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/matrix-gaps`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<MatrixGapAnalysis>;
}

export async function syncMatrixGaps(brandId: string): Promise<MatrixGapSyncResult> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/matrix-cells/sync-gaps`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<MatrixGapSyncResult>;
}

export async function syncMatrixAssertions(brandId: string): Promise<{ cells: MatrixCell[] }> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/matrix-cells/sync-assertions`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<{ cells: MatrixCell[] }>;
}

export async function createMatrixCell(
  brandId: string,
  input: {
    intent: string;
    angle: string;
    stage?: string;
    audience?: string;
    title: string;
    priority?: number;
  },
): Promise<MatrixCell> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/matrix-cells`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<MatrixCell>;
}

export async function updateMatrixCell(
  brandId: string,
  cellId: string,
  input: {
    intent?: string;
    angle?: string;
    stage?: string;
    audience?: string;
    title?: string;
    priority?: number;
  },
): Promise<MatrixCell> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/matrix-cells/${cellId}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<MatrixCell>;
}

export async function deleteMatrixCell(brandId: string, cellId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/matrix-cells/${cellId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw await toApiError(res);
}

export async function fetchContentDrafts(brandId: string): Promise<ContentDraft[]> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/content-drafts`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<ContentDraft[]>;
}

export async function fetchCellContentDrafts(
  brandId: string,
  cellId: string,
): Promise<ContentDraft[]> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/matrix-cells/${cellId}/content-drafts`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<ContentDraft[]>;
}

export async function generateContentDraft(brandId: string, cellId: string): Promise<ContentDraft> {
  const res = await fetch(
    `${API_BASE}/brands/${brandId}/matrix-cells/${cellId}/content-drafts/generate`,
    { method: "POST", headers: authHeaders() },
  );
  if (!res.ok) throw await toApiError(res);
  if (res.status === 202) {
    const accepted = (await res.json()) as JobAcceptedResponse;
    return waitForJobResult<ContentDraft>(accepted.jobId);
  }
  return res.json() as Promise<ContentDraft>;
}

export async function updateContentDraft(
  brandId: string,
  draftId: string,
  input: { body?: string; status?: ContentDraftStatus },
): Promise<ContentDraft> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/content-drafts/${draftId}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<ContentDraft>;
}

export async function deleteContentDraft(brandId: string, draftId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/content-drafts/${draftId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw await toApiError(res);
}

export async function verifyContentDraft(brandId: string, draftId: string): Promise<ContentDraft> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/content-drafts/${draftId}/verify`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<ContentDraft>;
}

export type SourceTier = "consensus" | "professional" | "community" | "owned";
export type ChannelType = "api" | "manual" | "export";

export interface Source {
  id: string;
  name: string;
  tier: SourceTier;
  weight: number;
  channelType: ChannelType;
}

export type DistributionTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export interface DistributionTask {
  id: string;
  brandId: string;
  contentDraftId: string;
  sourceId: string;
  priority: number;
  status: DistributionTaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublishRecord {
  id: string;
  brandId: string;
  contentDraftId: string;
  sourceId?: string;
  distributionTaskId?: string;
  channel: string;
  externalUrl?: string;
  publishedAt: string;
  createdAt: string;
}

export type DistributionOverallDirection =
  | "improved"
  | "declined"
  | "mixed"
  | "unchanged"
  | "pending"
  | "insufficient_data";

export interface MetricImpactDelta {
  before: number | null;
  after: number | null;
  delta: number | null;
  direction: "up" | "down" | "flat" | "pending";
}

export interface PublishImpactItem {
  publishRecordId: string;
  publishedAt: string;
  contentDraftId: string;
  channel: string;
  beforeCapturedAt: string | null;
  afterCapturedAt: string | null;
  metrics: {
    mention_rate: MetricImpactDelta;
    positive_rate: MetricImpactDelta;
    avg_accuracy: MetricImpactDelta;
  };
  overallDirection: DistributionOverallDirection;
  summary: string;
}

export interface DistributionImpactResponse {
  brandId: string;
  items: PublishImpactItem[];
}

export const DISTRIBUTION_DIRECTION_LABELS: Record<DistributionOverallDirection, string> = {
  improved: "趋势向好",
  declined: "趋势走弱",
  mixed: "有升有降",
  unchanged: "基本持平",
  pending: "待跑批",
  insufficient_data: "缺基线",
};

export const SOURCE_TIER_LABELS: Record<SourceTier, string> = {
  consensus: "共识层",
  professional: "专业层",
  community: "社区层",
  owned: "自有阵地",
};

export const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  api: "API 自动",
  manual: "人工发布",
  export: "导出稿件",
};

export const TASK_STATUS_LABELS: Record<DistributionTaskStatus, string> = {
  pending: "待分发",
  in_progress: "进行中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

export async function fetchSources(): Promise<Source[]> {
  const res = await fetch(`${API_BASE}/sources`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<Source[]>;
}

export async function createSource(input: {
  name: string;
  tier: SourceTier;
  weight: number;
  channelType: ChannelType;
}): Promise<Source> {
  const res = await fetch(`${API_BASE}/sources`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<Source>;
}

export async function updateSource(
  sourceId: string,
  input: { name?: string; tier?: SourceTier; weight?: number; channelType?: ChannelType },
): Promise<Source> {
  const res = await fetch(`${API_BASE}/sources/${sourceId}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<Source>;
}

export async function deleteSource(sourceId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/sources/${sourceId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw await toApiError(res);
}

export async function fetchDistributionTasks(brandId: string): Promise<DistributionTask[]> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/distribution-tasks`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<DistributionTask[]>;
}

export async function createDistributionTask(
  brandId: string,
  input: { contentDraftId: string; sourceId: string; priority?: number },
): Promise<DistributionTask> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/distribution-tasks`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<DistributionTask>;
}

export async function updateDistributionTask(
  brandId: string,
  taskId: string,
  input: { priority?: number; status?: DistributionTaskStatus },
): Promise<DistributionTask> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/distribution-tasks/${taskId}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<DistributionTask>;
}

export async function fetchPublishRecords(brandId: string): Promise<PublishRecord[]> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/publish-records`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<PublishRecord[]>;
}

export async function fetchDistributionImpact(brandId: string): Promise<DistributionImpactResponse> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/distribution-impact`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<DistributionImpactResponse>;
}

export async function createPublishRecord(
  brandId: string,
  input: {
    contentDraftId: string;
    channel: string;
    sourceId?: string;
    distributionTaskId?: string;
    externalUrl?: string;
  },
): Promise<PublishRecord> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/publish-records`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<PublishRecord>;
}

export interface ExportManuscript {
  filename: string;
  contentType: string;
  title: string;
  body: string;
}

export interface ExecuteDistributionTaskResult {
  mode: "api" | "export";
  task: DistributionTask;
  publishRecord?: PublishRecord;
  export?: ExportManuscript;
}

export async function executeDistributionTask(
  brandId: string,
  taskId: string,
): Promise<ExecuteDistributionTaskResult> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/distribution-tasks/${taskId}/execute`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw await toApiError(res);
  if (res.status === 202) {
    const accepted = (await res.json()) as JobAcceptedResponse;
    return waitForJobResult<ExecuteDistributionTaskResult>(accepted.jobId);
  }
  return res.json() as Promise<ExecuteDistributionTaskResult>;
}

export function downloadExportManuscript(manuscript: ExportManuscript): void {
  const blob = new Blob([manuscript.body], { type: manuscript.contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = manuscript.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type AlertType = "misinformation" | "threshold" | "metric_drop";
export type AlertSeverity = "warn" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface Alert {
  id: string;
  brandId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  status: AlertStatus;
  diagnosticRunId?: string;
  questionId?: string;
  metric?: string;
  metricValue?: number;
  threshold?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlertThresholdConfig {
  mentionRateMin: number;
  avgAccuracyMin: number;
  itemAccuracyMin: number;
  mentionDropMax: number;
}

export interface AlertNotificationConfig {
  webhookEnabled: boolean;
  webhookUrl: string | null;
  emailEnabled: boolean;
  emailTo: string | null;
}

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  misinformation: "错误信息",
  threshold: "阈值",
  metric_drop: "指标下跌",
};

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  open: "待处理",
  acknowledged: "已确认",
  resolved: "已解决",
};

export async function fetchAlerts(brandId: string, status?: AlertStatus): Promise<Alert[]> {
  const query = status ? `?status=${status}` : "";
  const res = await fetch(`${API_BASE}/brands/${brandId}/alerts${query}`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<Alert[]>;
}

export async function updateAlert(
  brandId: string,
  alertId: string,
  input: { status: AlertStatus },
): Promise<Alert> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/alerts/${alertId}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<Alert>;
}

export async function fetchAlertThresholds(brandId: string): Promise<AlertThresholdConfig> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/alert-thresholds`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<AlertThresholdConfig>;
}

export async function updateAlertThresholds(
  brandId: string,
  input: Partial<AlertThresholdConfig>,
): Promise<AlertThresholdConfig> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/alert-thresholds`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<AlertThresholdConfig>;
}

export async function fetchAlertNotifications(brandId: string): Promise<AlertNotificationConfig> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/alert-notifications`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<AlertNotificationConfig>;
}

export async function updateAlertNotifications(
  brandId: string,
  input: Partial<AlertNotificationConfig>,
): Promise<AlertNotificationConfig> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/alert-notifications`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<AlertNotificationConfig>;
}

export interface AiStatus {
  openAiConfigured: boolean;
  engineMode: "stub" | "live";
  scoringMode: "rule" | "llm";
  contentMode: "stub" | "live";
  model: string;
  llmProvider: "openai" | "anthropic" | null;
  llmFallbackCount: number;
  promptVersions: {
    engine: string;
    scoring: string;
    content: string;
  };
}

export interface ModelProfile {
  id: string;
  label: string;
  model: string;
  provider?: "openai" | "anthropic";
  hasApiKey?: boolean;
  apiKey?: string | null;
}

export interface PromptVersionSelection {
  engine: string;
  scoring: string;
  content: string;
}

export interface PromptCatalogView {
  active: PromptVersionSelection;
  available: {
    engine: string[];
    scoring: string[];
    content: string[];
  };
  previews: {
    engine: Record<string, string>;
    scoring: Record<string, string>;
    content: Record<string, string>;
  };
}

export interface AiSettingsView {
  engineMode: "stub" | "live" | null;
  scoringMode: "rule" | "llm" | null;
  contentMode: "stub" | "live" | null;
  openAiModel: string | null;
  llmProvider: "openai" | "anthropic" | null;
  availableProviders: Array<{ id: "openai" | "anthropic"; label: string; defaultModel: string }>;
  modelCatalog: ModelProfile[];
  promptVersions: PromptVersionSelection;
  availablePromptVersions: {
    engine: string[];
    scoring: string[];
    content: string[];
  };
  hasOpenAiKey: boolean;
  openAiKeyMasked: string | null;
  runtime: AiStatus;
}

export interface LoginResult {
  token: string;
  username: string;
  expiresAt: string;
}

export interface UpdateAiSettingsInput {
  engineMode?: "stub" | "live" | null;
  scoringMode?: "rule" | "llm" | null;
  contentMode?: "stub" | "live" | null;
  openAiModel?: string | null;
  openAiApiKey?: string | null;
  modelCatalog?: ModelProfile[];
  promptVersions?: Partial<PromptVersionSelection>;
}

export async function fetchAiPrompts(): Promise<PromptCatalogView> {
  const res = await fetch(`${API_BASE}/ai/prompts`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<PromptCatalogView>;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new Error("无法连接后端，请先启动 backend（npm --prefix backend run start:dev）");
  }
  if (!res.ok) {
    const err = await toApiError(res);
    if (err.message === "invalid username or password") {
      throw new Error("用户名或密码错误");
    }
    throw err;
  }
  return res.json() as Promise<LoginResult>;
}

export async function fetchAuthMe(): Promise<{ username: string }> {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<{ username: string }>;
}

export async function fetchAiStatus(): Promise<AiStatus> {
  const res = await fetch(`${API_BASE}/ai/status`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<AiStatus>;
}

export async function fetchAiSettings(): Promise<AiSettingsView> {
  const res = await fetch(`${API_BASE}/ai/settings`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<AiSettingsView>;
}

export async function updateAiSettings(input: UpdateAiSettingsInput): Promise<AiSettingsView> {
  const res = await fetch(`${API_BASE}/ai/settings`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<AiSettingsView>;
}

export interface EngineTestResult {
  question: string;
  engineId: string;
  answer: string;
  sources: Array<{ url: string; title?: string }>;
  runAt: string;
  score: {
    mentioned: boolean;
    mentionPosition: number | null;
    sentiment: Sentiment;
    accuracy: number;
    sourcesCount: number;
    ragSnippets?: string[];
  };
}

export interface DiagnosticQuestion {
  brandId: string;
  category: QuestionCategory;
  text: string;
}

export interface EngineCapability {
  id: string;
  name: string;
  description: string;
  modes: string[];
}

export async function fetchEngineCapabilities(): Promise<EngineCapability[]> {
  const res = await fetch(`${API_BASE}/engines`, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<EngineCapability[]>;
}

export async function fetchQuestions(brandId: string): Promise<DiagnosticQuestion[]> {
  const url = `${API_BASE}/brands/${brandId}/questions`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<DiagnosticQuestion[]>;
}

export async function runEngineTest(
  brandId: string,
  question: string,
  engineId?: string,
): Promise<EngineTestResult> {
  const res = await fetch(`${API_BASE}/brands/${brandId}/engine-tests`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ question, ...(engineId ? { engineId } : {}) }),
  });
  if (!res.ok) throw await toApiError(res);
  if (res.status === 202) {
    const accepted = (await res.json()) as JobAcceptedResponse;
    return waitForJobResult<EngineTestResult>(accepted.jobId);
  }
  return res.json() as Promise<EngineTestResult>;
}
