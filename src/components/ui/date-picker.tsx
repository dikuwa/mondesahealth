"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isValid,
  parse,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { cn } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";

type Props = {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  ariaLabel?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
};
const months = Array.from({ length: 12 }, (_, month) => ({
  value: String(month),
  label: format(new Date(2026, month, 1), "MMMM"),
}));

export function DatePicker({
  value,
  onChange,
  name,
  id,
  ariaLabel,
  placeholder = "DD/MM/YYYY",
  min,
  max,
  disabled,
  className,
}: Props) {
  const selected = value ? parseISO(value) : null;
  const [open, setOpen] = useState(false),
    [month, setMonth] = useState(startOfMonth(selected || new Date())),
    [typed, setTyped] = useState(
      selected ? format(selected, "dd/MM/yyyy") : "",
    );
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    setTyped(selected ? format(selected, "dd/MM/yyyy") : "");
    if (selected) setMonth(startOfMonth(selected));
  }, [value]);
  const days = useMemo(() => {
    const start = startOfMonth(month);
    return [
      ...Array.from({ length: (getDay(start) + 6) % 7 }, () => null),
      ...eachDayOfInterval({ start, end: endOfMonth(month) }),
    ];
  }, [month]);
  const minimum = min ? parseISO(min) : null,
    maximum = max ? parseISO(max) : null;
  const minYear = minimum?.getFullYear() ?? 1900,
    maxYear = maximum?.getFullYear() ?? new Date().getFullYear() + 10;
  const years = useMemo(
    () =>
      Array.from({ length: Math.max(1, maxYear - minYear + 1) }, (_, index) => {
        const year = maxYear - index;
        return { value: String(year), label: String(year) };
      }),
    [minYear, maxYear],
  );
  function allowed(day: Date) {
    return !(minimum && day < minimum) && !(maximum && day > maximum);
  }
  function choose(day: Date) {
    if (!allowed(day)) return;
    onChange(format(day, "yyyy-MM-dd"));
    setOpen(false);
  }
  function typeDate(raw: string) {
    let next = raw.replace(/[^\d/]/g, "").slice(0, 10);
    if (!next.includes("/")) {
      const digits = next.replace(/\D/g, "");
      next = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
        .filter(Boolean)
        .join("/");
    }
    setTyped(next);
    if (!next) {
      onChange("");
      return;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(next)) {
      const parsed = parse(next, "dd/MM/yyyy", new Date());
      if (
        isValid(parsed) &&
        format(parsed, "dd/MM/yyyy") === next &&
        allowed(parsed)
      ) {
        onChange(format(parsed, "yyyy-MM-dd"));
        setMonth(startOfMonth(parsed));
        setOpen(false);
      }
    }
  }
  const typedComplete = /^\d{2}\/\d{2}\/\d{4}$/.test(typed),
    typedDate = typedComplete ? parse(typed, "dd/MM/yyyy", new Date()) : null,
    typedInvalid =
      typedComplete &&
      (!typedDate ||
        !isValid(typedDate) ||
        format(typedDate, "dd/MM/yyyy") !== typed ||
        !allowed(typedDate));
  return (
    <div
      className={cn("mondesa-date-picker", open && "is-open", className)}
      ref={root}
    >
      {name && <input type="hidden" name={name} value={value} />}
      <div className="mondesa-date-input">
        <input
          id={id}
          className="input"
          value={typed}
          onChange={(event) => typeDate(event.target.value)}
          onFocus={() => setOpen(true)}
          aria-label={ariaLabel}
          aria-invalid={typedInvalid || undefined}
          placeholder={placeholder}
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
        />
        <button
          type="button"
          aria-label={`Open ${ariaLabel || "date"} calendar`}
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen(!open)}
        >
          <CalendarDays size={19} />
        </button>
      </div>
      {typedInvalid && (
        <small className="date-input-error">
          Enter a real date as DD/MM/YYYY.
        </small>
      )}
      {open && (
        <div
          className="mondesa-calendar"
          role="dialog"
          aria-label="Choose a date"
        >
          <div className="mondesa-calendar-jump">
            <CustomSelect
              ariaLabel="Calendar month"
              value={String(month.getMonth())}
              onChange={(value) =>
                setMonth(new Date(month.getFullYear(), Number(value), 1))
              }
              options={months}
            />
            <CustomSelect
              ariaLabel="Calendar year"
              value={String(month.getFullYear())}
              onChange={(value) =>
                setMonth(new Date(Number(value), month.getMonth(), 1))
              }
              options={years}
            />
          </div>
          <div className="mondesa-calendar-head">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonth(subMonths(month, 1))}
            >
              <ChevronLeft />
            </button>
            <strong>{format(month, "MMMM yyyy")}</strong>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonth(addMonths(month, 1))}
            >
              <ChevronRight />
            </button>
          </div>
          <div className="mondesa-weekdays">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
              <span key={`${day}${index}`}>{day}</span>
            ))}
          </div>
          <div className="mondesa-days">
            {days.map((day, index) =>
              day ? (
                <button
                  type="button"
                  key={day.toISOString()}
                  aria-label={format(day, "EEEE, d MMMM yyyy")}
                  aria-pressed={!!selected && isSameDay(day, selected)}
                  className={cn(
                    isSameDay(day, new Date()) && "is-today",
                    selected && isSameDay(day, selected) && "is-selected",
                  )}
                  disabled={!allowed(day)}
                  onClick={() => choose(day)}
                >
                  {format(day, "d")}
                </button>
              ) : (
                <span key={`blank${index}`} />
              ),
            )}
          </div>
          <div className="mondesa-calendar-actions">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              disabled={!value}
            >
              Clear
            </button>
            {allowed(new Date()) && (
              <button type="button" onClick={() => choose(new Date())}>
                Today
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)}>Done</button>
          </div>
          <small className="mondesa-calendar-hint">
            Type DD/MM/YYYY or choose a date above.
          </small>
        </div>
      )}
    </div>
  );
}
