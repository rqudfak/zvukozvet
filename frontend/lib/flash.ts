const SUCCESS_FLASH_KEY = "success_flash_message";

export function setSuccessFlash(message: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SUCCESS_FLASH_KEY, message);
}

export function consumeSuccessFlash(): string | null {
  if (typeof window === "undefined") return null;
  const message = sessionStorage.getItem(SUCCESS_FLASH_KEY);
  if (message) {
    sessionStorage.removeItem(SUCCESS_FLASH_KEY);
  }
  return message;
}
