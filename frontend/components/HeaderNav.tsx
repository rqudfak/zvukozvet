"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { API_URL } from "@/lib/api";
import { setSuccessFlash } from "@/lib/flash";

type NotificationItem = {
  id: string;
  read_at?: string | null;
  created_at: string;
  data?: { message?: string; url?: string };
};

const HEADER_MOBILE_MQ = "(min-width: 961px)";

export default function HeaderNav() {
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notifRef = useRef<HTMLLIElement | null>(null);

  async function loadUserAndNotifications() {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setIsAuthorized(false);
      setIsAdmin(false);
      setNotifications([]);
      return;
    }

    const userResponse = await fetch(`${API_URL}/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!userResponse.ok) {
      throw new Error("Unauthorized");
    }
    const user = (await userResponse.json()) as { role?: string };
    setIsAuthorized(true);
    setIsAdmin(user.role === "admin");

    const notificationsResponse = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (notificationsResponse.ok) {
      const payload = (await notificationsResponse.json()) as { data?: NotificationItem[] };
      setNotifications((payload.data ?? []).slice(0, 8));
    }
  }

  useEffect(() => {
    loadUserAndNotifications().catch(() => {
      localStorage.removeItem("auth_token");
      setIsAuthorized(false);
      setIsAdmin(false);
      setNotifications([]);
    });

    const interval = setInterval(() => {
      loadUserAndNotifications().catch(() => null);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  function handleLogout() {
    setMobileMenuOpen(false);
    localStorage.removeItem("auth_token");
    setIsAuthorized(false);
    setIsAdmin(false);
    setNotifications([]);
    setSuccessFlash("Вы вышли из аккаунта");
    window.location.href = "/";
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 960px)");
    function syncBodyScroll() {
      if (mobileMenuOpen && mq.matches) {
        document.body.classList.add("header-nav-mobile-open");
      } else {
        document.body.classList.remove("header-nav-mobile-open");
      }
    }
    syncBodyScroll();
    mq.addEventListener("change", syncBodyScroll);
    return () => {
      mq.removeEventListener("change", syncBodyScroll);
      document.body.classList.remove("header-nav-mobile-open");
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setIsNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia(HEADER_MOBILE_MQ);
    function onChange() {
      if (mq.matches) {
        setMobileMenuOpen(false);
      }
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    function handleDocumentClick(event: globalThis.MouseEvent) {
      if (!isNotifOpen) return;
      if (!notifRef.current) return;
      const target = event.target as Node;
      if (!notifRef.current.contains(target)) {
        setIsNotifOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsNotifOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isNotifOpen]);

  async function openNotification(notificationId: string) {
    setMobileMenuOpen(false);
    const token = localStorage.getItem("auth_token");
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    setOpeningId(notificationId);
    try {
      const response = await fetch(`${API_URL}/notifications/${notificationId}/go`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        window.location.href = "/notifications";
        return;
      }
      const payload = (await response.json()) as { url?: string };
      const targetUrl = payload.url ?? "/notifications";
      if (/^https?:\/\//.test(targetUrl)) {
        const parsed = new URL(targetUrl);
        window.location.href = `${parsed.pathname}${parsed.search}`;
        return;
      }
      window.location.href = targetUrl;
    } finally {
      setOpeningId(null);
    }
  }

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  function closeMobileMenuFromNav(event: ReactMouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(".notif-btn")) {
      return;
    }
    if (target.closest("a[href]") || target.closest("button.btn-auth")) {
      setMobileMenuOpen(false);
    }
  }

  return (
    <nav className={`header-nav${mobileMenuOpen ? " header-nav--menu-open" : ""}`}>
      <div className="center header-nav-inner">
        <h1 className="header-nav-logo">
          <Link href="/">ЗвукоЦвет</Link>
        </h1>
        <button
          type="button"
          className="header-burger"
          aria-expanded={mobileMenuOpen}
          aria-controls="header-nav-drawer"
          aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span className="header-burger-bar" aria-hidden />
          <span className="header-burger-bar" aria-hidden />
          <span className="header-burger-bar" aria-hidden />
        </button>
        <div
          id="header-nav-drawer"
          className="header-nav-menus"
          onClick={closeMobileMenuFromNav}
        >
          <ul className="header-nav-list">
            <li>
              <Link href="/">Главная</Link>
            </li>
            {isAuthorized ? (
              <li>
                <Link href="/profile">Профиль</Link>
              </li>
            ) : null}
            <li>
              <Link href="/about">О нас</Link>
            </li>
            <li>
              <Link href="/contacts">Контакты</Link>
            </li>
          </ul>
          <ul className="header-nav-auth">
            {isAuthorized ? (
              <>
                {isAdmin ? (
                  <li>
                    <Link href="/admin">Админ-панель</Link>
                  </li>
                ) : null}
                <li className="notif" ref={notifRef}>
                  <button
                    type="button"
                    className="notif-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsNotifOpen((prev) => !prev);
                    }}
                  >
                    Уведомления
                    {unreadCount > 0 ? <span className="notif-badge">{unreadCount}</span> : null}
                  </button>
                  <div className={`notif-dropdown ${isNotifOpen ? "open" : ""}`} aria-hidden={!isNotifOpen}>
                    <div className="notif-header">
                      <span className="notif-title">Уведомления</span>
                      <Link className="notif-link" href="/notifications">
                        Все
                      </Link>
                    </div>
                    <div className="notif-list">
                      {notifications.length ? (
                        notifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`notif-item notif-item-btn ${item.read_at ? "" : "unread"}`}
                            disabled={openingId === item.id}
                            onClick={() => openNotification(item.id)}
                          >
                            <span className="notif-item-text">{item.data?.message ?? "Уведомление"}</span>
                            <span className="notif-item-date">
                              {new Date(item.created_at).toLocaleString("ru-RU", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="notif-empty">Уведомлений пока нет.</div>
                      )}
                    </div>
                  </div>
                </li>
                <li>
                  <button type="button" className="btn-auth" onClick={handleLogout}>
                    Выйти
                  </button>
                </li>
              </>
            ) : null}
            {!isAuthorized ? (
              <>
                <li>
                  <Link href="/auth/register">Регистрация</Link>
                </li>
                <li>
                  <Link href="/auth/login">Вход</Link>
                </li>
              </>
            ) : null}
          </ul>
        </div>
      </div>
    </nav>
  );
}
