 "use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/lib/api";
import {
  ANNOUNCEMENT_TIMBRE_OPTIONS,
  toggleAnnouncementTimbreSelection,
} from "@/lib/announcementTimbres";
import { setSuccessFlash } from "@/lib/flash";
import StatusDropdown from "@/components/StatusDropdown";

type Genre = { id: number; name: string };

const TYPE_OPTIONS = ["Книга", "Видеоигра"] as const;
const GENDER_OPTIONS = ["Мужской", "Женский", "Детский"] as const;
const DURATION_OPTIONS = ["Кратковременная роль", "Долгосрочная роль"] as const;

export default function CreateAnnouncementPage() {
  const [genres, setGenres] = useState<{ books: Genre[]; games: Genre[] }>({
    books: [],
    games: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("Книга");
  const [genre, setGenre] = useState("");
  const [gender, setGender] = useState("Мужской");
  const [timbres, setTimbres] = useState<string[]>(["Не указано"]);
  const [duration, setDuration] = useState("Кратковременная роль");

  const availableGenres = useMemo(
    () => (type === "Книга" ? genres.books : genres.games),
    [genres.books, genres.games, type],
  );

  const genreNames = useMemo(() => availableGenres.map((g) => g.name), [availableGenres]);

  useEffect(() => {
    setGenre("");
  }, [type]);

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

    if (!genre.trim()) {
      setError("Выберите жанр.");
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
          type,
          genre,
          languages: formData.get("languages"),
          gender,
          timbres,
          duration,
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
          <StatusDropdown id="type" value={type} options={TYPE_OPTIONS} onChange={setType} />
        </div>
        <div className="form-group">
          <label htmlFor="genre">Жанр</label>
          <StatusDropdown
            id="genre"
            value={genre}
            options={genreNames}
            emptyLabel="Выберите жанр"
            onChange={setGenre}
            disabled={genreNames.length === 0}
          />
        </div>
        <div className="form-group">
          <label htmlFor="languages">Языки</label>
          <input id="languages" name="languages" required />
        </div>
        <div className="form-group">
          <label htmlFor="gender">Голос озвучивания</label>
          <StatusDropdown id="gender" value={gender} options={GENDER_OPTIONS} onChange={setGender} />
        </div>
        <div className="form-group">
          <label>Тембр</label>
          <div className="announcement-timbre-options">
            {ANNOUNCEMENT_TIMBRE_OPTIONS.map((option) => (
              <label key={option} className="announcement-timbre-option">
                <input
                  type="checkbox"
                  checked={timbres.includes(option)}
                  onChange={() => setTimbres((prev) => toggleAnnouncementTimbreSelection(prev, option))}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="duration">Длительность роли</label>
          <StatusDropdown id="duration" value={duration} options={DURATION_OPTIONS} onChange={setDuration} />
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
            Создать
          </button>
          <Link href="/" className="btn-cancel">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
