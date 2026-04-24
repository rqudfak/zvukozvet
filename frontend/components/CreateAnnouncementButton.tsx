"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

export default function CreateAnnouncementButton() {
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    fetch(`${API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Unauthorized");
        setIsAuthorized(true);
      })
      .catch(() => {
        localStorage.removeItem("auth_token");
        setIsAuthorized(false);
      });
  }, []);

  if (!isAuthorized) return null;

  return (
    <Link href="/announcements/create" className="btn-submit">
      Создать объявление
    </Link>
  );
}
