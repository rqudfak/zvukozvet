"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_URL, fetchApi } from "@/lib/api";
import { buildStorageUrl } from "@/lib/media";

type Review = {
  id: number;
  message: string;
  rating: number;
  created_at: string;
  reviewer?: { id?: number; name?: string; avatar?: string | null };
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
    accepted_responses_count?: number;
  };
};

type UserPayload = {
  user: UserData;
  all_achievements: Achievement[];
  my_announcements: MyAnnouncement[];
  public_announcements: MyAnnouncement[];
  my_responses: MyResponse[];
  is_following: boolean;
  subscriptions_count: number;
  subscribers_count: number;
  subscriptions: { id: number; name: string; avatar?: string | null }[];
  subscriptions_announcements: (MyAnnouncement & { user?: { id: number; name: string } })[];
  subscribers: { id: number; name: string; avatar?: string | null }[];
};

function formatDate(dateString?: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/** Объявление закрыто для новых откликов: есть принятый отклик (статус объявления часто остаётся «Одобрено»). */
function isProfileAnnouncementClosed(a: { accepted_responses_count?: number }): boolean {
  return (a.accepted_responses_count ?? 0) > 0;
}

/** Свой загруженный аватар (не заглушка в БД). */
function hasCustomProfileAvatar(avatar: string | null | undefined): boolean {
  if (avatar == null || String(avatar).trim() === "") return false;
  const n = String(avatar).trim().toLowerCase();
  return n !== "defult.png" && n !== "default.png";
}

export default function UserPage() {
  const PAGE_SIZE = 10;
  const params = useParams<{ id: string }>();
  const [payload, setPayload] = useState<UserPayload | null>(null);
  const [activeTab, setActiveTab] = useState("portfolio");
  const [canEdit, setCanEdit] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [portfolioDescription, setPortfolioDescription] = useState("");
  const [portfolioAudio, setPortfolioAudio] = useState<File | null>(null);
  const [portfolioMessage, setPortfolioMessage] = useState<string | null>(null);
  const [portfolioItemToDelete, setPortfolioItemToDelete] = useState<number | null>(null);
  const [portfolioDeleteSubmitting, setPortfolioDeleteSubmitting] = useState(false);
  const [avatarDeleteOpen, setAvatarDeleteOpen] = useState(false);
  const [avatarDeleteSubmitting, setAvatarDeleteSubmitting] = useState(false);
  const [avatarDeleteError, setAvatarDeleteError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [followMessage, setFollowMessage] = useState<string | null>(null);
  const [portfolioPage, setPortfolioPage] = useState(1);
  const [myAnnouncementsPage, setMyAnnouncementsPage] = useState(1);
  const [publicAnnouncementsPage, setPublicAnnouncementsPage] = useState(1);
  const [responsesPage, setResponsesPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [subscriptionsPage, setSubscriptionsPage] = useState(1);
  const [subscribersPage, setSubscribersPage] = useState(1);
  const [playingPortfolioItemId, setPlayingPortfolioItemId] = useState<number | null>(null);
  const [portfolioDurations, setPortfolioDurations] = useState<Record<number, string>>({});
  const [portfolioProgress, setPortfolioProgress] = useState<Record<number, number>>({});
  const [isSeeking, setIsSeeking] = useState<Record<number, boolean>>({});
  const portfolioAudioRefs = useRef<Record<number, HTMLAudioElement | null>>({});

  const refreshProfile = useCallback(async (tokenOverride?: string | null) => {
    try {
      const token =
        tokenOverride !== undefined ? tokenOverride : typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const data = await fetchApi<UserPayload>(
        `/users/${params.id}`,
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : undefined,
      );
      setPayload(data);
    } catch {
      if (tokenOverride) {
        try {
          const fallbackData = await fetchApi<UserPayload>(`/users/${params.id}`);
          setPayload(fallbackData);
          return;
        } catch {
          setPayload(null);
          return;
        }
      }

      setPayload(null);
    }
  }, [params.id]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    refreshProfile(token);

    if (!token) {
      setIsAuthorized(false);
      setCanEdit(false);
      return;
    }

    fetch(`${API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unauthorized");
        return response.json() as Promise<{ id: number }>;
      })
      .then((currentUser) => {
        setIsAuthorized(true);
        setCanEdit(String(currentUser.id) === String(params.id));
      })
      .catch(() => {
        setIsAuthorized(false);
        setCanEdit(false);
      });
  }, [params.id, refreshProfile]);

  useEffect(() => {
    setPortfolioPage(1);
    setMyAnnouncementsPage(1);
    setPublicAnnouncementsPage(1);
    setResponsesPage(1);
    setReviewsPage(1);
    setSubscriptionsPage(1);
    setSubscribersPage(1);
  }, [activeTab, params.id]);

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
      await refreshProfile(token);
    } catch {
      setPortfolioMessage("Ошибка сервера при добавлении записи.");
    }
  }

  function openPortfolioDeleteConfirm(itemId: number) {
    setPortfolioItemToDelete(itemId);
  }

  function closePortfolioDeleteConfirm() {
    if (portfolioDeleteSubmitting) return;
    setPortfolioItemToDelete(null);
  }

  async function confirmDeletePortfolioItem() {
    if (portfolioItemToDelete === null) return;
    const itemId = portfolioItemToDelete;
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setPortfolioMessage("Нужно войти в аккаунт.");
      setPortfolioItemToDelete(null);
      return;
    }
    setPortfolioDeleteSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/users/${params.id}/portfolio/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setPortfolioMessage(data?.message ?? "Не удалось удалить запись.");
        return;
      }
      setPortfolioMessage(data?.message ?? "Запись удалена.");
      setPortfolioItemToDelete(null);
      await refreshProfile(token);
    } catch {
      setPortfolioMessage("Ошибка сервера при удалении записи.");
    } finally {
      setPortfolioDeleteSubmitting(false);
    }
  }

  function openAvatarDeleteConfirm() {
    setAvatarDeleteError(null);
    setAvatarDeleteOpen(true);
  }

  function closeAvatarDeleteConfirm() {
    if (avatarDeleteSubmitting) return;
    setAvatarDeleteOpen(false);
    setAvatarDeleteError(null);
  }

  async function confirmDeleteAvatar() {
    setAvatarDeleteError(null);
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setAvatarDeleteError("Нужно войти в аккаунт.");
      return;
    }
    setAvatarDeleteSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/users/${params.id}/avatar`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setAvatarDeleteError(data?.message ?? "Не удалось удалить изображение.");
        return;
      }
      setAvatarDeleteOpen(false);
      await refreshProfile(token);
    } catch {
      setAvatarDeleteError("Ошибка сервера при удалении изображения.");
    } finally {
      setAvatarDeleteSubmitting(false);
    }
  }

  async function toggleFollow() {
    const token = localStorage.getItem("auth_token");
    if (!token || !payload || canEdit) return;
    setFollowLoading(true);
    setFollowMessage(null);
    try {
      const response = await fetch(`${API_URL}/users/${params.id}/follow`, {
        method: payload.is_following ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setFollowMessage(data?.message ?? "Не удалось изменить подписку.");
        return;
      }
      setFollowMessage(data?.message ?? "Готово.");
      await refreshProfile();
    } catch {
      setFollowMessage("Ошибка сервера при изменении подписки.");
    } finally {
      setFollowLoading(false);
    }
  }

  const achievementProgress = useMemo(() => {
    if (!payload) return { earned: 0, total: 0, percent: 0 };
    const earned = payload.user.achievements?.length ?? 0;
    const total = payload.all_achievements?.length ?? 0;
    const percent = total > 0 ? Math.round((earned / total) * 100) : 0;
    return { earned, total, percent };
  }, [payload]);
  const acceptedWorksCount = useMemo(() => {
    if (!payload) return 0;
    return (payload.my_responses ?? []).filter((response) => response.status === "Принято").length;
  }, [payload]);

  function paginate<T>(items: T[], page: number): T[] {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }

  function Pagination({
    page,
    total,
    onChange,
    positionClass,
  }: {
    page: number;
    total: number;
    onChange: (nextPage: number) => void;
    positionClass?: string;
  }) {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (totalPages <= 1) return null;
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return (
      <div className={`pagination ${positionClass ?? ""}`}>
        <nav>
          {pages.map((currentPage) =>
            currentPage === page ? (
              <span key={currentPage} aria-current="page">
                {currentPage}
              </span>
            ) : (
              <button key={currentPage} type="button" onClick={() => onChange(currentPage)}>
                {currentPage}
              </button>
            ),
          )}
        </nav>
      </div>
    );
  }

  function formatDuration(seconds?: number): string {
    if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
      return "--:--";
    }
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  function handlePortfolioAudioLoaded(itemId: number, durationSeconds: number) {
    setPortfolioDurations((previous) => ({
      ...previous,
      [itemId]: formatDuration(durationSeconds),
    }));
  }

  function togglePortfolioPlayback(itemId: number) {
    const targetAudio = portfolioAudioRefs.current[itemId];
    if (!targetAudio) return;

    Object.entries(portfolioAudioRefs.current).forEach(([id, audio]) => {
      if (!audio) return;
      if (Number(id) !== itemId) {
        audio.pause();
      }
    });

    if (targetAudio.paused) {
      void targetAudio.play().then(() => {
        setPlayingPortfolioItemId(itemId);
      }).catch(() => {
        setPlayingPortfolioItemId(null);
      });
      return;
    }

    targetAudio.pause();
    setPlayingPortfolioItemId(null);
  }

  function seekPortfolioItem(itemId: number, percentValue: number, shouldStartPlayback: boolean) {
    const targetAudio = portfolioAudioRefs.current[itemId];
    if (!targetAudio || !Number.isFinite(targetAudio.duration) || targetAudio.duration <= 0) return;

    Object.entries(portfolioAudioRefs.current).forEach(([id, audio]) => {
      if (!audio) return;
      if (Number(id) !== itemId) {
        audio.pause();
      }
    });

    const clampedPercent = Math.min(100, Math.max(0, percentValue));
    targetAudio.currentTime = targetAudio.duration * (clampedPercent / 100);
    setPortfolioProgress((previous) => ({ ...previous, [itemId]: clampedPercent }));

    if (targetAudio.paused && shouldStartPlayback) {
      void targetAudio
        .play()
        .then(() => {
          setPlayingPortfolioItemId(itemId);
        })
        .catch(() => {
          setPlayingPortfolioItemId(null);
        });
      return;
    }

    if (!targetAudio.paused) {
      setPlayingPortfolioItemId(itemId);
    }
  }

  if (!payload) {
    return <div className="profile-card">Загрузка профиля...</div>;
  }

  const userAchievementIds = new Set((payload.user.achievements ?? []).map((a) => a.id));

  return (
    <>
      <div className="profile-card">
        <div className="profile-page-heading">
          <h2 className="page-title">Профиль</h2>
          {canEdit ? (
            <div className="profile-head-toolbar" role="toolbar" aria-label="Действия с профилем">
              <Link
                href={`/users/${params.id}/edit`}
                className="profile-icon-link"
                title="Редактировать профиль"
                aria-label="Редактировать профиль"
              >
                <img src="/img/edit.svg" alt="" className="profile-icon-img profile-icon-img--rest" decoding="async" />
                <img src="/img/edit-hover.svg" alt="" className="profile-icon-img profile-icon-img--hover" decoding="async" />
              </Link>
              <Link
                href={`/users/${params.id}/security`}
                className="profile-icon-link"
                title="Безопасность аккаунта"
                aria-label="Безопасность аккаунта"
              >
                <img src="/img/settings.svg" alt="" className="profile-icon-img profile-icon-img--rest" decoding="async" />
                <img src="/img/settings-hover.svg" alt="" className="profile-icon-img profile-icon-img--hover" decoding="async" />
              </Link>
            </div>
          ) : isAuthorized ? (
            <div className="profile-head-toolbar profile-head-toolbar--follow" role="toolbar" aria-label="Подписка">
              {payload.is_following ? <span className="profile-follow-badge">Вы подписаны</span> : null}
              <button
                type="button"
                className="profile-icon-link profile-icon-link--follow"
                onClick={() => void toggleFollow()}
                disabled={followLoading}
                title={payload.is_following ? "Отписаться" : "Подписаться"}
                aria-label={payload.is_following ? "Отписаться от пользователя" : "Подписаться на пользователя"}
              >
                {payload.is_following ? (
                  <>
                    <img src="/img/unsubscribe.svg" alt="" className="profile-icon-img profile-icon-img--rest" decoding="async" />
                    <img src="/img/unsubscribe-hover.svg" alt="" className="profile-icon-img profile-icon-img--hover" decoding="async" />
                  </>
                ) : (
                  <>
                    <img src="/img/subscribe.svg" alt="" className="profile-icon-img profile-icon-img--rest" decoding="async" />
                    <img src="/img/subscribe-hover.svg" alt="" className="profile-icon-img profile-icon-img--hover" decoding="async" />
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
        {followMessage && !canEdit && isAuthorized ? (
          <p className="profile-follow-feedback" role="status">
            {followMessage}
          </p>
        ) : null}
        <div className="profile-card-head">
          
          <div className="profile-header">
            <div className="profile-avatar-wrap">
              {canEdit && hasCustomProfileAvatar(payload.user.avatar) ? (
                <button
                  type="button"
                  className="profile-avatar-remove"
                  onClick={openAvatarDeleteConfirm}
                  aria-label="Удалить фото профиля"
                  title="Удалить фото"
                >
                  ×
                </button>
              ) : null}
              <img
                src={
                  hasCustomProfileAvatar(payload.user.avatar)
                    ? (buildStorageUrl(`avatars/${payload.user.avatar}`) ?? "/img/default.png")
                    : "/img/default.png"
                }
                alt={payload.user.name ? `Аватар ${payload.user.name}` : "Аватар"}
                className="profile-avatar"
              />
            </div>
            <div className="profile-info">
              <p className="profile-name">{payload.user.name}</p>
              <div className="profile-meta-block">
                <div className="profile-meta-columns">
                  <div className="profile-meta-col">
                    <p>
                      <strong>Пол:</strong> {payload.user.gender ?? "—"}
                    </p>
                    <p>
                      <strong>Языки:</strong> {payload.user.language ?? "—"}
                    </p>
                    <p>
                      <strong>Тембр:</strong> {payload.user.timbre ?? "—"}
                    </p>
                  </div>
                  <div className="profile-meta-col">
                    <p>
                      <strong>На сайте:</strong> с {formatDate(payload.user.created_at)}
                    </p>
                    <p>
                      <strong>Выполненных работ:</strong> {acceptedWorksCount}
                    </p>
                  </div>
                </div>
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
              </div>
            </div>
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
            className={`profile-tab ${activeTab === "subscriptions" ? "active" : ""}`}
            onClick={() => setActiveTab("subscriptions")}
          >
            Подписки ({payload.subscriptions_count})
          </button>
          <button
            type="button"
            className={`profile-tab ${activeTab === "subscribers" ? "active" : ""}`}
            onClick={() => setActiveTab("subscribers")}
          >
            Подписчики ({payload.subscribers_count})
          </button>
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
              <div className="portfolio-form-input">
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
            <Pagination
              page={portfolioPage}
              total={(payload.user.portfolio_items ?? []).length}
              onChange={setPortfolioPage}
              positionClass="pagination-top"
            />
            {(payload.user.portfolio_items ?? []).length === 0 ? (
              <p className="profile-empty">Записей в портфолио пока нет.</p>
            ) : (
              paginate(payload.user.portfolio_items ?? [], portfolioPage).map((item) => (
                <div key={item.id} className="portfolio-item">
                  {canEdit ? (
                    <div className="portfolio-item-delete">
                      <button
                        type="button"
                        className="btn-delete-small"
                        title="Удалить запись"
                        onClick={() => openPortfolioDeleteConfirm(item.id)}
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                  <span className="portfolio-item-date">{formatDate(item.created_at)}</span>
                  <p className="portfolio-item-desc">{item.description || "—"}</p>
                  {item.audio_path ? (
                    <div className="portfolio-item-audio">
                      <audio
                        ref={(node) => {
                          portfolioAudioRefs.current[item.id] = node;
                        }}
                        preload="metadata"
                        src={buildStorageUrl(item.audio_path) ?? undefined}
                        onEnded={() => {
                          setPlayingPortfolioItemId((previous) => (previous === item.id ? null : previous));
                          setPortfolioProgress((previous) => ({ ...previous, [item.id]: 0 }));
                        }}
                        onTimeUpdate={(event) => {
                          const audio = event.currentTarget;
                          if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
                          if (isSeeking[item.id]) return;
                          const nextProgress = (audio.currentTime / audio.duration) * 100;
                          setPortfolioProgress((previous) => ({ ...previous, [item.id]: nextProgress }));
                        }}
                        onLoadedMetadata={(event) => {
                          handlePortfolioAudioLoaded(item.id, event.currentTarget.duration);
                        }}
                        className="portfolio-native-audio"
                      />
                      <div className="portfolio-audio-player">
                        <button
                          type="button"
                          className={`portfolio-audio-play ${playingPortfolioItemId === item.id ? "is-playing" : ""}`}
                          onClick={() => togglePortfolioPlayback(item.id)}
                          aria-label={playingPortfolioItemId === item.id ? "Пауза" : "Воспроизвести"}
                        >
                          {playingPortfolioItemId === item.id ? "❚❚" : "▶"}
                        </button>
                        <input
                          type="range"
                          className="portfolio-audio-seek"
                          min={0}
                          max={100}
                          step={0.1}
                          value={portfolioProgress[item.id] ?? 0}
                          onMouseDown={() => {
                            setIsSeeking((previous) => ({ ...previous, [item.id]: true }));
                          }}
                          onTouchStart={() => {
                            setIsSeeking((previous) => ({ ...previous, [item.id]: true }));
                          }}
                          onInput={(event) => {
                            const percent = Number(event.currentTarget.value);
                            seekPortfolioItem(item.id, percent, false);
                          }}
                          onChange={(event) => {
                            const percent = Number(event.currentTarget.value);
                            setIsSeeking((previous) => ({ ...previous, [item.id]: false }));
                            seekPortfolioItem(item.id, percent, true);
                          }}
                        />
                        <span className="portfolio-audio-duration">{portfolioDurations[item.id] ?? "--:--"}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
            <Pagination
              page={portfolioPage}
              total={(payload.user.portfolio_items ?? []).length}
              onChange={setPortfolioPage}
              positionClass="pagination-bottom"
            />
          </div>
        </div>

        {canEdit ? (
          <div className={`profile-tab-content ${activeTab === "my-announcements" ? "active" : ""}`}>
            <div className="my-announcements-list">
              <Pagination
                page={myAnnouncementsPage}
                total={payload.my_announcements.length}
                onChange={setMyAnnouncementsPage}
                positionClass="pagination-top"
              />
              {payload.my_announcements.length === 0 ? (
                <p className="profile-empty">Объявлений пока нет.</p>
              ) : (
                paginate(payload.my_announcements, myAnnouncementsPage).map((announcement) => (
                  <div key={announcement.id} className="my-announcement-item">
                    <div className="my-announcement-top">
                      <Link className="my-announcement-title" href={`/announcements/${announcement.id}`}>
                        {announcement.title}
                      </Link>
                      <div className="my-announcement-top-aside">
                        <span className="my-announcement-date">{formatDate(announcement.created_at)}</span>
                      </div>
                    </div>
                    <div className="my-announcement-meta">
                      <span className="my-announcement-status">Статус: {announcement.status}</span>
                      {isProfileAnnouncementClosed(announcement) ? (
                          <span
                            className="announcement-edit-warning my-announcement-closed-badge"
                            role="status"
                          >
                            Закрыто
                          </span>
                        ) : null}
                    </div>
                    <div className="my-announcement-desc">{announcement.description ?? ""}</div>
                  </div>
                ))
              )}
              <Pagination
                page={myAnnouncementsPage}
                total={payload.my_announcements.length}
                onChange={setMyAnnouncementsPage}
                positionClass="pagination-bottom"
              />
            </div>
          </div>
        ) : null}

        {canEdit ? (
          <div className={`profile-tab-content ${activeTab === "my-responses" ? "active" : ""}`}>
            <div className="my-announcements-list">
              <Pagination
                page={responsesPage}
                total={payload.my_responses.length}
                onChange={setResponsesPage}
                positionClass="pagination-top"
              />
              {payload.my_responses.length === 0 ? (
                <p className="profile-empty">Откликов пока нет.</p>
              ) : (
                paginate(payload.my_responses, responsesPage).map((response) => (
                  <div key={response.id} className="my-announcement-item">
                    <div className="my-announcement-top">
                      {response.announcement ? (
                        <Link className="my-announcement-title" href={`/announcements/${response.announcement.id}`}>
                          {response.announcement.title}
                        </Link>
                      ) : (
                        <span className="my-announcement-title">Объявление недоступно</span>
                      )}
                      <div className="my-announcement-top-aside">
                        <span className="my-announcement-date">{formatDate(response.created_at)}</span>
                      </div>
                    </div>
                    <div className="my-announcement-meta">
                      <span className="my-announcement-status">Статус отклика: {response.status}</span>
                      {response.announcement && isProfileAnnouncementClosed(response.announcement) ? (
                          <span
                            className="announcement-edit-warning my-announcement-closed-badge"
                            role="status"
                          >
                            Закрыто
                          </span>
                        ) : null}
                    </div>
                    {response.announcement?.status !== "Одобрено" ? (
                      <div className="my-announcement-desc">
                        Объявление снято с публикации. Откликнуться повторно нельзя.
                      </div>
                    ) : null}
                  </div>
                ))
              )}
              <Pagination
                page={responsesPage}
                total={payload.my_responses.length}
                onChange={setResponsesPage}
                positionClass="pagination-bottom"
              />
            </div>
          </div>
        ) : (
          <div className={`profile-tab-content ${activeTab === "announcements" ? "active" : ""}`}>
            <div className="my-announcements-list">
              <Pagination
                page={publicAnnouncementsPage}
                total={payload.public_announcements.length}
                onChange={setPublicAnnouncementsPage}
                positionClass="pagination-top"
              />
              {payload.public_announcements.length === 0 ? (
                <p className="profile-empty">Объявлений пока нет.</p>
              ) : (
                paginate(payload.public_announcements, publicAnnouncementsPage).map((announcement) => (
                  <div key={announcement.id} className="my-announcement-item">
                    <div className="my-announcement-top">
                      <Link className="my-announcement-title" href={`/announcements/${announcement.id}`}>
                        {announcement.title}
                      </Link>
                      <div className="my-announcement-top-aside">
                        <span className="my-announcement-date">{formatDate(announcement.created_at)}</span>
                      </div>
                    </div>
                    <div className="my-announcement-meta">
                      <span className="my-announcement-status">Статус: {announcement.status}</span>
                      {isProfileAnnouncementClosed(announcement) ? (
                          <span
                            className="announcement-edit-warning my-announcement-closed-badge"
                            role="status"
                          >
                            Закрыто
                          </span>
                        ) : null}
                    </div>
                    <div className="my-announcement-desc">{announcement.description ?? ""}</div>
                  </div>
                ))
              )}
              <Pagination
                page={publicAnnouncementsPage}
                total={payload.public_announcements.length}
                onChange={setPublicAnnouncementsPage}
                positionClass="pagination-bottom"
              />
            </div>
          </div>
        )}

        <div className={`profile-tab-content ${activeTab === "subscriptions" ? "active" : ""}`}>
          <div className="my-announcements-list">
            <Pagination
              page={subscriptionsPage}
              total={payload.subscriptions.length}
              onChange={setSubscriptionsPage}
              positionClass="pagination-top"
            />
            {payload.subscriptions.length === 0 ? (
              <p className="profile-empty">Подписок пока нет.</p>
            ) : (
              paginate(payload.subscriptions, subscriptionsPage).map((subscription) => (
                <div key={subscription.id} className="my-announcement-item">
                  <div className="my-announcement-top">
                    {subscription.avatar ? (
                      <img
                        src={buildStorageUrl(`avatars/${subscription.avatar}`) ?? "/img/default.png"}
                        alt={subscription.name ? `Аватар ${subscription.name}` : "Аватар"}
                        className="review-avatar"
                      />
                    ) : (
                      <img src="/img/default.png" alt="Аватар по умолчанию" className="review-avatar" />
                    )}
                    <Link className="my-announcement-title" href={`/users/${subscription.id}`}>
                      {subscription.name}
                    </Link>
                  </div>
                </div>
              ))
            )}
            <Pagination
              page={subscriptionsPage}
              total={payload.subscriptions.length}
              onChange={setSubscriptionsPage}
              positionClass="pagination-bottom"
            />
          </div>
        </div>

        <div className={`profile-tab-content ${activeTab === "subscribers" ? "active" : ""}`}>
          <div className="my-announcements-list">
            <Pagination
              page={subscribersPage}
              total={payload.subscribers.length}
              onChange={setSubscribersPage}
              positionClass="pagination-top"
            />
            {payload.subscribers.length === 0 ? (
              <p className="profile-empty">Подписчиков пока нет.</p>
            ) : (
              paginate(payload.subscribers, subscribersPage).map((subscriber) => (
                <div key={subscriber.id} className="my-announcement-item">
                  <div className="my-announcement-top">
                    {subscriber.avatar ? (
                      <img
                        src={buildStorageUrl(`avatars/${subscriber.avatar}`) ?? "/img/default.png"}
                        alt={subscriber.name ? `Аватар ${subscriber.name}` : "Аватар"}
                        className="review-avatar"
                      />
                    ) : (
                      <img src="/img/default.png" alt="Аватар по умолчанию" className="review-avatar" />
                    )}
                    <Link className="my-announcement-title" href={`/users/${subscriber.id}`}>
                      {subscriber.name}
                    </Link>
                  </div>
                </div>
              ))
            )}
            <Pagination
              page={subscribersPage}
              total={payload.subscribers.length}
              onChange={setSubscribersPage}
              positionClass="pagination-bottom"
            />
          </div>
        </div>

        <div className={`profile-tab-content ${activeTab === "reviews" ? "active" : ""}`}>
          <div className="reviews-list">
            <Pagination
              page={reviewsPage}
              total={(payload.user.reviews_received ?? []).length}
              onChange={setReviewsPage}
              positionClass="pagination-top"
            />
            {(payload.user.reviews_received ?? []).length === 0 ? (
              <p className="profile-empty">Отзывов пока нет.</p>
            ) : (
              paginate(payload.user.reviews_received ?? [], reviewsPage).map((review) => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <div className="review-user">
                      {review.reviewer?.avatar ? (
                        <img
                          src={buildStorageUrl(`avatars/${review.reviewer.avatar}`) ?? "/img/default.png"}
                          alt={review.reviewer?.name ? `Аватар ${review.reviewer.name}` : "Аватар автора отзыва"}
                          className="review-avatar"
                        />
                      ) : (
                        <img src="/img/default.png" alt="Аватар по умолчанию" className="review-avatar" />
                      )}
                      <div className="review-meta">
                        {review.reviewer?.id ? (
                          <Link className="review-author review-author-link" href={`/users/${review.reviewer.id}`}>
                            {review.reviewer?.name ?? "Пользователь"}
                          </Link>
                        ) : (
                          <span className="review-author">{review.reviewer?.name ?? "Пользователь"}</span>
                        )}
                        <span className="review-date">{formatDate(review.created_at)}</span>
                      </div>
                    </div>
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
                  <p className="review-message">{review.message}</p>
                </div>
              ))
            )}
            <Pagination
              page={reviewsPage}
              total={(payload.user.reviews_received ?? []).length}
              onChange={setReviewsPage}
              positionClass="pagination-bottom"
            />
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
                        src={`${API_URL?.replace(/\/api\/?$/, "")}/images/achievements/${achievement.icon}`}
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

      {portfolioItemToDelete !== null ? (
        <div
          className="modal modal-open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-portfolio-title"
        >
          <div className="modal-backdrop" onClick={closePortfolioDeleteConfirm} />
          <div className="modal-box">
            <div className="modal-header">
              <h3 id="delete-portfolio-title">Удаление записи</h3>
              <button
                type="button"
                className="modal-close"
                onClick={closePortfolioDeleteConfirm}
                disabled={portfolioDeleteSubmitting}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-delete-announce-title" style={{ marginBottom: 0 }}>
                Вы уверены, что хотите удалить запись?
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={closePortfolioDeleteConfirm}
                disabled={portfolioDeleteSubmitting}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={() => void confirmDeletePortfolioItem()}
                disabled={portfolioDeleteSubmitting}
              >
                {portfolioDeleteSubmitting ? "Удаление…" : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {avatarDeleteOpen ? (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="delete-avatar-title">
          <div className="modal-backdrop" onClick={closeAvatarDeleteConfirm} />
          <div className="modal-box">
            <div className="modal-header">
              <h3 id="delete-avatar-title">Удаление изображения</h3>
              <button
                type="button"
                className="modal-close"
                onClick={closeAvatarDeleteConfirm}
                disabled={avatarDeleteSubmitting}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-delete-announce-title" style={{ marginBottom: 0 }}>
                Вы уверены, что хотите удалить изображение?
              </p>
              {avatarDeleteError ? (
                <p className="modal-delete-error" style={{ marginTop: 12, marginBottom: 0 }}>
                  {avatarDeleteError}
                </p>
              ) : null}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={closeAvatarDeleteConfirm}
                disabled={avatarDeleteSubmitting}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={() => void confirmDeleteAvatar()}
                disabled={avatarDeleteSubmitting}
              >
                {avatarDeleteSubmitting ? "Удаление…" : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
