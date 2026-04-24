 "use client";

import { FormEvent, useState } from "react";
import { API_URL } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.message ?? "Не удалось отправить ссылку");
        return;
      }

      setStatus(payload.message ?? "Ссылка отправлена.");
      form.reset();
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    }
  }

  return (
    <div className="auth-block">
      <h2>Восстановление пароля</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required />
        </div>
        {error ? <p style={{ color: "#d11a2a" }}>{error}</p> : null}
        {status ? <p style={{ color: "#1b7d33" }}>{status}</p> : null}
        <button className="btn-submit" type="submit">
          Отправить ссылку
        </button>
      </form>
    </div>
  );
}
