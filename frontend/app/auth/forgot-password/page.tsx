"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { API_URL } from "@/lib/api";

const FORGOT_PASSWORD_COOLDOWN_MS = 10 * 60 * 1000;

function forgotPasswordStorageKey(email: string): string {
  return `forgot_password_last_sent:${email.trim().toLowerCase()}`;
}

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

    const form = event.currentTarget;
    const formData = new FormData(form);
    const emailRaw = String(formData.get("email") ?? "").trim();
    if (emailRaw) {
      const lastSent = Number(localStorage.getItem(forgotPasswordStorageKey(emailRaw)));
      if (lastSent > 0) {
        const elapsed = Date.now() - lastSent;
        if (elapsed < FORGOT_PASSWORD_COOLDOWN_MS) {
          setError(
            "Повторная отправка ссылки возможна не чаще одного раза в 10 минут. Попробуйте позже.",
          );
          return;
        }
      }
    }

    setLoading(true);

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
      if (emailRaw) {
        localStorage.setItem(forgotPasswordStorageKey(emailRaw), String(Date.now()));
      }
      form.reset();
      setEmail("");
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
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
        {error ? <p className="forgot-password-error">{error}</p> : null}
        {status ? <p className="auth-form-message auth-form-message--success">{status}</p> : null}
        <div className="form-buttons">
          <button className="btn-submit" type="submit" disabled={loading}>
            Отправить ссылку
          </button>
          <Link className="btn-switch-auth" href="/auth/login">
            Вернуться назад
          </Link>
        </div>
      </form>
      </div>
    </div>
  );
}
