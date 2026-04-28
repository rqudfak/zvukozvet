 "use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/api";
import { setSuccessFlash } from "@/lib/flash";

type Genre = { id: number; name: string };

export default function CreateAnnouncementPage() {
  const [genres, setGenres] = useState<{ books: Genre[]; games: Genre[] }>({
    books: [],
    games: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("Книга");

  const availableGenres = useMemo(
    () => (type === "Книга" ? genres.books : genres.games),
    [genres.books, genres.games, type],
  );

  useEffect(() => {
    fetchApi<{ books: Genre[]; games: Genre[] }>("/genres")
      .then(setGenres)
      .catch(() => setError("Не удалось загрузить жанры"));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setError("Для создания объявления сначала выполните вход.");
      setLoading(false);
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          title: formData.get("title"),
          type: formData.get("type"),
          genre: formData.get("genre"),
          languages: formData.get("languages"),
          gender: formData.get("gender"),
          duration: formData.get("duration"),
          description: formData.get("description"),
          fragment: formData.get("fragment"),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Не удалось создать объявление");
        return;
      }

      setSuccessFlash(payload.message ?? "Объявление отправлено на модерацию!");
      window.location.href = "/";
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-container">
      <h2>Создать объявление</h2>
      <form onSubmit={handleSubmit} className="announcement-form">
        <div className="form-group">
          <label htmlFor="title">Название</label>
          <input id="title" name="title" required />
        </div>
        <div className="form-group">
          <label htmlFor="type">Тип</label>
          <select
            id="type"
            name="type"
            defaultValue="Книга"
            onChange={(event) => setType(event.target.value)}
          >
            <option value="Книга">Книга</option>
            <option value="Видеоигра">Видеоигра</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="genre">Жанр</label>
          <select id="genre" name="genre" required>
            <option value="">Выберите жанр</option>
            {availableGenres.map((genre) => (
              <option key={genre.id} value={genre.name}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="languages">Языки</label>
          <input id="languages" name="languages" required />
        </div>
        <div className="form-group">
          <label htmlFor="gender">Голос озвучивания</label>
          <select id="gender" name="gender" defaultValue="Мужской">
            <option value="Мужской">Мужской</option>
            <option value="Женский">Женский</option>
            <option value="Детский">Детский</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="duration">Длительность роли</label>
          <select id="duration" name="duration" defaultValue="Кратковременная роль">
            <option value="Кратковременная роль">Кратковременная роль</option>
            <option value="Долгосрочная роль">Долгосрочная роль</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="description">Описание</label>
          <textarea id="description" name="description" rows={4} required />
        </div>
        <div className="form-group">
          <label htmlFor="fragment">Текст</label>
          <textarea id="fragment" name="fragment" rows={8} required />
        </div>
        {error ? <p style={{ color: "#d11a2a" }}>{error}</p> : null}
        <div className="form-actions">
          <button className="btn-submit" type="submit" disabled={loading}>
            Создать объявление
          </button>
          <Link href="/" className="btn-cancel">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
