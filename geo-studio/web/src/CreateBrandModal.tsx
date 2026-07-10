import { useState } from "react";
import { createBrand, type CreateBrandInput } from "./api";

interface CreateBrandModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (brandId: string) => void;
}

export function CreateBrandModal({ open, onClose, onCreated }: CreateBrandModalProps) {
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState("");
  const [positioning, setPositioning] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !definition.trim()) {
      setFormError("品牌名称和定义不能为空");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const input: CreateBrandInput = {
      name: name.trim(),
      definition: definition.trim(),
      ...(positioning.trim() ? { positioning: positioning.trim() } : {}),
    };
    try {
      const brand = await createBrand(input);
      setName("");
      setDefinition("");
      setPositioning("");
      onCreated(brand.id);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="create-brand-title"
      >
        <h2 id="create-brand-title">创建品牌</h2>
        <form onSubmit={(e) => void handleSubmit(e)} className="modal-form">
          <label>
            品牌名称 *
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme" required />
          </label>
          <label>
            品牌定义 *
            <textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="一句话描述品牌定位"
              rows={3}
              required
            />
          </label>
          <label>
            业务定位（可选）
            <input
              value={positioning}
              onChange={(e) => setPositioning(e.target.value)}
              placeholder="面向中小企业的项目管理 SaaS"
            />
          </label>
          {formError && <p className="error">{formError}</p>}
          <div className="btn-row">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              取消
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "创建中…" : "创建"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
