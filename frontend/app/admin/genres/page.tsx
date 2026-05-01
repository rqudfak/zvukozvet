 "use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { buildGenreIconUrl } from "@/lib/media";

type Genre = {
  id: number;
  name: string;
  color: string;
  type: string;
  icon?: string | null;
};

const DEFAULT_COLOR = "#F1642E";

export default function AdminGenresPage() {
  const [books, setBooks] = useState<Genre[]>([]);
  const [games, setGames] = useState<Genre[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("Книга");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [icon, setIcon] = useState<File | null>(null);
  const [createGenreError, setCreateGenreError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Genre | null>(null);
  const [editingIcon, setEditingIcon] = useState<File | null>(null);

  function openGenreEdit(genre: Genre) {
    setEditing(genre);
    setEditingIcon(null);
  }

  function closeGenreEdit() {
    setEditing(null);
    setEditingIcon(null);
  }

  async function loadData() {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const response = await fetch(`${API_URL}/admin/genres`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { books: Genre[]; games: Genre[] };
    setBooks(payload.books ?? []);
    setGames(payload.games ?? []);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  async function createGenre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateGenreError(null);
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const formData = new FormData();
    formData.append("name", name);
    formData.append("type", type);
    formData.append("color", color);
    if (icon) formData.append("icon", icon);
    const response = await fetch(`${API_URL}/admin/genres`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | null;
      const nameErrors = data?.errors?.name ?? [];
      if (nameErrors.length > 0) {
        setCreateGenreError("Жанр с таким названием уже существует");
      } else {
        setCreateGenreError(data?.message ?? "Не удалось добавить жанр");
      }
      return;
    }
    setName("");
    setType("Книга");
    setColor(DEFAULT_COLOR);
    setIcon(null);
    setCreateGenreError(null);
    await loadData();
  }

  async function deleteGenre(id: number) {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    await fetch(`${API_URL}/admin/genres/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadData();
  }

  async function updateGenre() {
    if (!editing) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const formData = new FormData();
    formData.append("name", editing.name);
    formData.append("type", editing.type);
    formData.append("color", editing.color);
    if (editingIcon) formData.append("icon", editingIcon);
    const response = await fetch(`${API_URL}/admin/genres/${editing.id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | null;
      const msg =
        data?.message ??
        (data?.errors ? Object.values(data.errors).flat().join(" ") : null) ??
        `Ошибка сохранения (${response.status})`;
      window.alert(msg);
      return;
    }
    closeGenreEdit();
    await loadData();
  }

  return (
    <>
      <div className="admin-tabs" style={{ marginBottom: 20 }}>
        <Link href="/admin" className="admin-tab">
          Главная админки
        </Link>
        <Link href="/admin/genres" className="admin-tab admin-tab-active">
          Жанры
        </Link>
        <Link href="/admin/announcements" className="admin-tab">
          Объявления
        </Link>
        <Link href="/admin/users" className="admin-tab">
          Пользователи
        </Link>
      </div>
      <div className="admin-genres-layout">
        <div className="admin-genres-tables">
          <div className="admin-table-container">
            <h2>Жанры книг</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Цвет</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {books.map((genre) => (
                  <tr key={genre.id}>
                    <td>{genre.name}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          width: 16,
                          height: 16,
                          background: genre.color,
                          borderRadius: 3,
                          marginRight: 6,
                          verticalAlign: "middle",
                        }}
                      />
                      {genre.color}
                    </td>
                    <td className="genre-actions-cell">
                      <button
                        type="button"
                        className="genre-action-btn genre-action-btn-edit"
                        title="Изменить"
                        aria-label="Изменить"
                        onClick={() => openGenreEdit(genre)}
                      />
                      <button
                        type="button"
                        className="genre-action-btn genre-action-btn-delete"
                        title="Удалить"
                        aria-label="Удалить"
                        onClick={() => deleteGenre(genre.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-table-container" style={{ marginTop: 20 }}>
            <h2>Жанры видеоигр</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Цвет</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {games.map((genre) => (
                  <tr key={genre.id}>
                    <td>{genre.name}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          width: 16,
                          height: 16,
                          background: genre.color,
                          borderRadius: 3,
                          marginRight: 6,
                          verticalAlign: "middle",
                        }}
                      />
                      {genre.color}
                    </td>
                    <td className="genre-actions-cell">
                      <button
                        type="button"
                        className="genre-action-btn genre-action-btn-edit"
                        title="Изменить"
                        aria-label="Изменить"
                        onClick={() => openGenreEdit(genre)}
                      />
                      <button
                        type="button"
                        className="genre-action-btn genre-action-btn-delete"
                        title="Удалить"
                        aria-label="Удалить"
                        onClick={() => deleteGenre(genre.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="admin-genres-form">
          <div className="form-container" style={{ marginBottom: 0 }}>
            <h2>Добавить жанр</h2>
            <form className="announcement-form" onSubmit={createGenre}>
              {createGenreError ? <p className="genre-form-error">{createGenreError}</p> : null}
              <div className="form-group">
                <label htmlFor="name">Название жанра</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  className={createGenreError ? "genre-name-input-error" : ""}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (createGenreError) {
                      setCreateGenreError(null);
                    }
                  }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="type">Тип</label>
                <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="Книга">Книга</option>
                  <option value="Видеоигра">Видеоигра</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="color">Цвет</label>
                <select id="color" value={color} onChange={(e) => setColor(e.target.value)}>
                  <option value="#F1642E">Оранжевый</option>
                  <option value="#C4C3E3">Голубой</option>
                  <option value="#FFC44B">Жёлтый</option>
                  <option value="#A3B565">Зелёный</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="icon">Иконка жанра (png/jpg/webp/svg)</label>
                <input
                  id="icon"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => setIcon(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-submit">
                  Сохранить жанр
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {editing ? (
        <div id="genre-edit-modal" className="modal modal-open" aria-hidden="false">
          <div className="modal-backdrop" onClick={closeGenreEdit} />
          <div className="modal-box">
            <div className="modal-header">
              <h3>Редактировать жанр</h3>
              <button type="button" className="modal-close" onClick={closeGenreEdit}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="genre_name">Название жанра</label>
                <input
                  id="genre_name"
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  disabled
                />
              </div>
              <div className="form-group">
                <label htmlFor="genre_type">Тип</label>
                <select
                  id="genre_type"
                  value={editing.type}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                >
                  <option value="Книга">Книга</option>
                  <option value="Видеоигра">Видеоигра</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="genre_color">Цвет</label>
                <select
                  id="genre_color"
                  value={editing.color}
                  onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                >
                  <option value="#F1642E">Оранжевый</option>
                  <option value="#C4C3E3">Голубой</option>
                  <option value="#FFC44B">Жёлтый</option>
                  <option value="#A3B565">Зелёный</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="genre_icon">Иконка жанра (png/jpg/webp/svg)</label>
                
                <input
                  id="genre_icon"
                  key={editing.id}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => setEditingIcon(e.target.files?.[0] ?? null)}
                />
                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#666" }}>
                  Оставьте поле пустым, чтобы не менять иконку.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={closeGenreEdit}>
                Отмена
              </button>
              <button type="button" className="btn-submit" onClick={updateGenre}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
