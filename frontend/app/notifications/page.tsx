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

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    fetch(`${API_URL}/notifications`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Fetch failed");
        }
        return response.json() as Promise<{ data: NotificationItem[] }>;
      })
      .then((payload) => setItems(payload.data ?? []))
      .catch(() => setError("Не удалось загрузить уведомления."));
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

  return (
    <div className="profile-card">
      <h2 className="page-title">Уведомления</h2>
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
