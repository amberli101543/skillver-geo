import { useState, type FormEvent } from "react";
import { login, setSessionToken } from "./api";

interface LoginPageProps {
  onSuccess: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await login(username.trim(), password);
      setSessionToken(result.token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <h1>GEO Studio</h1>
        <p className="login-subtitle">可见度看板 · 请登录后使用</p>
      </div>
      <form className="login-card card" onSubmit={(e) => void handleSubmit(e)}>
        <h2>登录</h2>
        <label>
          用户名
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn-accent login-submit" disabled={submitting}>
          {submitting ? "登录中…" : "进入看板"}
        </button>
      </form>
    </div>
  );
}
