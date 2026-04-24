"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { consumeSuccessFlash } from "@/lib/flash";

export default function FlashSuccess() {
  const pathname = usePathname();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const value = consumeSuccessFlash();
      setMessage(value);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!message) return null;

  return <div className="alert alert-success">{message}</div>;
}
