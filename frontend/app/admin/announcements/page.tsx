"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "@/lib/api";

type Announcement = {
  id: number;
  title: string;
  type: string;
  genre: string;
  status: string;
  user?: { id: number; name: string };
};

type ColumnKey = "title" | "type" | "genre" | "status" | "author";
type SortDirection = "asc" | "desc";
type ColumnFilters = Record<ColumnKey, string[] | null>;

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [sortField, setSortField] = useState<ColumnKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    title: null,
    type: null,
    genre: null,
    status: null,
    author: null,
  });
  const [activeFilterColumn, setActiveFilterColumn] = useState<ColumnKey | null>(null);
  const [draftSortDirection, setDraftSortDirection] = useState<SortDirection | null>(null);
  const [draftSearch, setDraftSearch] = useState("");
  const [draftSelection, setDraftSelection] = useState<string[]>([]);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  async function loadData() {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const response = await fetch(`${API_URL}/admin/announcements?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      items: { data: Announcement[]; current_page?: number; last_page?: number };
      statuses: string[];
    };
    setItems(payload.items.data ?? []);
    setStatuses(payload.statuses ?? []);
    setPage(payload.items.current_page ?? 1);
    setLastPage(payload.items.last_page ?? 1);
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

  function getColumnValue(item: Announcement, key: ColumnKey): string {
    switch (key) {
      case "title":
        return item.title;
      case "type":
        return item.type;
      case "genre":
        return item.genre;
      case "status":
        return item.status;
      case "author":
        return item.user?.name ?? "—";
      default:
        return "";
    }
  }

  const columnValues = useMemo<Record<ColumnKey, string[]>>(() => {
    const collect = (key: ColumnKey) =>
      Array.from(new Set(items.map((item) => getColumnValue(item, key)).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "ru"),
      );
    return {
      title: collect("title"),
      type: collect("type"),
      genre: collect("genre"),
      status: collect("status"),
      author: collect("author"),
    };
  }, [items]);

  const displayedItems = useMemo(() => {
    const filtered = items.filter((item) =>
      (Object.keys(columnFilters) as ColumnKey[]).every((key) => {
        const selected = columnFilters[key];
        if (!selected || selected.length === 0) return true;
        return selected.includes(getColumnValue(item, key));
      }),
    );

    if (!sortField) return filtered;

    return [...filtered].sort((left, right) => {
      const a = getColumnValue(left, sortField);
      const b = getColumnValue(right, sortField);
      const compare = a.localeCompare(b, "ru");
      return sortDirection === "asc" ? compare : -compare;
    });
  }, [items, columnFilters, sortField, sortDirection]);

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
      title: null,
      type: null,
      genre: null,
      status: null,
      author: null,
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

    return (
      <th key={key} className="admin-table-header-cell">
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
          <div className="admin-filter-menu" ref={filterMenuRef} onClick={(event) => event.stopPropagation()}>
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
    if (hasActiveFilters && displayedItems.length < 10) return null;
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

  async function updateStatus(id: number, status: string) {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    await fetch(`${API_URL}/admin/announcements/${id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadData();
  }

  async function deleteAnnouncement(id: number) {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    await fetch(`${API_URL}/admin/announcements/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadData();
  }

  return (
    <>
      <div className="admin-header">
        <h2>Объявления</h2>
        <div className="admin-tabs">
          <Link href="/admin" className="admin-tab">
            Главная админки
          </Link>
          <Link href="/admin/genres" className="admin-tab">
            Жанры
          </Link>
          <Link href="/admin/announcements" className="admin-tab admin-tab-active">
            Объявления
          </Link>
          <Link href="/admin/users" className="admin-tab">
            Пользователи
          </Link>
        </div>
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
              {renderHeaderCell("Название", "title")}
              {renderHeaderCell("Тип", "type")}
              {renderHeaderCell("Жанр", "genre")}
              {renderHeaderCell("Статус", "status")}
              {renderHeaderCell("Автор", "author")}
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {displayedItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={`/announcements/${item.id}`}>{item.title}</Link>
                </td>
                <td>{item.type}</td>
                <td>{item.genre}</td>
                <td>
                  <select value={item.status} onChange={(e) => updateStatus(item.id, e.target.value)}>
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  {item.user?.id ? <Link href={`/users/${item.user.id}`}>{item.user.name}</Link> : "—"}
                </td>
                <td className="genre-actions-cell">
                  <button
                    type="button"
                    className="genre-action-btn genre-action-btn-delete"
                    title="Удалить"
                    aria-label="Удалить"
                    onClick={() => deleteAnnouncement(item.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination />
      </div>
    </>
  );
}
