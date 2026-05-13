"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

type FieldKey = "password";
type FieldErrors = Partial<Record<FieldKey, string>>;

/** Подстраховка, если в ответе API останутся стандартные английские фразы Laravel */
function localizeValidationMessage(message: string): string {
  const map: Record<string, string> = {
    "The password field is required.": "Введите текущий пароль.",
    "The password must be a string.": "Пароль указан в неверном формате.",
  };
  return map[message] ?? message;
}

function firstError(errors: unknown, key: string): string | undefined {
  if (!errors || typeof errors !== "object") return undefined;
  const list = (errors as Record<string, string[]>)[key];
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const raw = list[0];
  if (typeof raw !== "string") return undefined;
  return localizeValidationMessage(raw);
}

function parseFieldErrors(payload: unknown): FieldErrors {
  if (!payload || typeof payload !== "object") return {};
  const errors = (payload as { errors?: unknown }).errors;
  return {
    password: firstError(errors, "password"),
  };
}

export default function AccountSecurityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;

  const [ready, setReady] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/user`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!response.ok) {
        router.replace("/auth/login");
        return;
      }
      const me = (await response.json()) as { id: number; two_factor_enabled?: boolean };
      if (String(me.id) !== String(userId)) {
        router.replace(`/users/${me.id}/security`);
        return;
      }
      setTwoFactorEnabled(Boolean(me.two_factor_enabled));
      setReady(true);
    } catch {
      router.replace("/auth/login");
    }
  }, [router, userId]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  async function submitTwoFactor(enabled: boolean) {
    setError(null);
    setStatus(null);
    setFieldErrors({});

    const trimmed = password.trim();
    if (!trimmed) {
      setFieldErrors({ password: "Введите текущий пароль." });
      return;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}${enabled ? "/2fa/enable" : "/2fa/disable"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ password: trimmed }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        errors?: Record<string, string[]>;
      } | null;

      if (!response.ok) {
        const nextField = parseFieldErrors(payload);
        setFieldErrors(nextField);
        const generic =
          typeof payload?.message === "string" ? localizeValidationMessage(payload.message) : null;
        const hasField = Boolean(nextField.password);
        setError(hasField ? null : generic ?? "Не удалось изменить настройки.");
        return;
      }

      setTwoFactorEnabled(enabled);
      setPassword("");
      setStatus(
        typeof payload?.message === "string"
          ? payload.message
          : enabled
            ? "Двухфакторная аутентификация включена."
            : "Двухфакторная аутентификация отключена.",
      );
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="auth-page">
        <div className="auth-block">
          <p>Загрузка…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-block">
        <h2>Безопасность аккаунта</h2>
        <div
          className={
            twoFactorEnabled ? "two-factor-status two-factor-status--on" : "two-factor-status two-factor-status--off"
          }
          role="status"
        >
          {twoFactorEnabled ? (
            <p>
              Двухфакторная аутентификация <strong>включена</strong>: при входе на почту приходит код подтверждения.
            </p>
          ) : (
            <p>
              Двухфакторная аутентификация <strong>выключена</strong>. Включите её, чтобы при входе запрашивался код с
              почты.
            </p>
          )}
        </div>

        <div className="auth-form">
          <div className="form-input">
            <input
              id="security-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder=" "
              value={password}
              className={password ? "has-value" : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldErrors({});
                setError(null);
              }}
            />
            <label htmlFor="security-password">Текущий пароль</label>
          </div>
          {fieldErrors.password ? <span className="field-error">{fieldErrors.password}</span> : null}
          {error ? <p className="auth-form-message auth-form-message--error">{error}</p> : null}
          {status ? <p className="auth-form-message auth-form-message--success">{status}</p> : null}

          <div className="form-buttons">
            {twoFactorEnabled ? (
              <button
                type="button"
                className="btn-submit"
                disabled={submitting}
                onClick={() => void submitTwoFactor(false)}
              >
                Отключить 2FA
              </button>
            ) : (
              <button
                type="button"
                className="btn-submit"
                disabled={submitting}
                onClick={() => void submitTwoFactor(true)}
              >
                Включить 2FA
              </button>
            )}
            <Link className="btn-switch" href={`/users/${userId}`}>
              Вернуться в профиль
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
