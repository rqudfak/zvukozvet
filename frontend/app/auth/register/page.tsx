"use client";

import { FormEvent, useState } from "react";
import { API_URL } from "@/lib/api";
import { setSuccessFlash } from "@/lib/flash";
import Link from "next/link";
import Script from "next/script";

type RegisterFieldKey = "name" | "login" | "email" | "password" | "password_confirmation";

type FieldErrors = Partial<Record<RegisterFieldKey, string>>;

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
    name: firstError(errors, "name"),
    login: firstError(errors, "login"),
    email: firstError(errors, "email"),
    password: firstError(errors, "password"),
    password_confirmation: firstError(errors, "password_confirmation"),
  };
}

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  function clearFieldError(key: RegisterFieldKey) {
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
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          login: formData.get("login"),
          email: formData.get("email"),
          password: formData.get("password"),
          password_confirmation: formData.get("password_confirmation"),
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
          hasFieldMessage
            ? null
            : (payload?.message ?? "Ошибка регистрации"),
        );
        return;
      }

      if (payload?.token) {
        localStorage.setItem("auth_token", payload.token);
      }
      setSuccessFlash(payload?.message ?? "Вы успешно зарегистрировались!");
      window.location.href = "/";
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  const isFormFilled =
    name.trim() !== "" &&
    login.trim() !== "" &&
    email.trim() !== "" &&
    password.trim() !== "" &&
    passwordConfirmation.trim() !== "";

  return (
    <div className="auth-page">
      <div className="auth-block">
      <h2>Создайте аккаунт</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-input">
          <input
            id="name"
            name="name"
            required
            placeholder=" "
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearFieldError("name");
              setError(null);
            }}
          />
          <label htmlFor="name">Имя:</label>
        </div>
        {fieldErrors.name ? <span className="field-error">{fieldErrors.name}</span> : null}

        <div className="form-input">
          <input
            id="login"
            name="login"
            required
            placeholder=" "
            value={login}
            onChange={(event) => {
              setLogin(event.target.value);
              clearFieldError("login");
              setError(null);
            }}
          />
          <label htmlFor="login">Логин:</label>
        </div>
        {fieldErrors.login ? <span className="field-error">{fieldErrors.login}</span> : null}

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
          <label htmlFor="password">Пароль:</label>
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

        {error ? <p className="auth-form-message auth-form-message--error">{error}</p> : null}
        <div className="form-buttons">
          <button className="btn-submit" type="submit" id="submit-btn" disabled={loading || !isFormFilled}>
            Создать аккаунт
          </button>
          <Link className="btn-switch" href="/auth/login">
            У меня уже есть аккаунт
          </Link>
        </div>
      </form>
      <Script src="/js/auth.js" strategy="afterInteractive" />
      </div>
    </div>
  );
}
