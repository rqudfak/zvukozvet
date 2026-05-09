"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function SiteFooter() {
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useLayoutEffect(() => {
    setIsAuthorized(Boolean(localStorage.getItem("auth_token")));
  }, [pathname]);

  return (
    <footer className="site-footer">
      <div className="center site-footer-inner">
        <div className={`site-footer-grid${isAuthorized ? " site-footer-grid--auth" : ""}`}>
          <div className="site-footer-brand">
            <Link href="/" className="site-footer-logo">
              ЗвукоЦвет
            </Link>
            <p className="site-footer-tagline">
              Озвучка книг и видеоигр, поиск голоса под разные роли.
            </p>
          </div>

          <div className="site-footer-col">
            <h2 className="site-footer-heading">Навигация</h2>
            <ul className="site-footer-links">
              <li>
                <Link href="/">Главная</Link>
              </li>
              {isAuthorized ? (
                <>
                  <li>
                    <Link href="/profile">Профиль</Link>
                  </li>
                  <li>
                    <Link href="/notifications">Уведомления</Link>
                  </li>
                </>
              ) : null}
            </ul>
          </div>

          {isAuthorized ? null : (
            <div className="site-footer-col">
              <h2 className="site-footer-heading">Аккаунт</h2>
              <ul className="site-footer-links">
                <li>
                  <Link href="/auth/login">Вход</Link>
                </li>
                <li>
                  <Link href="/auth/register">Регистрация</Link>
                </li>
                <li>
                  <Link href="/auth/forgot-password">Забыли пароль?</Link>
                </li>
              </ul>
            </div>
          )}

          <div className="site-footer-col">
            <h2 className="site-footer-heading">Информация</h2>
            <ul className="site-footer-links">
              <li>
                <Link href="/about">О нас</Link>
              </li>
              <li>
                <Link href="/contacts">Контакты</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="site-footer-bottom">
          <p className="site-footer-copy">© {new Date().getFullYear()} ЗвукоЦвет. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}
