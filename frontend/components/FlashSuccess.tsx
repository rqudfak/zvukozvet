"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { consumeSuccessFlash, SUCCESS_TOAST_EVENT } from "@/lib/flash";

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

  useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (detail?.message) {
        setMessage(detail.message);
      }
    }
    window.addEventListener(SUCCESS_TOAST_EVENT, onToast);
    return () => window.removeEventListener(SUCCESS_TOAST_EVENT, onToast);
  }, []);

  if (!message) return null;

  return <div className="alert alert-success">{message}</div>;
}
