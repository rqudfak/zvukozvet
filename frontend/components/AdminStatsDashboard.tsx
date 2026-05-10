"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { API_URL } from "@/lib/api";
import AdminStatsDateField, { toYmd } from "@/components/AdminStatsDateField";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ArcElement);

const COLORS = {
  primary: "#504E76",
  accent: "#F1642E",
  lavender: "#C4C3E3",
  muted: "#8B87B8",
};

const CHART_FONT = { family: "'Nunito', sans-serif", size: 13 } as const;

export type StatsPayload = {
  period: {
    preset: string;
    from: string;
    to: string;
    from_date: string;
    to_date: string;
  };
  users_total: number;
  users_registered_in_period: number;
  announcements_total: number;
  announcements_completed: number;
  announcements_uncompleted: number;
  top_genres: { genre: string; count: number }[];
};

export default function AdminStatsDashboard() {
  const [preset, setPreset] = useState<"week" | "month" | "year" | "custom">("month");
  const [customFrom, setCustomFrom] = useState(() => {
    const t = new Date();
    t.setDate(t.getDate() - 30);
    return toYmd(t);
  });
  const [customTo, setCustomTo] = useState(() => toYmd(new Date()));

  const [data, setData] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setError("Требуется вход");
      setLoading(false);
      return;
    }

    let url = `${API_URL}/admin/statistics?preset=${preset}`;
    if (preset === "custom") {
      url += `&from=${encodeURIComponent(customFrom)}&to=${encodeURIComponent(customTo)}`;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (res.status === 401 || res.status === 403) {
        setError("Нет доступа к статистике");
        setData(null);
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        setError(typeof j.message === "string" ? j.message : "Не удалось загрузить статистику");
        setData(null);
        return;
      }
      const json = (await res.json()) as StatsPayload;
      setData(json);
    } catch {
      setError("Ошибка сети");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const doughnutData = useMemo(() => {
    if (!data) return null;
    const done = data.announcements_completed;
    const pending = data.announcements_uncompleted;
    if (data.announcements_total === 0) {
      return null;
    }
    return {
      labels: ["С принятым откликом", "Без принятого отклика"],
      datasets: [
        {
          data: [done, pending],
          backgroundColor: [COLORS.accent, COLORS.lavender],
          borderWidth: 2,
          borderColor: "#fff",
        },
      ],
    };
  }, [data]);

  const doughnutOptions = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "58%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: COLORS.primary,
            padding: 16,
            font: { family: "Nunito, sans-serif", size: 13 },
          },
        },
      },
    }),
    []
  );

  const barData = useMemo(() => {
    if (!data || data.top_genres.length === 0) {
      return null;
    }
    return {
      labels: data.top_genres.map((g) => g.genre),
      datasets: [
        {
          label: "Объявлений",
          data: data.top_genres.map((g) => g.count),
          backgroundColor: data.top_genres.map((_, i) =>
            i % 2 === 0 ? COLORS.accent : COLORS.lavender
          ),
          borderRadius: 6,
        },
      ],
    };
  }, [data]);

  const barOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: COLORS.muted, font: { ...CHART_FONT } },
          grid: { color: "rgba(80, 78, 118, 0.08)" },
        },
        y: {
          ticks: { color: COLORS.primary, font: { ...CHART_FONT } },
          grid: { display: false },
        },
      },
    }),
    []
  );

  const todayStr = toYmd(new Date());

  return (
    <div className="admin-stats">
      <div className="admin-stats-toolbar">
        <div className="admin-stats-presets">
          {(
            [
              ["week", "Неделя"],
              ["month", "Месяц"],
              ["year", "Год"],
              ["custom", "Свой период"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`admin-stats-preset ${preset === key ? "admin-stats-preset-active" : ""}`}
              onClick={() => setPreset(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="admin-stats-custom-range">
            <label>
              С
              <AdminStatsDateField value={customFrom} max={customTo} onChange={setCustomFrom} />
            </label>
            <label>
              По
              <AdminStatsDateField
                value={customTo}
                min={customFrom}
                max={todayStr}
                onChange={setCustomTo}
              />
            </label>
          </div>
        )}
      </div>

      {error && <p className="admin-stats-error">{error}</p>}
      {loading && <p className="admin-stats-loading">Загрузка…</p>}

      {!loading && data && (
        <>
          <p className="admin-stats-period-caption">
            Период:{" "}
            <strong>
              {new Date(data.period.from).toLocaleDateString("ru-RU")} —{" "}
              {new Date(data.period.to).toLocaleDateString("ru-RU")}
            </strong>
          </p>

          <div className="admin-stats-kpi">
            <div className="admin-stats-kpi-card">
              <span className="admin-stats-kpi-label">Пользователей на сайте</span>
              <span className="admin-stats-kpi-value">{data.users_total}</span>
              <span className="admin-stats-kpi-hint">
                новых за период: {data.users_registered_in_period}
              </span>
            </div>
            <div className="admin-stats-kpi-card">
              <span className="admin-stats-kpi-label">Объявлений за период</span>
              <span className="admin-stats-kpi-value">{data.announcements_total}</span>
            </div>
            <div className="admin-stats-kpi-card">
              <span className="admin-stats-kpi-label">С принятым откликом</span>
              <span className="admin-stats-kpi-value accent">{data.announcements_completed}</span>
            </div>
            <div className="admin-stats-kpi-card">
              <span className="admin-stats-kpi-label">Без принятого отклика</span>
              <span className="admin-stats-kpi-value">{data.announcements_uncompleted}</span>
            </div>
          </div>

          <div className="admin-stats-charts">
            <div className="admin-stats-chart-card">
              <h3>Выполненные и невыполненные объявления</h3>
              <p className="admin-stats-chart-note">
                «Выполнено» – есть отклик со статусом «Принято». Остальные объявления за период
                считаются без принятого отклика.
              </p>
              <div className="admin-stats-chart-wrap admin-stats-chart-wrap-doughnut">
                {doughnutData ? (
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                ) : (
                  <p className="admin-stats-empty">За выбранный период нет объявлений.</p>
                )}
              </div>
            </div>
            <div className="admin-stats-chart-card">
              <h3>Популярные жанры</h3>
              <p className="admin-stats-chart-note">
                По числу объявлений, созданных в выбранном периоде.
              </p>
              <div className="admin-stats-chart-wrap admin-stats-chart-wrap-bar">
                {barData ? (
                  <Bar data={barData} options={barOptions} />
                ) : (
                  <p className="admin-stats-empty">
                    Нет данных по жанрам за этот период (или жанр не указан в объявлениях).
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
