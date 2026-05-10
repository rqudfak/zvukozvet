import Link from "next/link";
import AdminStatsDashboard from "@/components/AdminStatsDashboard";

export default function AdminPage() {
  return (
    <>
      <div className="admin-header">
        <div className="admin-tabs">
          <Link href="/admin" className="admin-tab admin-tab-active">
            Статистика
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
        <h2>Статистика</h2>
      </div>

      <AdminStatsDashboard />
    </>
  );
}
