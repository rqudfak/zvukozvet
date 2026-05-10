"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { setSuccessFlash } from "@/lib/flash";
import Script from "next/script";

const LOGIN_2FA_PENDING_KEY = "login_2fa_pending_token";

type CodeFieldKey = "code";

type FieldErrors = Partial<Record<CodeFieldKey, string>>;

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
    code: firstError(errors, "code"),
  };
}

export default function LoginTwoFactorPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pending = sessionStorage.getItem(LOGIN_2FA_PENDING_KEY);
    if (!pending) {
      router.replace("/auth/login");
      return;
    }
    setReady(true);
  }, [router]);

  function clearFieldError(key: CodeFieldKey) {
    setFieldErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  function clearPendingAndGoLogin() {
    sessionStorage.removeItem(LOGIN_2FA_PENDING_KEY);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setStatus(null);
    const pending = sessionStorage.getItem(LOGIN_2FA_PENDING_KEY);
    if (!pending) {
      router.replace("/auth/login");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/login/2fa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          two_factor_pending_token: pending,
          code: code.replace(/\D/g, "").slice(0, 6),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; errors?: Record<string, string[]>; token?: string }
        | null;

      if (!response.ok) {
        const nextFieldErrors = parseFieldErrors(payload);
        setFieldErrors(nextFieldErrors);
        const hasFieldMessage = Object.values(nextFieldErrors).some(Boolean);
        setError(
          hasFieldMessage ? null : (payload?.message ?? "Не удалось подтвердить вход"),
        );
        return;
      }

      if (payload?.token) {
        localStorage.setItem("auth_token", payload.token);
      }
      sessionStorage.removeItem(LOGIN_2FA_PENDING_KEY);
      setSuccessFlash(payload?.message ?? "Вы успешно вошли в аккаунт!");
      window.location.href = "/";
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setFieldErrors({});
    setStatus(null);
    const pending = sessionStorage.getItem(LOGIN_2FA_PENDING_KEY);
    if (!pending) {
      router.replace("/auth/login");
      return;
    }

    setResendLoading(true);
    try {
      const response = await fetch(`${API_URL}/login/2fa/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ two_factor_pending_token: pending }),
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setError(payload?.message ?? "Не удалось отправить код повторно");
        return;
      }

      setStatus(payload?.message ?? "Новый код отправлен на почту.");
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    } finally {
      setResendLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="auth-page">
        <div className="auth-block">
          <p>Перенаправление…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-block">
        <h2>Подтверждение входа</h2>

        <div className="two-factor-info">
          <p>
            <strong>Код отправлен на почту</strong>
          </p>
          <p>
            Мы отправили 6-значный код на вашу электронную почту. Введите его ниже для завершения
            входа. Код действителен 10 минут.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-input">
            <input
              id="code"
              name="code"
              type="text"
              required
              placeholder=" "
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(digits);
                clearFieldError("code");
                setError(null);
                setStatus(null);
              }}
            />
            <label htmlFor="code">6-значный код:</label>
          </div>
          {fieldErrors.code ? <span className="field-error">{fieldErrors.code}</span> : null}
          {error ? <p className="auth-form-message auth-form-message--error">{error}</p> : null}
          {status ? <p className="auth-form-message auth-form-message--success">{status}</p> : null}

          <div className="form-buttons">
            <button className="btn-submit" type="submit" disabled={loading || code.length !== 6}>
              Подтвердить вход
            </button>
          </div>
        </form>

        <div className="two-factor-footer">
          <button
            type="button"
            className="two-factor-link-btn"
            disabled={resendLoading}
            onClick={() => void handleResend()}
          >
            Отправить код повторно
          </button>
          <span className="two-factor-footer-sep">|</span>
          <Link
            href="/auth/login"
            className="two-factor-back-link"
            onClick={() => clearPendingAndGoLogin()}
          >
            Вернуться ко входу
          </Link>
        </div>

        <Script src="/js/auth.js" strategy="afterInteractive" />
      </div>
    </div>
  );
}
