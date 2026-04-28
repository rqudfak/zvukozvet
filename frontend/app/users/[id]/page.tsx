"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { API_URL, fetchApi } from "@/lib/api";
import { buildStorageUrl } from "@/lib/media";

type Review = {
  id: number;
  message: string;
  rating: number;
  created_at: string;
  reviewer?: { name?: string };
};

type Achievement = {
  id: number;
  name: string;
  description?: string;
  icon?: string | null;
};

type PortfolioItem = {
  id: number;
  description?: string | null;
  created_at: string;
  audio_path?: string;
};

type UserData = {
  id: number;
  name: string;
  avatar?: string | null;
  gender?: string | null;
  language?: string | null;
  timbre?: string | null;
  created_at?: string;
  achievements?: Achievement[];
  reviews_received?: Review[];
  portfolio_items?: PortfolioItem[];
};

type MyAnnouncement = {
  id: number;
  title: string;
  status: string;
  description?: string;
  created_at?: string;
  accepted_responses_count?: number;
};

type MyResponse = {
  id: number;
  status: string;
  created_at?: string;
  announcement?: {
    id: number;
    title: string;
    status: string;
    created_at?: string;
  };
};

type UserPayload = {
  user: UserData;
  all_achievements: Achievement[];
  my_announcements: MyAnnouncement[];
  public_announcements: MyAnnouncement[];
  my_responses: MyResponse[];
};

