'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerInputProps {
  value?: string | null; // Expected format: "YYYY-MM-DD" or ""
  onChange: (isoDate: string) => void; // Emits "YYYY-MM-DD" or ""
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  minYear?: number;
  maxYear?: number;
  minDate?: string; // "YYYY-MM-DD"
  maxDate?: string; // "YYYY-MM-DD"
  id?: string;
  name?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Convert YYYY-MM-DD -> DD/MM/YYYY
export function isoToDisplayDate(isoStr?: string | null): string {
  if (!isoStr) return '';
  const match = String(isoStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  // Try parsing generic date
  try {
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {
    // fallback
  }
  return '';
}

// Convert DD/MM/YYYY -> YYYY-MM-DD
export function displayDateToIso(displayStr: string): string {
  if (!displayStr) return '';
  const parts = displayStr.trim().split(/[\/\-.]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  return '';
}

export default function DatePickerInput({
  value = '',
  onChange,
  placeholder = 'DD/MM/YYYY',
  className = '',
  disabled = false,
  required = false,
  minYear = 1940,
  maxYear = 2035,
  minDate,
  maxDate,
  id,
  name,
}: DatePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayText, setDisplayText] = useState(() => isoToDisplayDate(value));
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or fallback to today for calendar view
  const activeDate = useMemo(() => {
    if (value) {
      const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (match) {
        return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
      }
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState(() => activeDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => activeDate.getMonth());

  // Synchronize when value changes externally
  useEffect(() => {
    setDisplayText(isoToDisplayDate(value));
    if (value) {
      const match = String(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (match) {
        setViewYear(parseInt(match[1], 10));
        setViewMonth(parseInt(match[2], 10) - 1);
      }
    }
  }, [value]);

  // Handle click outside to close popover
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Compute days in current month view
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      isCurrentMonth: boolean;
      iso: string;
      isSelected: boolean;
      isToday: boolean;
      isDisabled: boolean;
    }> = [];

    const todayIso = new Date().toISOString().slice(0, 10);
    const selectedIso = value ? value.slice(0, 10) : '';

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const iso = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        isCurrentMonth: false,
        iso,
        isSelected: iso === selectedIso,
        isToday: iso === todayIso,
        isDisabled: Boolean((minDate && iso < minDate) || (maxDate && iso > maxDate)),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        isCurrentMonth: true,
        iso,
        isSelected: iso === selectedIso,
        isToday: iso === todayIso,
        isDisabled: Boolean((minDate && iso < minDate) || (maxDate && iso > maxDate)),
      });
    }

    // Next month padding days to complete grid (up to 42 cells or full weeks)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const iso = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        isCurrentMonth: false,
        iso,
        isSelected: iso === selectedIso,
        isToday: iso === todayIso,
        isDisabled: Boolean((minDate && iso < minDate) || (maxDate && iso > maxDate)),
      });
    }

    return days;
  }, [viewYear, viewMonth, value, minDate, maxDate]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDate = (iso: string) => {
    onChange(iso);
    setDisplayText(isoToDisplayDate(iso));
    setIsOpen(false);
  };

  const handleQuickToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    handleSelectDate(todayIso);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setDisplayText('');
    setIsOpen(false);
  };

  // Handle direct manual text input with automatic "/" mask
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    // Allow digits and slashes only
    input = input.replace(/[^\d\/]/g, '');

    // Auto format DD/MM/YYYY as user types numbers
    const cleanNumbers = input.replace(/\//g, '');
    let formatted = '';
    if (cleanNumbers.length > 0) {
      formatted = cleanNumbers.slice(0, 2);
      if (cleanNumbers.length >= 3) {
        formatted += '/' + cleanNumbers.slice(2, 4);
      }
      if (cleanNumbers.length >= 5) {
        formatted += '/' + cleanNumbers.slice(4, 8);
      }
    } else {
      formatted = input;
    }

    setDisplayText(formatted);

    // If fully valid DD/MM/YYYY, emit ISO format
    if (formatted.length === 10) {
      const iso = displayDateToIso(formatted);
      if (iso) {
        onChange(iso);
        const match = iso.match(/^(\d{4})-(\d{1,2})/);
        if (match) {
          setViewYear(parseInt(match[1], 10));
          setViewMonth(parseInt(match[2], 10) - 1);
        }
      }
    } else if (formatted.length === 0) {
      onChange('');
    }
  };

  // Generate Year options
  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [minYear, maxYear]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          id={id}
          name={name}
          value={displayText}
          onChange={handleInputChange}
          onClick={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={10}
          className={`w-full font-medium transition-all ${
            className ||
            'px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white'
          }`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="absolute right-3 p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          title="Open DD/MM/YYYY calendar picker"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar Popover */}
      {isOpen && !disabled && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header Controls: Month & Year dropdowns + Previous/Next */}
          <div className="flex items-center justify-between gap-1 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer py-1 px-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer py-1 px-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers (Su, Mo, Tu, We, Th, Fr, Sa) */}
          <div className="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {calendarDays.map((cell, idx) => (
              <button
                key={idx}
                type="button"
                disabled={cell.isDisabled}
                onClick={() => handleSelectDate(cell.iso)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-medium transition-all ${
                  cell.isSelected
                    ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-500/30'
                    : cell.isToday
                    ? 'border-2 border-sky-500 font-bold text-sky-600 dark:text-sky-400'
                    : cell.isCurrentMonth
                    ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                } ${cell.isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {cell.day}
              </button>
            ))}
          </div>

          {/* Bottom Quick Action Bar */}
          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={handleQuickToday}
              className="font-bold text-sky-600 dark:text-sky-400 hover:underline"
            >
              Today
            </button>
            <div className="text-[10px] font-mono text-slate-400">
              Format: DD/MM/YYYY
            </div>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="font-semibold text-rose-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
