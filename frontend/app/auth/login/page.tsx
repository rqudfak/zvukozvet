 "use client";

import { FormEvent, useState } from "react";
import { API_URL } from "@/lib/api";
import { setSuccessFlash } from "@/lib/flash";
import Link from "next/link";
import Script from "next/script";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: formData.get("login"),
          password: formData.get("password"),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        token?: string;
        two_factor_required?: boolean;
        two_factor_pending_token?: string;
      } | null;

      if (!response.ok) {
        setError(payload?.message ?? "Ошибка входа");
        return;
      }

      if (payload?.two_factor_required && payload.two_factor_pending_token) {
        sessionStorage.setItem("login_2fa_pending_token", payload.two_factor_pending_token);
        window.location.href = "/auth/2fa";
        return;
      }

      if (payload?.token) {
        localStorage.setItem("auth_token", payload.token);
      }
      setSuccessFlash(payload?.message ?? "Вы успешно вошли в аккаунт!");
      window.location.href = "/";
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-block">
      <h2>Войдите в аккаунт</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {error ? <span className="field-error">{error}</span> : null}
        <div className="form-input">
          <input id="login" name="login" required placeholder=" " />
          <label htmlFor="login">Логин:</label>
        </div>
        <div className="form-input">
          <input id="password" name="password" type="password" required placeholder=" " />
          <label htmlFor="password">Пароль:</label>
        </div>
        <div className="form-input form-input--forgot-wrap">
          <Link href="/auth/forgot-password" className="forgot-password-link">
            Забыли пароль?
          </Link>
        </div>
        <div className="form-buttons">
          <button className="btn-submit" type="submit" id="submit-btn" disabled={loading}>
            Войти в аккаунт
          </button>
          <Link className="btn-switch" href="/auth/register">
            Создать аккаунт
          </Link>
        </div>
      </form>
      <Script src="/js/auth.js" strategy="afterInteractive" />
      </div>
    </div>
  );
}
