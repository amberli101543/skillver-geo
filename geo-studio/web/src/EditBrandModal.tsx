import { useEffect, useState } from "react";
import { updateBrand, type Brand } from "./api";

interface EditBrandModalProps {
  open: boolean;
  brand: Brand | null;
  onClose: () => void;
  onUpdated: (brand: Brand) => void;
}

export function EditBrandModal({ open, brand, onClose, onUpdated }: EditBrandModalProps) {
  const [name, setName] = useState("");
  const [definition, setDefinition] = useState("");
  const [positioning, setPositioning] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (brand) {
      setName(brand.name);
      setDefinition(brand.definition);
      setPositioning(brand.positioning ?? "");
    }
  }, [brand]);

  if (!open || !brand) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !definition.trim()) {
      setFormError("品牌名称和定义不能为空");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const updated = await updateBrand(brand.id, {
        name: name.trim(),
        definition: definition.trim(),
        positioning: positioning.trim() || undefined,
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "保存失败");
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
        aria-labelledby="edit-brand-title"
      >
        <h2 id="edit-brand-title">编辑品牌</h2>
        <p className="muted section-desc">修正品牌名称与定义（例如乱码的「???? SaaS」）。</p>
        <form onSubmit={(e) => void handleSubmit(e)} className="modal-form">
          <label>
            品牌名称 *
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            品牌定义 *
            <textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="例如：面向中小企业的项目管理 SaaS"
              rows={3}
              required
            />
          </label>
          <label>
            业务定位（可选）
            <input value={positioning} onChange={(e) => setPositioning(e.target.value)} />
          </label>
          {formError && <p className="error">{formError}</p>}
          <div className="btn-row">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              取消
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
