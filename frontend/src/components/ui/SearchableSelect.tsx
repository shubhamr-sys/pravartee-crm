"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  emptyLabel?: string;
  labelClassName?: string;
  inputClassName?: string;
  canCreate?: boolean;
  createLabel?: (search: string) => string;
  onCreateRequest?: (search: string) => void;
  /** Shown when value is set but not yet present in options (e.g. after inline create). */
  valueLabel?: string;
  /** Called when the dropdown is opened — use to lazy-load options. */
  onOpen?: () => void;
  isLoading?: boolean;
}

const defaultInputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";

export default function SearchableSelect({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  placeholder = "Search...",
  emptyLabel = "Select an option",
  labelClassName = "mb-1 block text-xs font-medium text-slate-600",
  inputClassName = defaultInputClass,
  canCreate = false,
  createLabel,
  onCreateRequest,
  valueLabel,
  onOpen,
  isLoading = false,
}: SearchableSelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? valueLabel ?? "";

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = normalizedSearch
    ? options.filter((option) =>
        option.label.toLowerCase().includes(normalizedSearch),
      )
    : options;

  const exactMatch = normalizedSearch
    ? options.some((option) => option.label.toLowerCase() === normalizedSearch)
    : false;

  const showCreate =
    canCreate &&
    normalizedSearch.length > 0 &&
    !exactMatch &&
    Boolean(onCreateRequest);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
    setSearch("");
  }

  function handleCreateClick() {
    if (!onCreateRequest || !search.trim()) return;
    onCreateRequest(search.trim());
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={fieldId} className={labelClassName}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        ref={inputRef}
        id={fieldId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        disabled={disabled}
        required={required && !value}
        className={`${inputClassName} ${disabled ? "cursor-not-allowed bg-slate-100" : ""}`}
        value={open ? search : selectedLabel}
        placeholder={disabled ? emptyLabel : open ? placeholder : selectedLabel || emptyLabel}
        onFocus={() => {
          if (disabled) return;
          onOpen?.();
          setOpen(true);
          setSearch(selectedLabel);
        }}
        onChange={(event) => {
          setSearch(event.target.value);
          if (!open) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setSearch("");
            inputRef.current?.blur();
          }
        }}
      />
      {open && !disabled && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {isLoading && (
            <li className="px-3 py-2 text-sm text-slate-500">Loading...</li>
          )}
          {!isLoading && filtered.length === 0 && !showCreate && (
            <li className="px-3 py-2 text-sm text-slate-500">No matches found</li>
          )}
          {!isLoading &&
            filtered.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-teal-50 ${
                  option.value === value
                    ? "bg-teal-50 font-medium text-teal-800"
                    : "text-slate-700"
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            </li>
          ))}
          {!isLoading && showCreate && (
            <li className="border-t border-slate-100">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm font-medium text-teal-700 hover:bg-teal-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleCreateClick}
              >
                {createLabel
                  ? createLabel(search.trim())
                  : `Add "${search.trim()}"`}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