function formatDate(dateString?: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export default function UserPage() {
  const params = useParams<{ id: string }>();
  const [payload, setPayload] = useState<UserPayload | null>(null);
  const [activeTab, setActiveTab] = useState("portfolio");
  const [canEdit, setCanEdit] = useState(false);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [securityPassword, setSecurityPassword] = useState("");
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [portfolioDescription, setPortfolioDescription] = useState("");
  const [portfolioAudio, setPortfolioAudio] = useState<File | null>(null);
  const [portfolioMessage, setPortfolioMessage] = useState<string | null>(null);

  async function refreshProfile() {
    try {
      const data = await fetchApi<UserPayload>(`/users/${params.id}`);
      setPayload(data);
    } catch {
      setPayload(null);
    }
  }

  useEffect(() => {
    fetchApi<UserPayload>(`/users/${params.id}`)
      .then(setPayload)
      .catch(() => setPayload(null));

    const token = localStorage.getItem("auth_token");
    if (!token) return;

    fetch(`${API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unauthorized");
        return response.json() as Promise<{ id: number; two_factor_enabled?: boolean }>;
      })
      .then((currentUser) => {
        setCanEdit(String(currentUser.id) === String(params.id));
        setIsTwoFactorEnabled(Boolean(currentUser.two_factor_enabled));
      })
      .catch(() => setCanEdit(false));
  }, [params.id]);

  async function submitTwoFactor(enabled: boolean) {
    setSecurityMessage(null);
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setSecurityMessage("Нужно войти в аккаунт.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}${enabled ? "/2fa/enable" : "/2fa/disable"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: securityPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSecurityMessage(data.message ?? "Не удалось обновить 2FA.");
        return;
      }

      setIsTwoFactorEnabled(enabled);
      setSecurityPassword("");
      setSecurityMessage(data.message ?? "Готово.");
    } catch {
      setSecurityMessage("Ошибка сервера при изменении 2FA.");
    }
  }

  async function uploadPortfolio() {
    setPortfolioMessage(null);
    if (!portfolioAudio) {
      setPortfolioMessage("Выберите аудиофайл.");
      return;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) {
      setPortfolioMessage("Нужно войти в аккаунт.");
      return;
    }

    const body = new FormData();
    body.append("audio", portfolioAudio);
    body.append("description", portfolioDescription);

    try {
      const response = await fetch(`${API_URL}/users/${params.id}/portfolio`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
      });
      const data = await response.json();
      if (!response.ok) {
        setPortfolioMessage(data.message ?? "Не удалось добавить запись.");
        return;
      }

      setPortfolioAudio(null);
      setPortfolioDescription("");
      setPortfolioMessage(data.message ?? "Запись добавлена.");
      await refreshProfile();
    } catch {
      setPortfolioMessage("Ошибка сервера при добавлении записи.");
    }
  }

  const achievementProgress = useMemo(() => {
    if (!payload) return { earned: 0, total: 0, percent: 0 };
    const earned = payload.user.achievements?.length ?? 0;
    const total = payload.all_achievements?.length ?? 0;
    const percent = total > 0 ? Math.round((earned / total) * 100) : 0;
    return { earned, total, percent };
  }, [payload]);

  if (!payload) {
    return <div className="profile-card">Загрузка профиля...</div>;
  }

  const userAchievementIds = new Set((payload.user.achievements ?? []).map((a) => a.id));

  return (
    <>
      <h2 className="page-title">Профиль</h2>
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar-wrap">
            <img
              src={
                payload.user.avatar
                    ? buildStorageUrl(`avatars/${payload.user.avatar}`) ?? "/images/defult.png"
                    : "http://localhost:8000/images/defult.png"
              }
              alt="Аватар"
              className="profile-avatar"
            />
          </div>
          <div className="profile-info">
            <p className="profile-name">{payload.user.name}</p>
            <p>
              <strong>Пол:</strong> {payload.user.gender ?? "—"}
            </p>
            <p>
              <strong>Языки:</strong> {payload.user.language ?? "—"}
            </p>
            <p>
              <strong>Тембр:</strong> {payload.user.timbre ?? "—"}
            </p>
            <p>
              <strong>На сайте:</strong> с {formatDate(payload.user.created_at)}
            </p>

            <div className="profile-achievements-bar-wrap">
              <strong>
                Достижения: {achievementProgress.earned}/{achievementProgress.total}
              </strong>
              <div className="profile-achievements-bar">
                <div
                  className="profile-achievements-bar-fill"
                  style={{ width: `${achievementProgress.percent}%` }}
                />
              </div>
            </div>

            {canEdit ? (
              <Link href={`/users/${params.id}/edit`} className="btn-edit-profile">
                Редактировать
              </Link>
            ) : null}

            {canEdit ? (
              <div className="profile-security-section">
                <h4>🔒 Безопасность аккаунта</h4>
                {isTwoFactorEnabled ? (
                  <div className="security-status enabled">
                    <span className="badge-success">✓ Двухфакторная аутентификация включена</span>
                    <p className="security-note">
                      При входе в аккаунт вам будет приходить код подтверждения на почту.
                    </p>
                    <div className="password-confirm">
                      <input
                        type="password"
                        placeholder="Введите текущий пароль"
                        value={securityPassword}
                        onChange={(event) => setSecurityPassword(event.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-security disable"
                        onClick={() => submitTwoFactor(false)}
                      >
                        Отключить 2FA
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="security-status disabled">
                    <span className="badge-warning">✗ Двухфакторная аутентификация не настроена</span>
                    <p className="security-note">
                      Включите 2FA для дополнительной защиты вашего аккаунта.
                    </p>
                    <div className="password-confirm">
                      <input
                        type="password"
                        placeholder="Введите текущий пароль"
                        value={securityPassword}
                        onChange={(event) => setSecurityPassword(event.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-security enable"
                        onClick={() => submitTwoFactor(true)}
                      >
                        Включить 2FA
                      </button>
                    </div>
                  </div>
                )}
                {securityMessage ? <p>{securityMessage}</p> : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="profile-tabs">
          <button
            type="button"
            className={`profile-tab ${activeTab === "portfolio" ? "active" : ""}`}
            onClick={() => setActiveTab("portfolio")}
          >
            Портфолио
          </button>
          {canEdit ? (
            <button
              type="button"
              className={`profile-tab ${activeTab === "my-announcements" ? "active" : ""}`}
              onClick={() => setActiveTab("my-announcements")}
            >
              Мои объявления
            </button>
          ) : (
            <button
              type="button"
              className={`profile-tab ${activeTab === "announcements" ? "active" : ""}`}
              onClick={() => setActiveTab("announcements")}
            >
              Объявления
            </button>
          )}
          {canEdit ? (
            <button
              type="button"
              className={`profile-tab ${activeTab === "my-responses" ? "active" : ""}`}
              onClick={() => setActiveTab("my-responses")}
            >
              Мои отклики
            </button>
          ) : null}
          <button
            type="button"
            className={`profile-tab ${activeTab === "reviews" ? "active" : ""}`}
            onClick={() => setActiveTab("reviews")}
          >
            Отзывы
          </button>
          <button
            type="button"
            className={`profile-tab ${activeTab === "achievements" ? "active" : ""}`}
            onClick={() => setActiveTab("achievements")}
          >
            Достижения
          </button>
        </div>

        <div className={`profile-tab-content ${activeTab === "portfolio" ? "active" : ""}`}>
          {canEdit ? (
            <div className="portfolio-upload">
              <div className="portfolio-form">
                <label className="portfolio-upload-label">+ Загрузить запись</label>
                <input
                  type="file"
                  accept=".mp3,.wav,.ogg,.m4a"
                  className="portfolio-file-input"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setPortfolioAudio(file);
                  }}
                />
                <input
                  type="text"
                  placeholder="Описание записи"
                  className="portfolio-desc-input"
                  value={portfolioDescription}
                  onChange={(event) => setPortfolioDescription(event.target.value)}
                />
                <button type="button" className="btn-submit" onClick={uploadPortfolio}>
                  Добавить
                </button>
              </div>
              {portfolioMessage ? <p>{portfolioMessage}</p> : null}
            </div>
          ) : null}
          <div className="portfolio-list">
            {(payload.user.portfolio_items ?? []).length === 0 ? (
              <p className="profile-empty">Записей в портфолио пока нет.</p>
            ) : (
              payload.user.portfolio_items?.map((item) => (
                <div key={item.id} className="portfolio-item">
                  <span className="portfolio-item-date">{formatDate(item.created_at)}</span>
                  <p className="portfolio-item-desc">{item.description || "—"}</p>
                  {item.audio_path ? (
                    <div className="portfolio-item-audio">
                      <audio controls src={buildStorageUrl(item.audio_path) ?? undefined} />
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        {canEdit ? (
          <div className={`profile-tab-content ${activeTab === "my-announcements" ? "active" : ""}`}>
            <div className="my-announcements-list">
              {payload.my_announcements.length === 0 ? (
                <p className="profile-empty">Объявлений пока нет.</p>
              ) : (
                payload.my_announcements.map((announcement) => (
                  <div key={announcement.id} className="my-announcement-item">
                    <div className="my-announcement-top">
                      <Link className="my-announcement-title" href={`/announcements/${announcement.id}`}>
                        {announcement.title}
                      </Link>
                      <span className="my-announcement-date">
                        {formatDate(announcement.created_at)}
                      </span>
                    </div>
                    <div className="my-announcement-meta">
                      <span className="my-announcement-status">Статус: {announcement.status}</span>
                    </div>
                    <div className="my-announcement-desc">{announcement.description ?? ""}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {canEdit ? (
          <div className={`profile-tab-content ${activeTab === "my-responses" ? "active" : ""}`}>
            <div className="my-announcements-list">
              {payload.my_responses.length === 0 ? (
                <p className="profile-empty">Откликов пока нет.</p>
              ) : (
                payload.my_responses.map((response) => (
                  <div key={response.id} className="my-announcement-item">
                    <div className="my-announcement-top">
                      {response.announcement ? (
                        <Link className="my-announcement-title" href={`/announcements/${response.announcement.id}`}>
                          {response.announcement.title}
                        </Link>
                      ) : (
                        <span className="my-announcement-title">Объявление недоступно</span>
                      )}
                      <span className="my-announcement-date">{formatDate(response.created_at)}</span>
                    </div>
                    <div className="my-announcement-meta">
                      <span className="my-announcement-status">Статус отклика: {response.status}</span>
                    </div>
                    {response.announcement?.status !== "Одобрено" ? (
                      <div className="my-announcement-desc">
                        Объявление снято с публикации. Откликнуться повторно нельзя.
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className={`profile-tab-content ${activeTab === "announcements" ? "active" : ""}`}>
            <div className="my-announcements-list">
              {payload.public_announcements.length === 0 ? (
                <p className="profile-empty">Объявлений пока нет.</p>
              ) : (
                payload.public_announcements.map((announcement) => (
                  <div key={announcement.id} className="my-announcement-item">
                    <div className="my-announcement-top">
                      <Link className="my-announcement-title" href={`/announcements/${announcement.id}`}>
                        {announcement.title}
                      </Link>
                      <span className="my-announcement-date">{formatDate(announcement.created_at)}</span>
                    </div>
                    <div className="my-announcement-meta">
                      <span className="my-announcement-status">Статус: {announcement.status}</span>
                    </div>
                    <div className="my-announcement-desc">{announcement.description ?? ""}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className={`profile-tab-content ${activeTab === "reviews" ? "active" : ""}`}>
          <div className="reviews-list">
            {(payload.user.reviews_received ?? []).length === 0 ? (
              <p className="profile-empty">Отзывов пока нет.</p>
            ) : (
              payload.user.reviews_received?.map((review) => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <span className="review-author">{review.reviewer?.name ?? "Пользователь"}</span>
                    <span className="review-date">{formatDate(review.created_at)}</span>
                  </div>
                  <p className="review-message">{review.message}</p>
                  <div className="review-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`review-star ${star <= review.rating ? "filled" : ""}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`profile-tab-content ${activeTab === "achievements" ? "active" : ""}`}>
          <div className="achievements-grid">
            {payload.all_achievements.length === 0 ? (
              <p className="profile-empty">Список достижений пока не заполнен.</p>
            ) : (
              payload.all_achievements.map((achievement) => {
                const unlocked = userAchievementIds.has(achievement.id);
                return (
                  <div
                    key={achievement.id}
                    className={`achievement-item ${unlocked ? "unlocked" : "locked"}`}
                    title={achievement.description || ""}
                  >
                    {achievement.icon ? (
                      <img
                        src={`http://localhost:8000/images/achievements/${achievement.icon}`}
                        alt=""
                        className="achievement-icon"
                      />
                    ) : (
                      <div className="achievement-icon-placeholder">🏆</div>
                    )}
                    <span className="achievement-name">{achievement.name}</span>
                    {achievement.description ? (
                      <span className="achievement-desc">{achievement.description}</span>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
