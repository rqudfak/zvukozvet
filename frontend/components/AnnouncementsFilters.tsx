"use client";

import Link from "next/link";

type Genre = {
  id: number;
  name: string;
};

type AnnouncementsFiltersProps = {
  genres: Genre[];
  typeBookChecked: boolean;
  typeGameChecked: boolean;
  selectedGenres: string[];
  selectedGenders: string[];
  selectedSearch: string;
};

export default function AnnouncementsFilters({
  genres,
  typeBookChecked,
  typeGameChecked,
  selectedGenres,
  selectedGenders,
  selectedSearch,
}: AnnouncementsFiltersProps) {
  function submitCurrentForm(target: EventTarget & HTMLInputElement) {
    target.form?.requestSubmit();
  }

  return (
    <form method="GET" action="/" id="filters-form">
      <div className="filter-section">
        <h3 className="filter-title">Тип</h3>
        <div className="filter-tags">
          <label className="filter-tag">
            <input
              type="checkbox"
              name="types[]"
              value="Книга"
              defaultChecked={typeBookChecked}
              onChange={(event) => submitCurrentForm(event.currentTarget)}
            />
            <span>Книга</span>
          </label>
          <label className="filter-tag">
            <input
              type="checkbox"
              name="types[]"
              value="Видеоигра"
              defaultChecked={typeGameChecked}
              onChange={(event) => submitCurrentForm(event.currentTarget)}
            />
            <span>Видеоигра</span>
          </label>
        </div>
      </div>

      <div className="filter-divider"></div>

      <div className="filter-section">
        <h3 className="filter-title">Жанр</h3>
        <div className="filter-tags filter-tags-grid">
          {genres.map((genre) => (
            <label key={genre.id} className="filter-tag">
              <input
                type="checkbox"
                name="genres[]"
                value={genre.name}
                defaultChecked={selectedGenres.includes(genre.name)}
                onChange={(event) => submitCurrentForm(event.currentTarget)}
              />
              <span>{genre.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-divider"></div>

      <div className="filter-section">
        <h3 className="filter-title">Голос озвучивания</h3>
        <div className="filter-tags">
          <label className="filter-tag">
            <input
              type="checkbox"
              name="genders[]"
              value="Мужской"
              defaultChecked={selectedGenders.includes("Мужской")}
              onChange={(event) => submitCurrentForm(event.currentTarget)}
            />
            <span>Мужской</span>
          </label>
          <label className="filter-tag">
            <input
              type="checkbox"
              name="genders[]"
              value="Женский"
              defaultChecked={selectedGenders.includes("Женский")}
              onChange={(event) => submitCurrentForm(event.currentTarget)}
            />
            <span>Женский</span>
          </label>
          <label className="filter-tag">
            <input
              type="checkbox"
              name="genders[]"
              value="Детский"
              defaultChecked={selectedGenders.includes("Детский")}
              onChange={(event) => submitCurrentForm(event.currentTarget)}
            />
            <span>Детский</span>
          </label>
        </div>
      </div>

      <div className="filter-divider"></div>

      <div className="filter-section">
        <h3 className="filter-title">Поиск</h3>
        <input
          type="text"
          name="search"
          defaultValue={selectedSearch}
          placeholder="Поиск по названию"
          className="filter-search-input"
        />
      </div>

      <div className="filter-actions">
        <button className="btn-submit" type="submit">
          Найти
        </button>
        <Link href="/" className="btn-switch">
          Сброс
        </Link>
      </div>
    </form>
  );
}
