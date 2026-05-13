"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import StatusDropdown from "@/components/StatusDropdown";

type UserPayload = {
  id: number;
  name?: string | null;
  gender?: string | null;
  language?: string | null;
  timbre?: string | null;
};

const GENDER_OPTIONS = ["Мужской", "Женский", "Не указано"];
const TIMBRE_OPTIONS = [
  "Тенор",
  "Баритон",
  "Бас",
  "Дискант",
  "Альт",
  "Сопрано",
  "Меццо-сопрано",
  "Контральто",
  "Не указано",
];

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("Не указано");
  const [language, setLanguage] = useState("");
  const [timbre, setTimbre] = useState("Не указано");
  const [avatar, setAvatar] = useState<File | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    Promise.all([
      fetch(`${API_URL}/user`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/users/${params.id}`),
    ])
      .then(async ([meResponse, userResponse]) => {
        if (!meResponse.ok) throw new Error("unauthorized");
        if (!userResponse.ok) throw new Error("user_load_failed");

        const me = (await meResponse.json()) as UserPayload;
        if (String(me.id) !== String(params.id)) {
          throw new Error("forbidden");
        }

        const payload = (await userResponse.json()) as { user?: UserPayload };
        const user = payload.user;
        if (!user) throw new Error("user_load_failed");

        setName(user.name ?? "");
        setGender(user.gender ?? "Не указано");
        setLanguage(user.language ?? "");
        setTimbre(user.timbre ?? "Не указано");
      })
      .catch((loadError: Error) => {
        if (loadError.message === "unauthorized") {
          localStorage.removeItem("auth_token");
          router.replace("/auth/login");
          return;
        }
        if (loadError.message === "forbidden") {
          setError("Редактировать можно только свой профиль.");
          return;
        }
        setError("Не удалось загрузить данные профиля.");
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      async function submitTo(url: string, method: "POST" | "PUT", withMethodSpoof = false) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("gender", gender);
        formData.append("language", language);
        formData.append("timbre", timbre);
        if (withMethodSpoof) {
          formData.append("_method", "PUT");
        }
        if (avatar) {
          formData.append("avatar", avatar);
        }

        return fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: formData,
        });
      }

      const attempts = [
        () => submitTo(`${API_URL}/profile/update`, "POST"),
        () => submitTo(`${API_URL}/users/${params.id}`, "PUT"),
        () => submitTo(`${API_URL}/users/${params.id}`, "POST", true),
      ];

      let lastMessage = "Не удалось обновить профиль.";
      let success = false;

      for (const attempt of attempts) {
        const response = await attempt();
        const rawBody = await response.text();
        let payload: { message?: string } = {};

        if (rawBody) {
          try {
            payload = JSON.parse(rawBody) as { message?: string };
          } catch {
            payload = {};
          }
        }

        if (response.ok) {
          success = true;
          break;
        }

        lastMessage = payload.message ?? lastMessage;
        if (response.status === 401) {
          localStorage.removeItem("auth_token");
          router.replace("/auth/login");
          return;
        }
        if (response.status === 403 || response.status === 422) {
          throw new Error(lastMessage);
        }
      }

      if (!success) {
        throw new Error(lastMessage);
      }

      router.push(`/users/${params.id}`);
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError("Ошибка сервера при сохранении профиля.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="profile-card">Загрузка формы...</div>;
  }

  return (
    <div className="form-container">
      <h2>Редактирование профиля</h2>
      <form onSubmit={handleSubmit} className="announcement-form">
        <div className="form-group">
          <label htmlFor="name">Имя</label>
          <input id="name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="avatar">Аватар</label>
          <input
            type="file"
            id="avatar"
            name="avatar"
            accept="image/*"
            onChange={(event) => setAvatar(event.target.files?.[0] ?? null)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="gender">Пол</label>
          <StatusDropdown
            id="gender"
            value={gender}
            options={GENDER_OPTIONS}
            onChange={setGender}
          />
        </div>
        <div className="form-group">
          <label htmlFor="language">Языки</label>
          <input
            id="language"
            name="language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            placeholder="Например: Русский, Английский"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="timbre">Тембр</label>
          <StatusDropdown
            id="timbre"
            value={timbre}
            options={TIMBRE_OPTIONS}
            onChange={setTimbre}
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          <Link href={`/users/${params.id}`} className="btn-cancel">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
