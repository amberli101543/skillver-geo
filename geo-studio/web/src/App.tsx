import { useCallback, useEffect, useState } from "react";
import { clearSessionToken, fetchAuthMe, getSessionToken } from "./api";
import { Dashboard } from "./Dashboard";
import { LoginPage } from "./LoginPage";

export function App() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  const verifySession = useCallback(async () => {
    if (!getSessionToken()) {
      setAuthed(false);
      setChecking(false);
      return;
    }
    try {
      await fetchAuthMe();
      setAuthed(true);
    } catch {
      clearSessionToken();
      setAuthed(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void verifySession();
  }, [verifySession]);

  function handleLogout() {
    clearSessionToken();
    setAuthed(false);
  }

  if (checking) {
    return (
      <div className="login-page">
        <p className="muted">正在验证登录状态…</p>
      </div>
    );
  }

  if (!authed) {
    return <LoginPage onSuccess={() => setAuthed(true)} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}
