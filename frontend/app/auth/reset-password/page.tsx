"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!token || !email) {
      setError("Неверная ссылка для восстановления пароля");
      setLoading(false);
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Пароли не совпадают");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password, password_confirmation: passwordConfirmation }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Не удалось сбросить пароль");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/auth/login"), 3000);
      }
    } catch {
      setError("Ошибка сервера. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="auth-page">
        <div className="auth-block">
          <h2>Неверная ссылка</h2>
          <p>Ссылка для восстановления пароля недействительна.</p>
          <Link href="/auth/forgot-password" className="btn-submit">Запросить новую</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-block">
          <h2>Пароль изменён!</h2>
          <p>Теперь вы можете войти в аккаунт с новым паролем.</p>
          <Link href="/auth/login" className="btn-submit">Войти</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-block">
        <h2>Сброс пароля</h2>
        <p>Введите новый пароль для <strong>{email}</strong></p>
        <form onSubmit={handleSubmit}>
          <div className="form-input">
            <input
              type="password"
              placeholder="Новый пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-input">
            <input
              type="password"
              placeholder="Подтверждение пароля"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
            />
          </div>
          {error && <p style={{ color: "#d11a2a" }}>{error}</p>}
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Сохранение..." : "Сохранить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}