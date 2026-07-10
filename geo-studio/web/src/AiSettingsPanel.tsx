import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  fetchAiPrompts,
  fetchAiSettings,
  updateAiSettings,
  type AiSettingsView,
  type ModelProfile,
  type PromptCatalogView,
  type PromptVersionSelection,
} from "./api";

type LlmProviderId = "openai" | "anthropic";
type PromptKind = keyof PromptVersionSelection;

const PROMPT_LABELS: Record<PromptKind, string> = {
  engine: "引擎诊断",
  scoring: "评分",
  content: "内容生成",
};

interface EditableModel extends ModelProfile {
  provider: LlmProviderId;
  apiKeyInput: string;
  hasApiKey: boolean;
}

export function AiSettingsPanel() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPrompts, setSavingPrompts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<AiSettingsView["availableProviders"]>([]);

  const [models, setModels] = useState<EditableModel[]>([]);
  const [activeModel, setActiveModel] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newProvider, setNewProvider] = useState<LlmProviderId>("openai");
  const [newApiKey, setNewApiKey] = useState("");

  const [promptVersions, setPromptVersions] = useState<PromptVersionSelection>({
    engine: "v1",
    scoring: "v1",
    content: "v1",
  });
  const [availablePromptVersions, setAvailablePromptVersions] = useState<
    AiSettingsView["availablePromptVersions"]
  >({
    engine: ["v1"],
    scoring: ["v1"],
    content: ["v1"],
  });
  const [promptCatalog, setPromptCatalog] = useState<PromptCatalogView | null>(null);

  const syncForm = useCallback((view: AiSettingsView) => {
    const rows: EditableModel[] = view.modelCatalog.map((item) => ({
      id: item.id,
      label: item.label,
      model: item.model,
      provider: item.provider ?? "openai",
      hasApiKey: item.hasApiKey ?? false,
      apiKeyInput: "",
    }));
    setModels(rows);
    setActiveModel(view.openAiModel ?? rows[0]?.model ?? "");
    setAvailableProviders(view.availableProviders);
    setPromptVersions(view.promptVersions);
    setAvailablePromptVersions(view.availablePromptVersions);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settings, prompts] = await Promise.all([fetchAiSettings(), fetchAiPrompts()]);
      syncForm(settings);
      setPromptCatalog(prompts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载 AI 设置失败");
    } finally {
      setLoading(false);
    }
  }, [syncForm]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleAddModel() {
    const model = newModel.trim();
    const apiKey = newApiKey.trim();
    if (!model) {
      setError("请填写模型 ID");
      return;
    }
    if (!apiKey) {
      setError("请填写 API Key");
      return;
    }
    if (models.some((item) => item.model === model)) {
      setError("该模型已存在");
      return;
    }
    const label = newLabel.trim() || model;
    setModels((prev) => [
      ...prev,
      {
        id: `model_${Date.now()}`,
        label,
        model,
        provider: newProvider,
        hasApiKey: true,
        apiKeyInput: apiKey,
      },
    ]);
    setActiveModel(model);
    setNewLabel("");
    setNewModel("");
    setNewProvider("openai");
    setNewApiKey("");
    setError(null);
  }

  function handleRemoveModel(model: string) {
    const next = models.filter((item) => item.model !== model);
    setModels(next);
    if (activeModel === model) {
      setActiveModel(next[0]?.model ?? "");
    }
  }

  async function handleSavePrompts() {
    setSavingPrompts(true);
    setError(null);
    setInfo(null);
    try {
      syncForm(
        await updateAiSettings({
          promptVersions,
        }),
      );
      setInfo("Prompt 版本已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存 Prompt 失败");
    } finally {
      setSavingPrompts(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (models.length === 0) {
      setError("请至少添加一个模型");
      return;
    }
    if (!activeModel) {
      setError("请点击选择一个当前使用的模型");
      return;
    }
    const active = models.find((item) => item.model === activeModel);
    if (!active?.hasApiKey && !active?.apiKeyInput.trim()) {
      setError("当前模型需配置 API Key");
      return;
    }
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      syncForm(
        await updateAiSettings({
          engineMode: "live",
          scoringMode: "llm",
          contentMode: "live",
          openAiModel: activeModel,
          promptVersions,
          modelCatalog: models.map((item) => ({
            id: item.id,
            label: item.label,
            model: item.model,
            provider: item.provider,
            ...(item.apiKeyInput.trim() ? { apiKey: item.apiKeyInput.trim() } : {}),
          })),
        }),
      );
      setInfo("AI 设置已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function providerLabel(id: LlmProviderId): string {
    return availableProviders.find((item) => item.id === id)?.label ?? id;
  }

  function promptPreview(kind: PromptKind): string {
    const version = promptVersions[kind];
    return promptCatalog?.previews[kind][version] ?? "";
  }

  return (
    <section id="section-ai" className="card">
      <div className="section-header">
        <h2 className="section-title">AI 设置</h2>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void load()} disabled={loading}>
          {loading ? "刷新中…" : "刷新"}
        </button>
      </div>
      <p className="muted section-desc">
        配置 LLM 模型与 Prompt 版本。Prompt 切换后立即作用于引擎诊断、评分与内容生成三条流水线。
      </p>

      {error && <p className="error compact">{error}</p>}
      {info && <p className="info compact">{info}</p>}

      <div className="prompt-versions-block">
        <h3>Prompt 版本</h3>
        <p className="muted compact">
          当前运行时：引擎 {promptVersions.engine} · 评分 {promptVersions.scoring} · 内容{" "}
          {promptVersions.content}
        </p>
        <div className="prompt-version-grid">
          {(Object.keys(PROMPT_LABELS) as PromptKind[]).map((kind) => (
            <label key={kind} className="prompt-version-field">
              <span>{PROMPT_LABELS[kind]}</span>
              <select
                value={promptVersions[kind]}
                onChange={(e) =>
                  setPromptVersions((prev) => ({
                    ...prev,
                    [kind]: e.target.value,
                  }))
                }
              >
                {availablePromptVersions[kind].map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
              {promptPreview(kind) && (
                <span className="muted compact prompt-preview">{promptPreview(kind)}</span>
              )}
            </label>
          ))}
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={savingPrompts || loading}
            onClick={() => void handleSavePrompts()}
          >
            {savingPrompts ? "保存中…" : "保存 Prompt 版本"}
          </button>
        </div>
      </div>

      <form className="ai-settings-form" onSubmit={(e) => void handleSave(e)}>
        <div className="model-catalog-block">
          <h3>模型列表</h3>
          <p className="muted compact">点击条目设为当前模型；所有模型均需自行添加并配置 Key。</p>
          {models.length === 0 ? (
            <p className="muted compact">暂无模型，请在下方添加。</p>
          ) : (
            <ul className="model-catalog-list">
              {models.map((item) => (
                <li
                  key={item.model}
                  className={activeModel === item.model ? "is-active" : undefined}
                >
                  <button
                    type="button"
                    className="model-select-btn"
                    onClick={() => setActiveModel(item.model)}
                  >
                    <strong>{item.label}</strong>
                    <span className="muted"> · {item.model}</span>
                    <span className="muted model-key-tag">{providerLabel(item.provider)}</span>
                    {activeModel === item.model && <span className="model-active-tag">当前</span>}
                    {(item.hasApiKey || item.apiKeyInput) && (
                      <span className="muted model-key-tag">Key 已配置</span>
                    )}
                  </button>
                  <label className="model-key-field">
                    <span className="sr-only">更新 API Key</span>
                    <input
                      type="password"
                      value={item.apiKeyInput}
                      onChange={(e) =>
                        setModels((prev) =>
                          prev.map((row) =>
                            row.model === item.model ? { ...row, apiKeyInput: e.target.value } : row,
                          ),
                        )
                      }
                      placeholder={item.hasApiKey ? "留空保持原 Key" : "API Key"}
                      autoComplete="off"
                    />
                  </label>
                  <button type="button" className="btn-link btn-sm" onClick={() => handleRemoveModel(item.model)}>
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h4 className="model-add-title">添加模型</h4>
          <div className="model-add-row">
            <select value={newProvider} onChange={(e) => setNewProvider(e.target.value as LlmProviderId)}>
              {availableProviders.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="显示名称" />
            <input
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              placeholder={
                newProvider === "anthropic" ? "模型 ID，如 claude-3-5-haiku-latest" : "模型 ID，如 gpt-4o"
              }
            />
            <input
              type="password"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              placeholder="API Key"
              autoComplete="off"
            />
            <button type="button" className="btn-secondary btn-sm" onClick={handleAddModel}>
              添加
            </button>
          </div>
        </div>

        <div className="btn-row">
          <button type="submit" className="btn-accent" disabled={saving || loading}>
            {saving ? "保存中…" : "保存设置"}
          </button>
        </div>
      </form>
    </section>
  );
}
