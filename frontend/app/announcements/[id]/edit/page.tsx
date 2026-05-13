"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { API_URL } from "@/lib/api";
import {
  ANNOUNCEMENT_TIMBRE_OPTIONS,
  toggleAnnouncementTimbreSelection,
} from "@/lib/announcementTimbres";
import { setSuccessFlash } from "@/lib/flash";
import StatusDropdown from "@/components/StatusDropdown";

type Genre = { id: number; name: string };

type AnnouncementPayload = {
  id: number;
  user_id: number;
  title: string;
  type: string;
  genre: string;
  languages: string;
  gender: string;
  timbres?: string[];
  duration: string;
  description: string;
  fragment: string;
};

type FieldKey =
  | "title"
  | "type"
  | "genre"
  | "languages"
  | "gender"
  | "timbres"
  | "duration"
  | "description"
  | "fragment";

type FieldErrors = Partial<Record<FieldKey, string>>;

const GENDER_OPTIONS = ["Мужской", "Женский", "Детский"] as const;
const TYPE_OPTIONS = ["Книга", "Видеоигра"] as const;
const DURATION_OPTIONS = ["Кратковременная роль", "Долгосрочная роль"] as const;

function firstError(errors: unknown, key: string): string | undefined {
  if (!errors || typeof errors !== "object") return undefined;
  const list = (errors as Record<string, string[]>)[key];
  if (!Array.isArray(list) || list.length === 0) return undefined;
  return list[0];
}

function parseFieldErrors(payload: unknown): FieldErrors {
  if (!payload || typeof payload !== "object") return {};
  const errors = (payload as { errors?: unknown }).errors;
  return {
    title: firstError(errors, "title"),
    type: firstError(errors, "type"),
    genre: firstError(errors, "genre"),
    languages: firstError(errors, "languages"),
    gender: firstError(errors, "gender"),
    timbres: firstError(errors, "timbres"),
    duration: firstError(errors, "duration"),
    description: firstError(errors, "description"),
    fragment: firstError(errors, "fragment"),
  };
}

