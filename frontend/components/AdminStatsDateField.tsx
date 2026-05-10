"use client";

import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) return null;
  return d;
}

function monthIndex(y: number, month: number): number {
  return y * 12 + month;
}

function inRange(ymd: string, min?: string, max?: string): boolean {
  if (min && ymd < min) return false;
  if (max && ymd > max) return false;
  return true;
}

type AdminStatsDateFieldProps = {
  id?: string;
  value: string;
  onChange: (ymd: string) => void;
  min?: string;
  max?: string;
};

export default function AdminStatsDateField({ id, value, onChange, min, max }: AdminStatsDateFieldProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const parsed = parseYmd(value);
  const base = parsed ?? new Date();

  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());

  useEffect(() => {
    if (!open) return;
    const p = parseYmd(value);
    if (p) {
      setViewYear(p.getFullYear());
      setViewMonth(p.getMonth());
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const n = wrapRef.current;
      if (n && !n.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const minDate = min ? parseYmd(min) : null;
  const maxDate = max ? parseYmd(max) : null;
  const minIdx = minDate ? monthIndex(minDate.getFullYear(), minDate.getMonth()) : -Infinity;
  const maxIdx = maxDate ? monthIndex(maxDate.getFullYear(), maxDate.getMonth()) : Infinity;
  const curIdx = monthIndex(viewYear, viewMonth);
  const canPrev = curIdx > minIdx;
  const canNext = curIdx < maxIdx;

  function goPrev() {
    if (!canPrev) return;
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNext() {
    if (!canNext) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const first = new Date(viewYear, viewMonth, 1);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: { day: number; ymd: string; disabled: boolean; isSelected: boolean }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(viewYear, viewMonth, d);
    const ymd = toYmd(dt);
    cells.push({
      day: d,
      ymd,
      disabled: !inRange(ymd, min, max),
      isSelected: ymd === value,
    });
  }

  const label = parsed
    ? parsed.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : value;

  const monthTitle = new Date(viewYear, viewMonth, 1).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="admin-stats-date-field" ref={wrapRef}>
      <button
        type="button"
        id={id}
        className="admin-stats-date-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="admin-stats-date-trigger-text">{label}</span>
        <span className="admin-stats-date-trigger-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className="admin-stats-date-popover" role="dialog" aria-label="Выбор даты">
          <div className="admin-stats-date-popover-head">
            <button
              type="button"
              className="admin-stats-date-nav"
              onClick={goPrev}
              disabled={!canPrev}
              aria-label="Предыдущий месяц"
            >
              ‹
            </button>
            <span className="admin-stats-date-month-title">{monthTitle}</span>
            <button
              type="button"
              className="admin-stats-date-nav"
              onClick={goNext}
              disabled={!canNext}
              aria-label="Следующий месяц"
            >
              ›
            </button>
          </div>
          <div className="admin-stats-date-weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w} className="admin-stats-date-weekday">
                {w}
              </span>
            ))}
          </div>
          <div className="admin-stats-date-grid">
            {Array.from({ length: startPad }).map((_, i) => (
              <span key={`pad-${i}`} className="admin-stats-date-pad" aria-hidden />
            ))}
            {cells.map((c) => (
              <button
                key={c.ymd}
                type="button"
                disabled={c.disabled}
                className={`admin-stats-date-cell${c.isSelected ? " is-selected" : ""}${c.disabled ? " is-disabled" : ""}`}
                onClick={() => {
                  if (c.disabled) return;
                  onChange(c.ymd);
                  setOpen(false);
                }}
              >
                {c.day}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
