 "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

type NotificationItem = {
  id: string;
  read_at?: string | null;
  data?: { message?: string; url?: string };
  created_at: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [readingAll, setReadingAll] = useState(false);

  async function loadNotifications() {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    const response = await fetch(`${API_URL}/notifications`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Fetch failed");
    }
    const payload = (await response.json()) as { data: NotificationItem[] };
    setItems(payload.data ?? []);
  }

  useEffect(() => {
    let isCancelled = false;

    async function initialLoad() {
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

    initialLoad();
    const interval = setInterval(() => {
      loadNotifications().catch(() => null);
    }, 5000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [router]);

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

      // Convert backend absolute URL to frontend route.
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
      await loadNotifications();
    } catch {
      setError("Не удалось отметить уведомления как прочитанные.");
    } finally {
      setReadingAll(false);
    }
  }

  const unreadCount = items.filter((item) => !item.read_at).length;

  return (
    <div className="profile-card">
      <h2 className="page-title">Уведомления</h2>
      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn-submit"
          onClick={markAllRead}
          disabled={readingAll || unreadCount === 0}
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
    </div>
  );
}
