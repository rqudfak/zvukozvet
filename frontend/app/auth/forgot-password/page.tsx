"use client";

import { FormEvent, useState } from "react";
import { API_URL } from "@/lib/api";

type ForgotFieldKey = "email";

type FieldErrors = Partial<Record<ForgotFieldKey, string>>;

function firstError(errors: unknown, key: string): string | undefined {
  if (!errors || typeof errors !== "object") return undefined;
  const list = (errors as Record<string, string[]>)[key];
  if (!Array.isArray(list) || list.length === 0) return undefined;
  return list[0];
}

function parseFieldErrors(payload: unknown): FieldErrors {
  if (!payload || typeof payload !== "object") return {};
  const errors = (payload as { errors?: unknown }).errors;
  return {
    email: firstError(errors, "email"),
  };
}

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  function clearFieldError(key: ForgotFieldKey) {
    setFieldErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setStatus(null);
    setLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; errors?: Record<string, string[]> }
        | null;

      if (!response.ok) {
        const nextFieldErrors = parseFieldErrors(payload);
        setFieldErrors(nextFieldErrors);
        const hasFieldMessage = Object.values(nextFieldErrors).some(Boolean);
        setError(
          hasFieldMessage ? null : (payload?.message ?? "Не удалось отправить ссылку"),
        );
        return;
      }

      setStatus(payload?.message ?? "Ссылка отправлена.");
      form.reset();
      setEmail("");
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-block">
      <h2>Восстановление пароля</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError("email");
              setError(null);
            }}
          />
        </div>
        {fieldErrors.email ? <span className="field-error">{fieldErrors.email}</span> : null}
        {error ? <p style={{ color: "#d11a2a" }}>{error}</p> : null}
        {status ? <p style={{ color: "#1b7d33", maxWidth: "320px" }}>{status}</p> : null}
        <button className="btn-submit" type="submit" disabled={loading}>
          Отправить ссылку
        </button>
      </form>
    </div>
  );
}
