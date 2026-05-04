"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { API_URL } from "@/lib/api";
import { setSuccessFlash } from "@/lib/flash";

type ResetFieldKey = "email" | "password" | "password_confirmation";

type FieldErrors = Partial<Record<ResetFieldKey, string>>;

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
    password: firstError(errors, "password"),
    password_confirmation: firstError(errors, "password_confirmation"),
  };
}

function ResetPasswordForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawToken = params.token;
  const token = typeof rawToken === "string" ? rawToken : Array.isArray(rawToken) ? (rawToken[0] ?? "") : "";

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  useEffect(() => {
    const fromQuery = searchParams.get("email");
    if (fromQuery) {
      setEmail(fromQuery);
    }
  }, [searchParams]);

  function clearFieldError(key: ResetFieldKey) {
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
    setLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          token: formData.get("token"),
          email: formData.get("email"),
          password: formData.get("password"),
          password_confirmation: formData.get("password_confirmation"),
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
          hasFieldMessage ? null : (payload?.message ?? "Не удалось сменить пароль"),
        );
        return;
      }

      setSuccessFlash(payload?.message ?? "Пароль успешно изменён.");
      window.location.href = "/auth/login";
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-block">
      <h2>Сброс пароля</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input type="hidden" name="token" value={token} readOnly />
        <div className="form-input">
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder=" "
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError("email");
              setError(null);
            }}
          />
          <label htmlFor="email">Почта:</label>
        </div>
        {fieldErrors.email ? <span className="field-error">{fieldErrors.email}</span> : null}

        <div className="form-input">
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder=" "
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError("password");
              setError(null);
            }}
          />
          <label htmlFor="password">Новый пароль:</label>
        </div>
        {fieldErrors.password ? <span className="field-error">{fieldErrors.password}</span> : null}

        <div className="form-input">
          <input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            required
            placeholder=" "
            value={passwordConfirmation}
            onChange={(event) => {
              setPasswordConfirmation(event.target.value);
              clearFieldError("password_confirmation");
              setError(null);
            }}
          />
          <label htmlFor="password_confirmation">Повтор пароля:</label>
        </div>
        {fieldErrors.password_confirmation ? (
          <span className="field-error">{fieldErrors.password_confirmation}</span>
        ) : null}

        {error ? <p style={{ color: "#d11a2a" }}>{error}</p> : null}
        <div className="form-buttons">
          <button className="btn-submit" type="submit" disabled={loading || !token}>
            Сохранить пароль
          </button>
          <Link className="btn-switch" href="/auth/login">
            Войти по логину
          </Link>
        </div>
      </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <div className="auth-block">
            <p>Загрузка…</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
