"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "@/lib/api";
import { emitSuccessToast } from "@/lib/flash";

type UserRow = {
  id: number;
  login: string;
  name: string;
  email: string;
  announcements_count: number;
  role?: string;
  banned_until?: string | null;
};

const BAN_DURATION_OPTIONS = [
  { value: "1", label: "1 день" },
  { value: "7", label: "7 дней" },
  { value: "30", label: "30 дней" },
] as const;

type ColumnKey = "id" | "login" | "name" | "email" | "announcements_count" | "blocking";
type SortDirection = "asc" | "desc";
type ColumnFilters = Record<ColumnKey, string[] | null>;

/** Блокировка действует только пока banned_until в будущем (совпадает с логикой backend User::isBanned). */
function isBanCurrentlyActive(user: UserRow): boolean {
  if (!user.banned_until) return false;
  return new Date(user.banned_until).getTime() > Date.now();
}

function getBlockingLabel(user: UserRow): string {
  if (user.role === "admin") return "Администратор";
  if (isBanCurrentlyActive(user)) {
    return `Заблокирован до ${new Date(user.banned_until!).toLocaleString("ru-RU")}`;
  }
  return "Не заблокирован";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [banUserId, setBanUserId] = useState<number | null>(null);
  const [durationDays, setDurationDays] = useState("1");
  const [banReason, setBanReason] = useState("");
  const [banDurationMenuOpen, setBanDurationMenuOpen] = useState(false);
  const banDurationMenuRef = useRef<HTMLDivElement | null>(null);

  const [sortField, setSortField] = useState<ColumnKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    id: null,
    login: null,
    name: null,
    email: null,
    announcements_count: null,
    blocking: null,
  });
  const [activeFilterColumn, setActiveFilterColumn] = useState<ColumnKey | null>(null);
  const [draftSortDirection, setDraftSortDirection] = useState<SortDirection | null>(null);
  const [draftSearch, setDraftSearch] = useState("");
  const [draftSelection, setDraftSelection] = useState<string[]>([]);
  const filterMenuRef = useRef<HTMLTableCellElement | null>(null);

  async function loadData() {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const response = await fetch(`${API_URL}/admin/users?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const payload = (await response.json()) as { data: UserRow[]; current_page?: number; last_page?: number };
    setUsers(payload.data ?? []);
    setPage(payload.current_page ?? 1);
    setLastPage(payload.last_page ?? 1);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [page]);

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (!activeFilterColumn) return;
      if (!filterMenuRef.current) return;
      if (filterMenuRef.current.contains(event.target as Node)) return;
      setActiveFilterColumn(null);
    }

    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [activeFilterColumn]);

  useEffect(() => {
    if (!banDurationMenuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const node = banDurationMenuRef.current;
      if (node && !node.contains(event.target as Node)) {
        setBanDurationMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setBanDurationMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [banDurationMenuOpen]);

  function getColumnValue(item: UserRow, key: ColumnKey): string {
    switch (key) {
      case "id":
        return String(item.id);
      case "login":
        return item.login;
      case "name":
        return item.name;
      case "email":
        return item.email;
      case "announcements_count":
        return String(item.announcements_count);
      case "blocking":
        return getBlockingLabel(item);
      default:
        return "";
    }
  }

  const columnValues = useMemo<Record<ColumnKey, string[]>>(() => {
    const collect = (key: ColumnKey) =>
      Array.from(new Set(users.map((item) => getColumnValue(item, key)).filter(Boolean))).sort((a, b) =>
        key === "id" || key === "announcements_count"
          ? Number(a) - Number(b)
          : a.localeCompare(b, "ru"),
      );
    return {
      id: collect("id"),
      login: collect("login"),
      name: collect("name"),
      email: collect("email"),
      announcements_count: collect("announcements_count"),
      blocking: collect("blocking"),
    };
  }, [users]);

  const displayedUsers = useMemo(() => {
    const filtered = users.filter((item) =>
      (Object.keys(columnFilters) as ColumnKey[]).every((key) => {
        const selected = columnFilters[key];
        if (!selected || selected.length === 0) return true;
        return selected.includes(getColumnValue(item, key));
      }),
    );

    if (!sortField) return filtered;

    return [...filtered].sort((left, right) => {
      if (sortField === "id") {
        const cmp = left.id - right.id;
        return sortDirection === "asc" ? cmp : -cmp;
      }
      if (sortField === "announcements_count") {
        const cmp = left.announcements_count - right.announcements_count;
        return sortDirection === "asc" ? cmp : -cmp;
      }
      const a = getColumnValue(left, sortField);
      const b = getColumnValue(right, sortField);
      const compare = a.localeCompare(b, "ru");
      return sortDirection === "asc" ? compare : -compare;
    });
  }, [users, columnFilters, sortField, sortDirection]);

  const hasActiveFilters = useMemo(
    () => (Object.keys(columnFilters) as ColumnKey[]).some((key) => (columnFilters[key]?.length ?? 0) > 0),
    [columnFilters],
  );

  function openFilterMenu(column: ColumnKey) {
    const allValues = columnValues[column];
    const selected = columnFilters[column] ?? allValues;
    setActiveFilterColumn(column);
    setDraftSelection([...selected]);
    setDraftSortDirection(sortField === column ? sortDirection : null);
    setDraftSearch("");
  }

  function applyFilterMenu() {
    if (!activeFilterColumn) return;
    const column = activeFilterColumn;
    const allValues = columnValues[column];
    const nextSelection = draftSelection.length === allValues.length ? null : [...draftSelection];

    setColumnFilters((previous) => ({
      ...previous,
      [column]: nextSelection,
    }));

    if (draftSortDirection) {
      setSortField(column);
      setSortDirection(draftSortDirection);
    } else if (sortField === column) {
      setSortField(null);
    }

    setActiveFilterColumn(null);
  }

  function resetSortAndFilters() {
    setSortField(null);
    setSortDirection("asc");
    setColumnFilters({
      id: null,
      login: null,
      name: null,
      email: null,
      announcements_count: null,
      blocking: null,
    });
    setActiveFilterColumn(null);
  }

  function renderHeaderCell(label: string, key: ColumnKey) {
    const isActive = activeFilterColumn === key;
    const values = columnValues[key];
    const visibleValues = values.filter((value) => value.toLowerCase().includes(draftSearch.toLowerCase()));
    const allChecked = values.length > 0 && draftSelection.length === values.length;
    const isFiltered = (columnFilters[key]?.length ?? 0) > 0;
    const isSorted = sortField === key;
    const filterMenuRight = key === "id" || key === "login";

    return (
      <th
        key={key}
        ref={isActive ? filterMenuRef : undefined}
        className={`admin-table-header-cell${filterMenuRight ? " admin-table-header-cell--filter-menu-right" : ""}`}
      >
        <button
          type="button"
          className={`admin-header-trigger ${isFiltered || isSorted ? "active" : ""}`}
          aria-label={`Фильтр по полю ${label}`}
          onClick={(event) => {
            event.stopPropagation();
            if (isActive) {
              setActiveFilterColumn(null);
              return;
            }
            openFilterMenu(key);
          }}
        >
          <span>{label}</span>
          <span className="admin-filter-trigger">▼</span>
        </button>

        {isActive ? (
          <div className="admin-filter-menu" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className={`admin-filter-menu-action ${draftSortDirection === "asc" ? "active" : ""}`}
              onClick={() => setDraftSortDirection("asc")}
            >
              Сортировка от А до Я
            </button>
            <button
              type="button"
              className={`admin-filter-menu-action ${draftSortDirection === "desc" ? "active" : ""}`}
              onClick={() => setDraftSortDirection("desc")}
            >
              Сортировка от Я до А
            </button>

            <div className="admin-filter-menu-section-title">Текстовые фильтры</div>
            <input
              className="admin-filter-search"
              type="text"
              placeholder="Поиск"
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
            />

            <div className="admin-filter-checkboxes">
              <label className="admin-filter-checkbox">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setDraftSelection([...values]);
                    } else {
                      setDraftSelection([]);
                    }
                  }}
                />
                (выделить все)
              </label>
              {visibleValues.map((value) => (
                <label key={value} className="admin-filter-checkbox">
                  <input
                    type="checkbox"
                    checked={draftSelection.includes(value)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setDraftSelection((previous) => Array.from(new Set([...previous, value])));
                      } else {
                        setDraftSelection((previous) => previous.filter((item) => item !== value));
                      }
                    }}
                  />
                  {value}
                </label>
              ))}
            </div>

            <div className="admin-filter-menu-footer">
              <button type="button" className="btn-submit" onClick={applyFilterMenu}>
                ОК
              </button>
              <button type="button" className="btn-cancel" onClick={() => setActiveFilterColumn(null)}>
                Отмена
              </button>
            </div>
          </div>
        ) : null}
      </th>
    );
  }

  function Pagination() {
    if (lastPage <= 1) return null;
    if (hasActiveFilters && displayedUsers.length < 10) return null;
    const pages = Array.from({ length: lastPage }, (_, i) => i + 1);
    return (
      <div className="pagination">
        <nav>
          {pages.map((currentPage) =>
            currentPage === page ? (
              <span key={currentPage} aria-current="page">
                {currentPage}
              </span>
            ) : (
              <button key={currentPage} type="button" onClick={() => setPage(currentPage)}>
                {currentPage}
              </button>
            ),
          )}
        </nav>
      </div>
    );
  }

  async function submitBan() {
    if (!banUserId || !banReason.trim()) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const response = await fetch(`${API_URL}/admin/users/${banUserId}/ban`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ duration_days: durationDays, ban_reason: banReason }),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      window.alert(payload.message ?? "Не удалось заблокировать пользователя.");
      return;
    }
    emitSuccessToast(payload.message ?? "Пользователь заблокирован");
    setBanDurationMenuOpen(false);
    setBanUserId(null);
    setBanReason("");
    setDurationDays("1");
    await loadData();
  }

  return (
    <>
      <div className="admin-header">
        <div className="admin-tabs">
          <Link href="/admin" className="admin-tab">
            Статистика
          </Link>
          <Link href="/admin/genres" className="admin-tab">
            Жанры
          </Link>
          <Link href="/admin/announcements" className="admin-tab">
            Объявления
          </Link>
          <Link href="/admin/users" className="admin-tab admin-tab-active">
            Пользователи
          </Link>
        </div>
        <h2>Пользователи</h2>
      </div>
      <div className="admin-table-container">
        <div className="admin-table-toolbar">
          <Pagination />
          <button type="button" className="btn-reset-filters" onClick={resetSortAndFilters}>
            Сбросить сортировку и фильтры
          </button>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              {renderHeaderCell("ID", "id")}
              {renderHeaderCell("Логин", "login")}
              {renderHeaderCell("Имя", "name")}
              {renderHeaderCell("Почта", "email")}
              {renderHeaderCell("Объявлений", "announcements_count")}
              {renderHeaderCell("Блокировка", "blocking")}
            </tr>
          </thead>
          <tbody>
            {displayedUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>
                  <Link href={`/users/${user.id}`}>{user.login}</Link>
                </td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.announcements_count}</td>
                <td>
                  {user.role === "admin" ? (
                    <span className="admin-badge">Админ</span>
                  ) : isBanCurrentlyActive(user) ? (
                    <span>до {new Date(user.banned_until!).toLocaleString("ru-RU")}</span>
                  ) : (
                    <button
                      type="button"
                      className="btn-ban-open"
                      title="Забанить"
                      aria-label="Забанить"
                      onClick={() => {
                        setBanDurationMenuOpen(false);
                        setBanUserId(user.id);
                      }}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination />
      </div>

      {banUserId ? (
        <div id="ban-modal" className="modal modal-open" aria-hidden="false">
          <div
            className="modal-backdrop"
            onClick={() => {
              setBanDurationMenuOpen(false);
              setBanUserId(null);
            }}
          />
          <div className="modal-box">
            <div className="modal-header">
              <h3>Забанить пользователя</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setBanDurationMenuOpen(false);
                  setBanUserId(null);
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="ban_duration_days">Срок блокировки</label>
                <div className="ban-duration-dropdown" ref={banDurationMenuRef}>
                  <button
                    type="button"
                    id="ban_duration_days"
                    className="ban-duration-dropdown-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={banDurationMenuOpen}
                    onClick={() => setBanDurationMenuOpen((previous) => !previous)}
                  >
                    <span>
                      {BAN_DURATION_OPTIONS.find((option) => option.value === durationDays)?.label ?? durationDays}
                    </span>
                    <span className="ban-duration-dropdown-chevron" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  {banDurationMenuOpen ? (
                    <ul className="ban-duration-dropdown-menu" role="listbox">
                      {BAN_DURATION_OPTIONS.map((option) => (
                        <li
                          key={option.value}
                          role="option"
                          aria-selected={durationDays === option.value}
                          className={durationDays === option.value ? "is-active" : undefined}
                          onClick={() => {
                            setDurationDays(option.value);
                            setBanDurationMenuOpen(false);
                          }}
                        >
                          {option.label}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="ban_reason">Причина блокировки</label>
                <textarea
                  id="ban_reason"
                  rows={3}
                  required
                  maxLength={1000}
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setBanDurationMenuOpen(false);
                  setBanUserId(null);
                }}
              >
                Отмена
              </button>
              <button type="button" className="btn-submit" onClick={submitBan}>
                Забанить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
