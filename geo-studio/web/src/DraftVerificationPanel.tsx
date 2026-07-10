import { formatPct } from "./api";
import { type ContentDraft } from "./api";

const DIRECTION_LABELS: Record<NonNullable<ContentDraft["verification"]>["direction"], string> = {
  favorable: "引用方向良好",
  neutral: "部分达标",
  needs_improvement: "需加强",
};

interface DraftVerificationPanelProps {
  verification: NonNullable<ContentDraft["verification"]>;
  verifying?: boolean;
  onReverify?: () => void;
}

export function DraftVerificationPanel({
  verification,
  verifying = false,
  onReverify,
}: DraftVerificationPanelProps) {
  const badgeClass =
    verification.direction === "favorable"
      ? "badge badge-ok"
      : verification.direction === "neutral"
        ? "badge badge-neutral"
        : "badge badge-warn";

  return (
    <div className="draft-verification-block">
      <div className="draft-verification-header">
        <span className="draft-verification-title">引用验证</span>
        <span className={badgeClass}>{DIRECTION_LABELS[verification.direction]}</span>
        {onReverify && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={verifying}
            onClick={onReverify}
          >
            {verifying ? "验证中…" : "重新验证"}
          </button>
        )}
      </div>
      <p className="muted compact draft-verification-summary">{verification.summary}</p>
      <div className="draft-verification-metrics">
        <span>{verification.mentioned ? "已提及" : "未提及"}</span>
        <span>准确性 {formatPct(verification.accuracy)}</span>
        <span>信源 {verification.sourcesCount}</span>
        <span className="badge badge-neutral">{verification.engineId}</span>
      </div>
      <p className="muted compact draft-verification-question">验证问题：{verification.question}</p>
      {verification.hints.length > 0 && (
        <ol className="draft-verification-hints">
          {verification.hints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
