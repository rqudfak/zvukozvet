const SUCCESS_FLASH_KEY = "success_flash_message";

/** Событие для показа alert-success без смены маршрута (например, действия в админке). */
export const SUCCESS_TOAST_EVENT = "app-success-toast";

export function setSuccessFlash(message: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SUCCESS_FLASH_KEY, message);
}

export function emitSuccessToast(message: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SUCCESS_TOAST_EVENT, { detail: { message } }));
}

export function consumeSuccessFlash(): string | null {
  if (typeof window === "undefined") return null;
  const message = sessionStorage.getItem(SUCCESS_FLASH_KEY);
  if (message) {
    sessionStorage.removeItem(SUCCESS_FLASH_KEY);
  }
  return message;
}
