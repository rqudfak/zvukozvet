import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { buildGenreIconUrl } from "@/lib/media";
import CreateAnnouncementButton from "@/components/CreateAnnouncementButton";
import AnnouncementsFilters from "@/components/AnnouncementsFilters";

type Announcement = {
  id: number;
  title: string;
  type: string;
  genre: string;
  color: string;
  genre_icon?: string | null;
  languages: string;
  gender: string;
  duration: string;
  description: string;
  created_at: string;
};

type Genre = { id: number; name: string; type: string };

type ApiPagination<T> = {
  data: T[];
  current_page: number;
  last_page: number;
};

function valueToArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  const resolved = (await searchParams) ?? {};
  Object.entries(resolved).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
      return;
    }

    if (value) params.set(key, value);
  });

  const [announcements, genres] = await Promise.all([
    fetchApi<ApiPagination<Announcement>>(`/announcements?${params.toString()}`),
    fetchApi<{ all: Genre[] }>("/genres"),
  ]);
  const selectedTypes = [
    ...valueToArray(resolved.types as string | string[] | undefined),
    ...valueToArray(resolved["types[]"] as string | string[] | undefined),
  ];
  const selectedGenres = [
    ...valueToArray(resolved.genres as string | string[] | undefined),
    ...valueToArray(resolved["genres[]"] as string | string[] | undefined),
  ];
  const bookGenreNames = genres.all
    .filter((genre) => genre.type === "Книга")
    .map((genre) => genre.name);
  const gameGenreNames = genres.all
    .filter((genre) => genre.type === "Видеоигра")
    .map((genre) => genre.name);
  const typeBookChecked =
    selectedTypes.includes("Книга") || selectedGenres.some((genre) => bookGenreNames.includes(genre));
  const typeGameChecked =
    selectedTypes.includes("Видеоигра") ||
    selectedGenres.some((genre) => gameGenreNames.includes(genre));
  const selectedGenders = Array.from(
    new Set(
      [
        ...valueToArray(resolved.gender as string | string[] | undefined),
        ...valueToArray(resolved["genders[]"] as string | string[] | undefined),
      ].filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  );
  const selectedSearch = (resolved.search as string) ?? "";

  return (
    <>
      <div className="announcements-header">
        <h2>Доска объявлений</h2>
        {announcements.last_page > 1 ? (
          <div className="pagination pagination-top">
            <nav>
              {Array.from({ length: announcements.last_page }, (_, i) => i + 1).map((page) => {
                const pageParams = new URLSearchParams(params.toString());
                if (page === 1) pageParams.delete("page");
                else pageParams.set("page", String(page));

                return page === announcements.current_page ? (
                  <span key={page} aria-current="page">
                    {page}
                  </span>
                ) : (
                  <Link key={page} href={`/?${pageParams.toString()}`}>
                    {page}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}

        <CreateAnnouncementButton />
      </div>

      <div className="announcements-main">
        <div className="filters-container">
          <AnnouncementsFilters
            key={params.toString()}
            genres={genres.all}
            typeBookChecked={typeBookChecked}
            typeGameChecked={typeGameChecked}
            selectedGenres={selectedGenres}
            selectedGenders={selectedGenders}
            selectedSearch={selectedSearch}
          />
        </div>

        <div className="announcements-grid">
          {announcements.data.length === 0 ? (
            <p className="no-announcements">Объявлений пока нет.</p>
          ) : (
            announcements.data.map((announcement) => (
              <div
                key={announcement.id}
                className="announcement-card"
                style={{ ["--genre-color" as string]: announcement.color }}
              >
                <div className="announcement-title-row">
                  <h3 className="announcement-title">
                    <Link href={`/announcements/${announcement.id}`}>
                      {announcement.title}
                    </Link>
                  </h3>
                  <span className="announcement-date">{formatDate(announcement.created_at)}</span>
                </div>

                <div className="announcement-type-genre-section">
                  <div className="genre-icon-container" style={{ backgroundColor: announcement.color }}>
                    {announcement.genre_icon ? (
                      <img
                        src={buildGenreIconUrl(announcement.genre_icon) ?? undefined}
                        alt={announcement.genre}
                        className="genre-icon"
                        data-hide-on-error
                      />
                    ) : null}
                  </div>
                  <div className="type-genre-info">
                    <div className="type-row">
                      <span className="type-label">Тип:</span>
                      <span className="type-value">{announcement.type}</span>
                    </div>
                    <div className="genre-row">
                      <span className="genre-label">Жанр:</span>
                      <span className="genre-value">{announcement.genre}</span>
                    </div>
                  </div>
                </div>

                <div className="announcement-details">
                  <div className="detail-item">
                    <span className="detail-label">Языки:</span>
                    <span className="detail-value">{announcement.languages}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Голос озвучивания:</span>
                    <span className="detail-value">{announcement.gender}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Срок:</span>
                    <span className="detail-value">{announcement.duration}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Описание:</span>
                    <span className="detail-value">{announcement.description.slice(0, 100)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {announcements.last_page > 1 ? (
        <div className="pagination pagination-bottom">
          <nav>
            {Array.from({ length: announcements.last_page }, (_, i) => i + 1).map((page) => {
              const pageParams = new URLSearchParams(params.toString());
              if (page === 1) pageParams.delete("page");
              else pageParams.set("page", String(page));

              return page === announcements.current_page ? (
                <span key={page} aria-current="page">
                  {page}
                </span>
              ) : (
                <Link key={page} href={`/?${pageParams.toString()}`}>
                  {page}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </>
  );
}
