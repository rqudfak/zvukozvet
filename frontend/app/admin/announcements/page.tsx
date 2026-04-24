"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

type Announcement = {
  id: number;
  title: string;
  type: string;
  genre: string;
  status: string;
  user?: { name: string };
};

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  async function loadData() {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const response = await fetch(`${API_URL}/admin/announcements`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { items: { data: Announcement[] }; statuses: string[] };
    setItems(payload.items.data ?? []);
    setStatuses(payload.statuses ?? []);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function updateStatus(id: number, status: string) {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    await fetch(`${API_URL}/admin/announcements/${id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadData();
  }

  async function deleteAnnouncement(id: number) {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    await fetch(`${API_URL}/admin/announcements/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadData();
  }

  return (
    <>
      <div className="admin-header">
        <h2>Объявления</h2>
        <div className="admin-tabs">
          <Link href="/admin" className="admin-tab">
            Главная админки
          </Link>
          <Link href="/admin/genres" className="admin-tab">
            Жанры
          </Link>
          <Link href="/admin/announcements" className="admin-tab admin-tab-active">
            Объявления
          </Link>
          <Link href="/admin/users" className="admin-tab">
            Пользователи
          </Link>
        </div>
      </div>
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Тип</th>
              <th>Жанр</th>
              <th>Статус</th>
              <th>Автор</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={`/announcements/${item.id}`}>{item.title}</Link>
                </td>
                <td>{item.type}</td>
                <td>{item.genre}</td>
                <td>
                  <select value={item.status} onChange={(e) => updateStatus(item.id, e.target.value)}>
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{item.user?.name ?? "—"}</td>
                <td>
                  <button type="button" className="btn-delete" onClick={() => deleteAnnouncement(item.id)}>
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
