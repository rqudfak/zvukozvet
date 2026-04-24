"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    fetch(`${API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unauthorized");
        }
        return response.json() as Promise<{ id: number }>;
      })
      .then((user) => {
        router.replace(`/users/${user.id}`);
      })
      .catch(() => {
        localStorage.removeItem("auth_token");
        router.replace("/auth/login");
      });
  }, [router]);

  return <div className="profile-card">Загрузка профиля...</div>;
}
