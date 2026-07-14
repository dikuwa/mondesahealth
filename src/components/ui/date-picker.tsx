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
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import { cn } from "@/lib/utils";

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

export function DatePicker({
  value,
  onChange,
  name,
  id,
  ariaLabel,
  placeholder = "dd/mm/yyyy",
  min,
  max,
  disabled,
  className,
}: Props) {
  const selected = value ? parseISO(value) : null;
  const [open, setOpen] = useState(false),
    [month, setMonth] = useState(startOfMonth(selected || new Date()));
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const days = useMemo(() => {
    const start = startOfMonth(month);
    return [
      ...Array.from({ length: (getDay(start) + 6) % 7 }, () => null),
      ...eachDayOfInterval({ start, end: endOfMonth(month) }),
    ];
  }, [month]);
  const minimum = min ? parseISO(min) : null,
    maximum = max ? parseISO(max) : null;
  function choose(day: Date) {
    onChange(format(day, "yyyy-MM-dd"));
    setOpen(false);
  }
  return (
    <div
      className={cn("mondesa-date-picker", open && "is-open", className)}
      ref={root}
    >
      {name && <input type="hidden" name={name} value={value} />}
      <button
        id={id}
        type="button"
        className="input mondesa-date-trigger"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span className={!selected ? "is-placeholder" : undefined}>
          {selected ? format(selected, "dd/MM/yyyy") : placeholder}
        </span>
        <CalendarDays size={19} />
      </button>
      {open && (
        <div
          className="mondesa-calendar"
          role="dialog"
          aria-label="Choose a date"
        >
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
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={`${d}${i}`}>{d}</span>
            ))}
          </div>
          <div className="mondesa-days">
            {days.map((day, i) =>
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
                  disabled={
                    !!(minimum && day < minimum) || !!(maximum && day > maximum)
                  }
                  onClick={() => choose(day)}
                >
                  {format(day, "d")}
                </button>
              ) : (
                <span key={`blank${i}`} />
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
            <button type="button" onClick={() => choose(new Date())}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
