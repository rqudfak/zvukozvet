 "use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_URL, fetchApi } from "@/lib/api";
import { buildGenreIconUrl, buildStorageUrl } from "@/lib/media";
import { setSuccessFlash } from "@/lib/flash";

type Announcement = {
  id: number;
  title: string;
  type: string;
  genre: string;
  color?: string;
  genre_icon?: string | null;
  languages: string;
  gender: string;
  duration: string;
  description: string;
  fragment: string;
  created_at: string;
  user_id?: number;
  user?: { id: number; name: string };
};

type ResponseItem = {
  id: number;
  user_id: number;
  message?: string | null;
  audio_path: string;
  status: string;
  user?: { id: number; name: string };
};

type CurrentUser = { id: number; role?: string };
type ExistingReview = { id: number; message: string; rating: number; reviewed_user_id: number };

const RESPONSE_STATUSES = ["Не проверено", "На рассмотрении", "Принято", "Отклонено"];

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export default function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [userResponse, setUserResponse] = useState<ResponseItem | null>(null);
  const [acceptedResponseId, setAcceptedResponseId] = useState<number | null>(null);
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null);
  const [message, setMessage] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [responseError, setResponseError] = useState<string | null>(null);

  useEffect(() => {
    params.then(async ({ id }) => {
      const token = localStorage.getItem("auth_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      try {
        const payload = await fetchApi<{
          announcement: Announcement;
          responses: ResponseItem[];
          user_response: ResponseItem | null;
          accepted_response_id?: number | null;
          existing_review?: ExistingReview | null;
          response_statuses?: string[];
        }>(`/announcements/${id}`, { headers });
        setAnnouncement(payload.announcement);
        setResponses(payload.responses ?? []);
        setUserResponse(payload.user_response ?? null);
        setAcceptedResponseId(payload.accepted_response_id ?? null);
        setExistingReview(payload.existing_review ?? null);

        if (token) {
          const meResponse = await fetch(`${API_URL}/user`, { headers: { Authorization: `Bearer ${token}` } });
          if (meResponse.ok) {
            const me = (await meResponse.json()) as CurrentUser;
            setCurrentUser(me);
            setCanEdit(me.id === payload.announcement.user_id && (payload.accepted_response_id ?? null) === null);
          }
        }
      } catch {
        setPageError("Не удалось загрузить объявление.");
      }
    });
  }, [params]);

  async function refreshAnnouncement() {
    const id = announcement?.id;
    if (!id) return;
    const token = localStorage.getItem("auth_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const payload = await fetchApi<{
      announcement: Announcement;
      responses: ResponseItem[];
      user_response: ResponseItem | null;
      accepted_response_id?: number | null;
      existing_review?: ExistingReview | null;
    }>(`/announcements/${id}`, { headers });
    setAnnouncement(payload.announcement);
    setResponses(payload.responses ?? []);
    setUserResponse(payload.user_response ?? null);
    setAcceptedResponseId(payload.accepted_response_id ?? null);
    setExistingReview(payload.existing_review ?? null);
  }

  async function submitResponse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!announcement || !audioFile) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const formData = new FormData();
    formData.append("message", message);
    formData.append("audio", audioFile);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/announcements/${announcement.id}/responses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        setResponseError(payload?.message ?? "Не удалось отправить отклик.");
        return;
      }
      setMessage("");
      setAudioFile(null);
      setResponseError(null);
      setSuccessFlash("Отклик отправлен");
      await refreshAnnouncement();
    } finally {
      setLoading(false);
    }
  }

  async function deleteMyResponse(responseId: number) {
    if (!announcement) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const response = await fetch(`${API_URL}/announcements/${announcement.id}/responses/${responseId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) {
      setResponseError(payload?.message ?? "Не удалось удалить отклик.");
      return;
    }
    setResponseError(null);
    setSuccessFlash("Отклик удалён");
    await refreshAnnouncement();
  }

  async function updateResponseStatus(responseId: number, status: string) {
    if (!announcement) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    await fetch(`${API_URL}/announcements/${announcement.id}/responses/${responseId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    setSuccessFlash("Статус отклика обновлён");
    await refreshAnnouncement();
  }

  async function submitReview() {
    if (!announcement || !reviewMessage.trim()) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const response = await fetch(`${API_URL}/reviews`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        announcement_id: announcement.id,
        message: reviewMessage,
        rating: Number(reviewRating),
      }),
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) {
      setResponseError(payload?.message ?? "Не удалось оставить отзыв.");
      return;
    }
    setReviewMessage("");
    setReviewRating("5");
    setSuccessFlash(payload?.message ?? "Отзыв добавлен");
    await refreshAnnouncement();
  }

  async function deleteReview(reviewId: number) {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    if (!response.ok) return;
    setSuccessFlash(payload?.message ?? "Отзыв удалён");
    await refreshAnnouncement();
  }

  if (!announcement) {
    return <div className="announcement-detail">Загрузка объявления...</div>;
  }

  const isAuthor = currentUser?.id === announcement.user_id;
  const isAuthorized = Boolean(currentUser);
  const hasAcceptedResponse = acceptedResponseId !== null;

  return (
    <>
      <div className="announcement-detail">
        <div
          className="announcement-detail-header"
          style={{ borderLeft: `4px solid ${announcement.color ?? "#504E76"}` }}
        >
          <div className="announcement-detail-meta">
            <div>
              <span className="announcement-type">{announcement.type}</span>{" "}
              <span className="announcement-genre">{announcement.genre}</span>
            </div>
          </div>

          {canEdit ? (
            <div className="announcement-actions">
              <Link
                href={`/announcements/${announcement.id}/edit`}
                className="announcement-action-icon announcement-action-icon--edit"
                aria-label="Редактировать объявление"
                title="Редактировать"
              />
              <button
                type="button"
                className="announcement-action-icon announcement-action-icon--delete"
                aria-label="Удалить объявление"
                title="Удалить"
              />
            </div>
          ) : null}
        </div>
        {isAuthor && hasAcceptedResponse ? (
          <p style={{ marginTop: 8 }}>Редактирование недоступно: по объявлению уже принят отклик.</p>
        ) : null}

        <h1 className="announcement-detail-title">{announcement.title}</h1>

        <div className="announcement-detail-info">
          <div className="info-item">
            <strong>Автор:</strong>{" "}
            {announcement.user?.id ? (
              <Link href={`/users/${announcement.user.id}`}>{announcement.user?.name ?? "Неизвестно"}</Link>
            ) : (
              announcement.user?.name ?? "Неизвестно"
            )}
          </div>
          <div className="info-item">
            <strong>Дата создания:</strong> {formatDateTime(announcement.created_at)}
          </div>
          <div className="info-item">
            <strong>Языки:</strong> {announcement.languages}
          </div>
          <div className="info-item">
            <strong>Голос озвучивания:</strong> {announcement.gender}
          </div>
          <div className="info-item">
            <strong>Срок:</strong> {announcement.duration}
          </div>
        </div>

        <div className="announcement-detail-description">
          <h3>Описание</h3>
          <div style={{ whiteSpace: "pre-line" }}>{announcement.description}</div>
        </div>

        <div className="announcement-detail-fragment">
          <h3>Текст для озвучивания</h3>
          <div style={{ whiteSpace: "pre-line" }}>{announcement.fragment}</div>
        </div>

        <div className="announcement-detail-footer">
          <Link href="/" className="btn-back">
            ← Назад к списку
          </Link>
        </div>
      </div>

      {pageError ? <div className="announcement-detail">{pageError}</div> : null}

      {!isAuthorized ? (
        <div className="announcement-detail" style={{ marginTop: 25, marginBottom: 30 }}>
          Чтобы откликнуться на объявление, пожалуйста, <Link href="/auth/login"><span className="announcement-detail-link">войдите</span></Link> или{" "}
          <Link href="/auth/register"><span className="announcement-detail-link">зарегистрируйтесь</span></Link>.
        </div>
      ) : null}

      {isAuthorized && !isAuthor ? (
        <div className="announcement-detail" style={{ marginTop: 25, marginBottom: 30 }}>
          <h3>Отклик на объявление</h3>
          {userResponse ? (
            <>
              <p>
                <strong>Ваш текущий отклик:</strong>
              </p>
              <div className="response-item">
                {userResponse.message ? <p>{userResponse.message}</p> : null}
                <audio controls src={buildStorageUrl(userResponse.audio_path) ?? undefined} />
                <p>Статус: {userResponse.status}</p>
                {userResponse.status !== "Принято" ? (
                  <button
                    type="button"
                    className="btn-submit"
                    style={{ marginTop: 10 }}
                    onClick={() => deleteMyResponse(userResponse.id)}
                  >
                    Удалить отклик
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <form className="announcement-form" style={{ marginTop: 15 }} onSubmit={submitResponse}>
              {responseError ? <p className="error">{responseError}</p> : null}
              <div className="form-group">
                <label htmlFor="message">Сообщение (необязательно)</label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  placeholder="Напишите сопроводительное сообщение (по желанию)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="audio">Аудиофайл (обязательно)</label>
                <input
                  type="file"
                  id="audio"
                  name="audio"
                  accept="audio/*"
                  required
                  onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-submit" disabled={!audioFile || loading}>
                  Откликнуться
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {isAuthor ? (
        <div className="announcement-detail" style={{ marginTop: 25, marginBottom: 30 }}>
          <h3>Отклики пользователей ({responses.length})</h3>
          {responses.length ? (
            responses.map((response) => (
              <div key={response.id} className="response-item">
                <p>
                  <strong>
                    <Link href={`/users/${response.user?.id}`}>{response.user?.name ?? "Пользователь"}</Link>
                  </strong>
                </p>
                {response.message ? <p>{response.message}</p> : null}
                <audio controls src={buildStorageUrl(response.audio_path) ?? undefined} />
                <div className="response-status-form" style={{ marginTop: 8 }}>
                  <label>
                    Статус:{" "}
                    <select
                      value={response.status}
                      onChange={(e) => updateResponseStatus(response.id, e.target.value)}
                    >
                      {RESPONSE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {response.status === "Принято" && acceptedResponseId === response.id ? (
                  existingReview ? (
                    <div
                      className="review-existing"
                      style={{ marginTop: 12, padding: 12, background: "#f9f9f9", borderRadius: 6 }}
                    >
                      <strong>Ваш отзыв:</strong> {existingReview.message}
                      <span className="review-rating">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <span key={i} className={`review-star ${i <= existingReview.rating ? "filled" : ""}`}>
                            ★
                          </span>
                        ))}
                      </span>
                      <button
                        type="button"
                        className="btn-submit"
                        style={{ padding: "4px 12px", fontSize: 12, marginLeft: 12 }}
                        onClick={() => deleteReview(existingReview.id)}
                      >
                        Удалить отзыв
                      </button>
                    </div>
                  ) : (
                    <div className="review-form-wrap" style={{ marginTop: 12 }}>
                      <strong>Оставить отзыв пользователю {response.user?.name ?? "пользователь"}</strong>
                      <div className="announcement-form" style={{ marginTop: 8 }}>
                        <div className="form-group">
                          <label htmlFor="review_message">Сообщение</label>
                          <textarea
                            id="review_message"
                            rows={3}
                            required
                            value={reviewMessage}
                            onChange={(e) => setReviewMessage(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="review_rating">Рейтинг (звёзды)</label>
                          <select
                            id="review_rating"
                            value={reviewRating}
                            onChange={(e) => setReviewRating(e.target.value)}
                          >
                            {[1, 2, 3, 4, 5].map((i) => (
                              <option key={i} value={i}>
                                {i} ★
                              </option>
                            ))}
                          </select>
                        </div>
                        <button type="button" className="btn-submit" onClick={submitReview}>
                          Отправить отзыв
                        </button>
                      </div>
                    </div>
                  )
                ) : null}
              </div>
            ))
          ) : (
            <p>Откликов пока нет.</p>
          )}
        </div>
      ) : null}
    </>
  );
}
