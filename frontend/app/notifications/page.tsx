"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

type NotificationItem = {
  id: string;
  read_at?: string | null;
  data?: { message?: string; url?: string };
  created_at: string;
};

type NotificationsPayload = {
  data: NotificationItem[];
  current_page?: number;
  last_page?: number;
  unread_total?: number;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [readingAll, setReadingAll] = useState(false);

  function applyNotificationsPayload(payload: NotificationsPayload) {
    setItems(payload.data ?? []);
    setPage(payload.current_page ?? 1);
    setLastPage(payload.last_page ?? 1);
    setUnreadTotal(typeof payload.unread_total === "number" ? payload.unread_total : 0);
  }

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    const response = await fetch(`${API_URL}/notifications?page=${page}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Fetch failed");
    }
    const payload = (await response.json()) as NotificationsPayload;
    applyNotificationsPayload(payload);
  }, [page, router]);

  useEffect(() => {
    let isCancelled = false;

    async function run() {
      try {
        await loadNotifications();
        if (!isCancelled) {
          setError(null);
        }
      } catch {
        if (!isCancelled) {
          setError("Не удалось загрузить уведомления.");
        }
      }
    }

    void run();
    const interval = setInterval(() => {
      loadNotifications().catch(() => null);
    }, 5000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [loadNotifications]);

  async function openNotification(itemId: string) {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    setOpeningId(itemId);
    try {
      const response = await fetch(`${API_URL}/notifications/${itemId}/go`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("failed");

      const payload = (await response.json()) as { url?: string };
      const targetUrl = payload.url ?? "/notifications";

      let targetPath = targetUrl;
      if (/^https?:\/\//.test(targetUrl)) {
        const parsed = new URL(targetUrl);
        targetPath = `${parsed.pathname}${parsed.search}`;
      }
      router.push(targetPath);
    } finally {
      setOpeningId(null);
    }
  }

  async function markAllRead() {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    setReadingAll(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("failed");
      }
      const listResponse = await fetch(`${API_URL}/notifications?page=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!listResponse.ok) {
        throw new Error("failed");
      }
      const payload = (await listResponse.json()) as NotificationsPayload;
      applyNotificationsPayload(payload);
    } catch {
      setError("Не удалось отметить уведомления как прочитанные.");
    } finally {
      setReadingAll(false);
    }
  }

  function Pagination() {
    if (lastPage <= 1) return null;
    const pages = Array.from({ length: lastPage }, (_, i) => i + 1);
    return (
      <div className="pagination">
        <nav>
          {pages.map((currentPage) =>
            currentPage === page ? (
              <span key={currentPage} aria-current="page">
                {currentPage}
              </span>
            ) : (
              <button key={currentPage} type="button" onClick={() => setPage(currentPage)}>
                {currentPage}
              </button>
            ),
          )}
        </nav>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <h2 className="page-title">Уведомления</h2>
      <div className="admin-table-container">
        <div className="admin-table-toolbar notifications-page-toolbar">
          <Pagination />
          <button
            type="button"
            className="btn-submit"
            onClick={markAllRead}
            disabled={readingAll || unreadTotal === 0}
          >
            Прочитать все
          </button>
        </div>
        {error ? <p>{error}</p> : null}
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "10px 0",
              borderBottom: "1px solid #eee",
              background: item.read_at ? "transparent" : "#fff7e6",
            }}
          >
            <button
              type="button"
              onClick={() => openNotification(item.id)}
              disabled={openingId === item.id}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                fontWeight: item.read_at ? 500 : 700,
              }}
            >
              {item.data?.message ?? "Уведомление"}
            </button>
            <small>{new Date(item.created_at).toLocaleString("ru-RU")}</small>
          </div>
        ))}
        <div className="notifications-pagination-bottom">
          <Pagination />
        </div>
      </div>
    </div>
  );
}
