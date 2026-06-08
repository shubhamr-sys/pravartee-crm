"use client";

import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export function InfoIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface TooltipProps {
  content: ReactNode;
  ariaLabel?: string;
  children?: ReactNode;
  /** Preferred placement relative to the trigger */
  placement?: "top" | "bottom";
  className?: string;
}

function supportsHover() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function Tooltip({
  content,
  ariaLabel = "More information",
  children,
  placement = "bottom",
  className = "",
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  function openTooltip() {
    setOpen(true);
  }

  function closeTooltip() {
    setOpen(false);
  }

  function toggleTooltip() {
    setOpen((current) => !current);
  }

  const positionClass =
    placement === "top"
      ? "bottom-full mb-2 origin-bottom"
      : "top-full mt-2 origin-top";

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={toggleTooltip}
        onMouseEnter={() => {
          if (supportsHover()) openTooltip();
        }}
        onMouseLeave={() => {
          if (supportsHover()) closeTooltip();
        }}
        onFocus={openTooltip}
        onBlur={(event) => {
          if (!containerRef.current?.contains(event.relatedTarget as Node)) {
            closeTooltip();
          }
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
      >
        {children ?? <InfoIcon />}
      </button>

      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute left-0 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-lg ${positionClass}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
