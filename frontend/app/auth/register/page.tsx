 "use client";

import { FormEvent, useState } from "react";
import { API_URL } from "@/lib/api";
import { setSuccessFlash } from "@/lib/flash";
import Link from "next/link";
import Script from "next/script";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          login: formData.get("login"),
          email: formData.get("email"),
          password: formData.get("password"),
          password_confirmation: formData.get("password_confirmation"),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.message ?? "Ошибка регистрации");
        return;
      }

      if (payload.token) {
        localStorage.setItem("auth_token", payload.token);
      }
      setSuccessFlash(payload.message ?? "Вы успешно зарегистрировались!");
      window.location.href = "/";
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-block">
      <h2>Создайте аккаунт</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-input">
          <input id="name" name="name" required placeholder=" " />
          <label htmlFor="name">Имя:</label>
        </div>
        <div className="form-input">
          <input id="login" name="login" required placeholder=" " />
          <label htmlFor="login">Логин:</label>
        </div>
        <div className="form-input">
          <input id="email" name="email" type="email" required placeholder=" " />
          <label htmlFor="email">Почта:</label>
        </div>
        <div className="form-input">
          <input id="password" name="password" type="password" required placeholder=" " />
          <label htmlFor="password">Пароль:</label>
        </div>
        <div className="form-input">
          <input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            required
            placeholder=" "
          />
          <label htmlFor="password_confirmation">Повтор пароля:</label>
        </div>
        
        {error ? <p style={{ color: "#d11a2a" }}>{error}</p> : null}
        <div className="form-buttons">
          <button className="btn-submit" type="submit" id="submit-btn" disabled={loading || !policyAccepted}>
            Создать аккаунт
          </button>
          <Link className="btn-switch" href="/auth/login">
            У меня уже есть аккаунт
          </Link>
        </div>
      </form>
      <Script src="/js/auth.js" strategy="afterInteractive" />
    </div>
  );
}
