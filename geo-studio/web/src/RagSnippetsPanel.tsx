interface RagSnippetsPanelProps {
  snippets: string[];
  title?: string;
}

export function RagSnippetsPanel({ snippets, title = "RAG 引用知识" }: RagSnippetsPanelProps) {
  if (snippets.length === 0) {
    return null;
  }

  return (
    <div className="rag-snippets">
      <h4 className="rag-snippets-title">{title}</h4>
      <p className="muted compact rag-snippets-desc">以下内容片段已注入 AI 上下文（不含向量细节）</p>
      <ul className="rag-snippets-list">
        {snippets.map((snippet, index) => (
          <li key={`${index}-${snippet.slice(0, 24)}`}>{snippet}</li>
        ))}
      </ul>
    </div>
  );
}