export default function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const [announcementId, setAnnouncementId] = useState<string | null>(null);
  const [genres, setGenres] = useState<{ books: Genre[]; games: Genre[] }>({ books: [], games: [] });
  const [pageError, setPageError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const [title, setTitle] = useState("");
  const [type, setType] = useState("Книга");
  const [genre, setGenre] = useState("");
  const [languages, setLanguages] = useState("");
  const [gender, setGender] = useState("Мужской");
  const [timbres, setTimbres] = useState<string[]>(["Не указано"]);
  const [duration, setDuration] = useState("Кратковременная роль");
  const [description, setDescription] = useState("");
  const [fragment, setFragment] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const availableGenres = useMemo(
    () => (type === "Книга" ? genres.books : genres.games),
    [genres.books, genres.games, type],
  );

  const genreNames = useMemo(() => availableGenres.map((item) => item.name), [availableGenres]);

  useEffect(() => {
    params.then(({ id }) => setAnnouncementId(id));
  }, [params]);

  useEffect(() => {
    if (!announcementId) return;

    let cancelled = false;

    (async () => {
      setLoadState("loading");
      setPageError(null);
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setPageError("Для редактирования объявления войдите в аккаунт.");
        setLoadState("error");
        return;
      }

      try {
        const [genRes, annRes, meRes] = await Promise.all([
          fetch(`${API_URL}/genres`, {
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            cache: "no-store",
          }),
          fetch(`${API_URL}/announcements/${announcementId}`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
          fetch(`${API_URL}/user`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
            cache: "no-store",
          }),
        ]);

        const genresPayload = (await genRes.json().catch(() => null)) as
          | { books?: Genre[]; games?: Genre[] }
          | null;
        const annPayload = (await annRes.json().catch(() => null)) as {
          announcement?: AnnouncementPayload;
          accepted_response_id?: number | null;
        } | null;
        const me = meRes.ok ? ((await meRes.json().catch(() => null)) as { id?: number } | null) : null;

        if (cancelled) return;

        if (!genRes.ok || !genresPayload?.books || !genresPayload?.games) {
          setPageError("Не удалось загрузить жанры.");
          setLoadState("error");
          return;
        }

        setGenres({ books: genresPayload.books, games: genresPayload.games });

        if (!annRes.ok || !annPayload?.announcement) {
          setPageError("Не удалось загрузить объявление.");
          setLoadState("error");
          return;
        }

        const ann = annPayload.announcement;
        const acceptedId = annPayload.accepted_response_id ?? null;

        if (!me?.id) {
          setPageError("Для редактирования объявления войдите в аккаунт.");
          setLoadState("error");
          return;
        }

        if (me.id !== ann.user_id) {
          setPageError("У вас нет прав для редактирования этого объявления.");
          setLoadState("error");
          return;
        }

        if (acceptedId !== null) {
          setPageError("Редактирование недоступно: по объявлению уже принят отклик.");
          setLoadState("error");
          return;
        }

        setTitle(ann.title);
        setType(ann.type === "Видеоигра" ? "Видеоигра" : "Книга");
        setGenre(ann.genre);
        setLanguages(ann.languages);
        const g = ann.gender;
        setGender(GENDER_OPTIONS.includes(g as (typeof GENDER_OPTIONS)[number]) ? g : "Мужской");
        const loadedTimbres = Array.isArray(ann.timbres) ? ann.timbres.filter((t): t is string => typeof t === "string") : [];
        setTimbres(loadedTimbres.length > 0 ? loadedTimbres : ["Не указано"]);
        setDuration(ann.duration === "Долгосрочная роль" ? "Долгосрочная роль" : "Кратковременная роль");
        setDescription(ann.description);
        setFragment(ann.fragment);

        setLoadState("ready");
      } catch {
        if (!cancelled) {
          setPageError("Не удалось загрузить данные.");
          setLoadState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [announcementId]);

  function clearFieldError(key: FieldKey) {
    setFieldErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  useEffect(() => {
    if (genre === "") return;
    const names = new Set(availableGenres.map((item) => item.name));
    if (!names.has(genre)) {
      setGenre("");
    }
  }, [availableGenres, genre]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!announcementId) return;

    setError(null);
    setFieldErrors({});
    setSaving(true);
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setError("Сессия истекла. Войдите снова.");
      setSaving(false);
      return;
    }

    if (!genre.trim()) {
      setFieldErrors({ genre: "Выберите жанр." });
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/announcements/${announcementId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          title,
          type,
          genre,
          languages,
          gender,
          timbres,
          duration,
          description,
          fragment,
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; errors?: Record<string, string[]> }
        | null;

      if (!response.ok) {
        const nextFieldErrors = parseFieldErrors(payload);
        setFieldErrors(nextFieldErrors);
        const hasFieldMessage = Object.values(nextFieldErrors).some(Boolean);
        setError(
          hasFieldMessage ? null : (payload?.message ?? "Не удалось сохранить изменения"),
        );
        return;
      }

      setSuccessFlash(
        payload?.message ?? "Объявление обновлено и повторно отправлено на модерацию.",
      );
      window.location.href = "/";
    } catch {
      setError("Сервер недоступен. Попробуйте позже.");
    } finally {
      setSaving(false);
    }
  }

  if (loadState === "loading" || announcementId === null) {
    return (
      <div className="form-container">
        <p>Загрузка…</p>
      </div>
    );
  }

  if (loadState === "error") {
    const showLogin = pageError?.toLowerCase().includes("войдите") ?? false;
    return (
      <div className="form-container">
        <h2>Редактировать объявление</h2>
        <p style={{ color: "#d11a2a" }}>{pageError ?? "Произошла ошибка."}</p>
        <div className="form-actions" style={{ marginTop: 16 }}>
          <Link href={announcementId ? `/announcements/${announcementId}` : "/"} className="btn-cancel">
            {announcementId ? "К объявлению" : "На главную"}
          </Link>
          {showLogin ? (
            <Link href="/auth/login" className="btn-submit" style={{ display: "inline-block", textAlign: "center" }}>
              Вход
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h2>Редактировать объявление</h2>
      <form onSubmit={handleSubmit} className="announcement-form">
        <div className="form-group">
          <label htmlFor="edit-title">Название</label>
          <input
            id="edit-title"
            name="title"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearFieldError("title");
              setError(null);
            }}
          />
          {fieldErrors.title ? <span className="field-error">{fieldErrors.title}</span> : null}
        </div>

        <div className="form-group">
          <label htmlFor="edit-type">Тип</label>
          <StatusDropdown
            id="edit-type"
            value={type}
            options={TYPE_OPTIONS}
            onChange={(next) => {
              setType(next);
              clearFieldError("type");
              setError(null);
            }}
          />
          {fieldErrors.type ? <span className="field-error">{fieldErrors.type}</span> : null}
        </div>

        <div className="form-group">
          <label htmlFor="edit-genre">Жанр</label>
          <StatusDropdown
            id="edit-genre"
            value={genre}
            options={genreNames}
            emptyLabel="Выберите жанр"
            disabled={genreNames.length === 0}
            onChange={(next) => {
              setGenre(next);
              clearFieldError("genre");
              setError(null);
            }}
          />
          {fieldErrors.genre ? <span className="field-error">{fieldErrors.genre}</span> : null}
        </div>

        <div className="form-group">
          <label htmlFor="edit-languages">Языки</label>
          <input
            id="edit-languages"
            name="languages"
            required
            placeholder="Например: Русский, Английский"
            value={languages}
            onChange={(e) => {
              setLanguages(e.target.value);
              clearFieldError("languages");
              setError(null);
            }}
          />
          {fieldErrors.languages ? <span className="field-error">{fieldErrors.languages}</span> : null}
        </div>

        <div className="form-group">
          <label htmlFor="edit-gender">Голос озвучивания</label>
          <StatusDropdown
            id="edit-gender"
            value={gender}
            options={GENDER_OPTIONS}
            onChange={(next) => {
              setGender(next);
              clearFieldError("gender");
              setError(null);
            }}
          />
          {fieldErrors.gender ? <span className="field-error">{fieldErrors.gender}</span> : null}
        </div>

        <div className="form-group">
          <label>Тембр</label>
          <div className="announcement-timbre-options">
            {ANNOUNCEMENT_TIMBRE_OPTIONS.map((option) => (
              <label key={option} className="announcement-timbre-option">
                <input
                  type="checkbox"
                  checked={timbres.includes(option)}
                  onChange={() => {
                    setTimbres((prev) => toggleAnnouncementTimbreSelection(prev, option));
                    clearFieldError("timbres");
                    setError(null);
                  }}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {fieldErrors.timbres ? <span className="field-error">{fieldErrors.timbres}</span> : null}
        </div>

        <div className="form-group">
          <label htmlFor="edit-duration">Срок</label>
          <StatusDropdown
            id="edit-duration"
            value={duration}
            options={DURATION_OPTIONS}
            onChange={(next) => {
              setDuration(next);
              clearFieldError("duration");
              setError(null);
            }}
          />
          {fieldErrors.duration ? <span className="field-error">{fieldErrors.duration}</span> : null}
        </div>

        <div className="form-group">
          <label htmlFor="edit-description">Описание</label>
          <textarea
            id="edit-description"
            name="description"
            rows={4}
            required
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearFieldError("description");
              setError(null);
            }}
          />
          {fieldErrors.description ? (
            <span className="field-error">{fieldErrors.description}</span>
          ) : null}
        </div>

        <div className="form-group">
          <label htmlFor="edit-fragment">Текст</label>
          <textarea
            id="edit-fragment"
            name="fragment"
            rows={8}
            required
            value={fragment}
            onChange={(e) => {
              setFragment(e.target.value);
              clearFieldError("fragment");
              setError(null);
            }}
          />
          {fieldErrors.fragment ? <span className="field-error">{fieldErrors.fragment}</span> : null}
        </div>

        {error ? <p style={{ color: "#d11a2a" }}>{error}</p> : null}

        <div className="form-actions">
          <button className="btn-submit" type="submit" disabled={saving}>
            Сохранить
          </button>
          <Link href={`/announcements/${announcementId}`} className="btn-cancel">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
