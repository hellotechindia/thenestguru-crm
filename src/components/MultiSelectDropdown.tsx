'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export interface MultiSelectOption {
  label: string;
  value: string;
  subtitle?: string;
  badge?: string;
}

export interface MultiSelectDropdownProps {
  label: string;
  icon?: any;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (newSelected: string[]) => void;
  color?: 'indigo' | 'sky' | 'purple' | 'amber' | 'emerald' | 'blue';
  placeholder?: string;
  allLabel?: string;
  headerRight?: React.ReactNode;
  mode?: 'filter' | 'explicit';
  inline?: boolean;
  disabled?: boolean;
}

export default function MultiSelectDropdown({
  label,
  icon: Icon,
  options,
  selected = [],
  onChange,
  color = 'indigo',
  allLabel = 'All',
  headerRight,
  mode = 'explicit',
  placeholder = '-- Select --',
  inline = false,
  disabled = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleOption = (val: string) => {
    if (disabled) return;
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(options.map((o) => o.value));
  };
  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const isExplicit = mode === 'explicit';
  const isAll = isExplicit
    ? selected.length === options.length && options.length > 0
    : selected.length === 0;

  const filteredOptions = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      (o.subtitle && o.subtitle.toLowerCase().includes(search.toLowerCase()))
  );

  const themeColors = {
    indigo: {
      border: 'border-indigo-500 focus:border-indigo-600',
      badge: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
      checkbox: 'bg-indigo-600 border-indigo-600 text-white',
      hover: 'hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30',
      text: 'text-indigo-600 dark:text-indigo-400',
      ring: 'focus:ring-indigo-500/20',
    },
    blue: {
      border: 'border-blue-500 focus:border-blue-600',
      badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      checkbox: 'bg-blue-600 border-blue-600 text-white',
      hover: 'hover:bg-blue-50/70 dark:hover:bg-blue-950/30',
      text: 'text-blue-600 dark:text-blue-400',
      ring: 'focus:ring-blue-500/20',
    },
    amber: {
      border: 'border-amber-500 focus:border-amber-600',
      badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      checkbox: 'bg-amber-600 border-amber-600 text-white',
      hover: 'hover:bg-amber-50/70 dark:hover:bg-amber-950/30',
      text: 'text-amber-600 dark:text-amber-400',
      ring: 'focus:ring-amber-500/20',
    },
    emerald: {
      border: 'border-emerald-500 focus:border-emerald-600',
      badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      checkbox: 'bg-emerald-600 border-emerald-600 text-white',
      hover: 'hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30',
      text: 'text-emerald-600 dark:text-emerald-400',
      ring: 'focus:ring-emerald-500/20',
    },
    purple: {
      border: 'border-purple-500 focus:border-purple-600',
      badge: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      checkbox: 'bg-purple-600 border-purple-600 text-white',
      hover: 'hover:bg-purple-50/70 dark:hover:bg-purple-950/30',
      text: 'text-purple-600 dark:text-purple-400',
      ring: 'focus:ring-purple-500/20',
    },
    sky: {
      border: 'border-sky-500 focus:border-sky-600',
      badge: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800',
      checkbox: 'bg-sky-600 border-sky-600 text-white',
      hover: 'hover:bg-sky-50/70 dark:hover:bg-sky-950/30',
      text: 'text-sky-600 dark:text-sky-400',
      ring: 'focus:ring-sky-500/20',
    },
  }[color];

  // Dynamic summary text for the trigger button
  let summaryText = allLabel;
  if (isExplicit && selected.length === 0) {
    summaryText = placeholder;
  } else if (isExplicit && isAll) {
    summaryText = `All Selected (${options.length})`;
  } else if (selected.length === 1) {
    const matched = options.find((o) => o.value === selected[0]);
    summaryText = matched ? matched.label : selected[0];
  } else if (selected.length > 1) {
    summaryText = `${selected.length} Selected`;
  }

  return (
    <div className="relative space-y-1" ref={dropdownRef}>
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          {Icon && <Icon className={`w-3.5 h-3.5 ${themeColors.text}`} />}
          <span>{label}</span>
          {isExplicit && (
            <span className="text-[10px] text-slate-400 font-normal">
              ({selected.length}/{options.length})
            </span>
          )}
        </label>
        {headerRight ? (
          headerRight
        ) : (
          <span
            className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border transition-all ${
              isAll
                ? isExplicit
                  ? themeColors.badge
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                : selected.length === 0
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                : themeColors.badge
            }`}
          >
            {isExplicit
              ? isAll
                ? `All (${options.length})`
                : `${selected.length} Selected`
              : isAll
              ? 'All (Default)'
              : `${selected.length} Selected`}
          </span>
        )}
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border transition-all text-left shadow-sm ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        } ${
          isOpen
            ? `${themeColors.border} ring-2 ${themeColors.ring}`
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-slate-800 dark:text-slate-200 truncate font-medium">
            {!isExplicit && isAll ? (
              <span className="text-slate-400 font-normal">All / Any (No restriction)</span>
            ) : selected.length === 0 ? (
              <span className="text-slate-400 font-normal">{placeholder}</span>
            ) : (
              <span className="font-semibold text-slate-800 dark:text-white">{summaryText}</span>
            )}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-800 dark:text-white' : ''
          }`}
        />
      </button>

      {/* Dismissible Selected Badges Preview (shown when closed) */}
      {selected.length > 0 && (!isAll || isExplicit) && !isOpen && (
        <div className="flex flex-wrap gap-1 pt-1">
          {selected.slice(0, 4).map((val) => {
            const opt = options.find((o) => o.value === val);
            return (
              <span
                key={val}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${themeColors.badge}`}
              >
                <span className="max-w-[130px] truncate">{opt ? opt.label : val}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOption(val);
                    }}
                    className="hover:opacity-75 p-0.5 cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            );
          })}
          {selected.length > 4 && (
            <span className="text-[10px] text-slate-400 font-semibold self-center">
              +{selected.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Options Container */}
      {isOpen && (
        <div
          className={
            inline
              ? 'mt-2 bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150 shadow-inner'
              : 'absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2.5 space-y-2 animate-in fade-in zoom-in-95 duration-150'
          }
        >
          {/* Header / Search */}
          <div className="space-y-1.5 pb-2 border-b border-slate-200/80 dark:border-slate-800">
            {options.length > 3 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${label}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            )}
            <div className="flex items-center justify-between text-[11px] pt-0.5 px-0.5">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {selected.length} of {options.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold hover:underline cursor-pointer"
                >
                  Clear All
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={selectAll}
                  className={`font-semibold hover:underline cursor-pointer ${themeColors.text}`}
                >
                  Select All
                </button>
              </div>
            </div>
          </div>

          {/* Options List with Checkboxes */}
          <div className="max-h-52 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">No matching staff / partners</div>
            ) : (
              filteredOptions.map((opt) => {
                const checked = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(opt.value)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer ${
                      checked
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        checked
                          ? themeColors.checkbox
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate font-semibold">{opt.label}</span>
                        {opt.badge && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subtitle && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {opt.subtitle}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
