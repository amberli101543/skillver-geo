import { useEffect, useState } from "react";
import {
  deleteContentDraft,
  updateContentDraft,
  verifyContentDraft,
  type ContentDraft,
} from "./api";
import { DraftVerificationPanel } from "./DraftVerificationPanel";
import { RagSnippetsPanel } from "./RagSnippetsPanel";

interface DraftEditorProps {
  brandId: string;
  draft: ContentDraft;
  onSaved: (draft: ContentDraft) => void;
  onDeleted: () => void;
}

export function DraftEditor({ brandId, draft, onSaved, onDeleted }: DraftEditorProps) {
  const [body, setBody] = useState(draft.body);
  const [verification, setVerification] = useState(draft.verification);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBody(draft.body);
    setVerification(draft.verification);
  }, [draft.id, draft.body, draft.verification]);

  async function handleSave() {
    if (!brandId) return;
    setSaving(true);
    setError(null);
    try {
      onSaved(await updateContentDraft(brandId, draft.id, { body }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!brandId || !window.confirm("确定删除此初稿？")) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteContentDraft(brandId, draft.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  async function handleReverify() {
    if (!brandId) return;
    setVerifying(true);
    setError(null);
    try {
      const next = await verifyContentDraft(brandId, draft.id);
      setVerification(next.verification);
      onSaved(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "验证失败");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="draft-editor">
      <RagSnippetsPanel snippets={draft.ragSnippets ?? []} />
      {verification ? (
        <DraftVerificationPanel
          verification={verification}
          verifying={verifying}
          onReverify={() => void handleReverify()}
        />
      ) : (
        <div className="draft-verification-block draft-verification-empty">
          <p className="muted compact">暂无验证反馈</p>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={verifying || !brandId}
            onClick={() => void handleReverify()}
          >
            {verifying ? "验证中…" : "运行引用验证"}
          </button>
        </div>
      )}
      <textarea
        className="draft-editor-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        disabled={saving || deleting}
      />
      <div className="draft-editor-actions">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={saving || deleting || body === draft.body}
          onClick={() => void handleSave()}
        >
          {saving ? "保存中…" : "保存正文"}
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={saving || deleting}
          onClick={() => void handleDelete()}
        >
          {deleting ? "删除中…" : "删除初稿"}
        </button>
      </div>
      {error && <p className="error compact">{error}</p>}
    </div>
  );
}
