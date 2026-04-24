import Link from "next/link";

export default function AdminPage() {
  return (
    <>
      <div className="admin-header">
        <h2>Админ-панель</h2>
      </div>
      <div className="admin-tabs">
        <Link href="/admin" className="admin-tab admin-tab-active">
          Главная админки
        </Link>
        <Link href="/admin/genres" className="admin-tab">
          Жанры
        </Link>
        <Link href="/admin/announcements" className="admin-tab">
          Объявления
        </Link>
        <Link href="/admin/users" className="admin-tab">
          Пользователи
        </Link>
      </div>
      <div className="admin-dashboard-info">
        <p>Выберите раздел выше для управления жанрами, объявлениями или пользователями.</p>
      </div>
      <div className="admin-footer">
        <Link href="/" className="btn-back">
          ← Назад на главную
        </Link>
      </div>
    </>
  );
}
