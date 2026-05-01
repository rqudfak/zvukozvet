 "use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

type UserRow = {
  id: number;
  login: string;
  name: string;
  email: string;
  announcements_count: number;
  role?: string;
  banned_until?: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [banUserId, setBanUserId] = useState<number | null>(null);
  const [durationDays, setDurationDays] = useState("1");
  const [banReason, setBanReason] = useState("");

  async function loadData() {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const response = await fetch(`${API_URL}/admin/users?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { data: UserRow[]; current_page?: number; last_page?: number };
    setUsers(payload.data ?? []);
    setPage(payload.current_page ?? 1);
    setLastPage(payload.last_page ?? 1);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [page]);

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

  async function submitBan() {
    if (!banUserId || !banReason.trim()) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    await fetch(`${API_URL}/admin/users/${banUserId}/ban`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ duration_days: durationDays, ban_reason: banReason }),
    });
    setBanUserId(null);
    setBanReason("");
    setDurationDays("1");
    await loadData();
  }

  return (
    <>
      <div className="admin-header">
        <h2>Пользователи</h2>
        <div className="admin-tabs">
          <Link href="/admin" className="admin-tab">
            Главная админки
          </Link>
          <Link href="/admin/genres" className="admin-tab">
            Жанры
          </Link>
          <Link href="/admin/announcements" className="admin-tab">
            Объявления
          </Link>
          <Link href="/admin/users" className="admin-tab admin-tab-active">
            Пользователи
          </Link>
        </div>
      </div>
      <div className="admin-table-container">
        <Pagination />
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Логин</th>
              <th>Имя</th>
              <th>Почта</th>
              <th>Объявлений</th>
              <th>Блокировка</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>
                  <Link href={`/users/${user.id}`}>{user.login}</Link>
                </td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.announcements_count}</td>
                <td>
                  {user.role === "admin" ? (
                    <span className="admin-badge">админ</span>
                  ) : user.banned_until ? (
                    <span>до {new Date(user.banned_until).toLocaleString("ru-RU")}</span>
                  ) : (
                    <button type="button" className="btn-ban-open" onClick={() => setBanUserId(user.id)}>
                      Забанить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination />
      </div>

      {banUserId ? (
        <div id="ban-modal" className="modal modal-open" aria-hidden="false">
          <div className="modal-backdrop" onClick={() => setBanUserId(null)} />
          <div className="modal-box">
            <div className="modal-header">
              <h3>Забанить пользователя</h3>
              <button type="button" className="modal-close" onClick={() => setBanUserId(null)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="ban_duration_days">Срок блокировки</label>
                <select
                  id="ban_duration_days"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                >
                  <option value="1">1 день</option>
                  <option value="7">7 дней</option>
                  <option value="30">30 дней</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="ban_reason">Причина блокировки</label>
                <textarea
                  id="ban_reason"
                  rows={3}
                  required
                  maxLength={1000}
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={() => setBanUserId(null)}>
                Отмена
              </button>
              <button type="button" className="btn-submit" onClick={submitBan}>
                Забанить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
