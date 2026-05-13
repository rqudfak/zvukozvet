"use client";

import { useEffect, useRef, useState } from "react";

type StatusDropdownProps = {
  id?: string;
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  /** Подпись в кнопке, когда value пустая строка (например «Выберите жанр»). */
  emptyLabel?: string;
  /** Человекочитаемые подписи для значений option (например hex цвета → «Оранжевый»). */
  optionLabels?: Record<string, string>;
};

function displayOption(option: string, optionLabels?: Record<string, string>): string {
  return optionLabels?.[option] ?? option;
}

export default function StatusDropdown({
  id,
  value,
  options,
  onChange,
  disabled,
  className,
  emptyLabel,
  optionLabels,
}: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const node = ref.current;
      if (node && !node.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`status-dropdown ${className ?? ""}`.trim()} ref={ref}>
      <button
        type="button"
        id={id}
        className="status-dropdown-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) {
            setOpen((previous) => !previous);
          }
        }}
      >
        <span className={`status-dropdown-value${value === "" && emptyLabel ? " is-placeholder" : ""}`}>
          {value !== "" ? displayOption(value, optionLabels) : (emptyLabel ?? "")}
        </span>
        <span className="status-dropdown-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <ul
          className="status-dropdown-menu"
          role="listbox"
          onMouseDown={(event) => event.stopPropagation()}
        >
          {options.map((option) => (
            <li
              key={option}
              role="option"
              aria-selected={value === option}
              className={value === option ? "is-selected" : undefined}
              onClick={(event) => {
                event.stopPropagation();
                onChange(option);
                setOpen(false);
              }}
            >
              {displayOption(option, optionLabels)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
