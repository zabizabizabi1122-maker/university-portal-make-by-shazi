'use client'

import { useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Inbox, Search } from 'lucide-react'

/** Row of search/filter controls above a table or list. */
export function TableToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 mb-4">
      {children}
    </div>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  ariaLabel = 'Search',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
}) {
  return (
    <label className="relative block flex-1 min-w-[180px]">
      <span className="sr-only">{ariaLabel}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-ink placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
      />
    </label>
  )
}

export function SelectFilter({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  ariaLabel: string
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500 transition"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/** Consistent message for both "no data" and "no search results" states. */
export function EmptyState({
  title,
  hint,
  onClear,
  icon: Icon = Inbox,
}: {
  title: string
  hint?: string
  onClear?: () => void
  icon?: typeof Inbox
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {hint && <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{hint}</p>}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
  label = 'rows',
}: {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onChange: (page: number) => void
  label?: string
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 px-4 py-3">
      <p className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-300">{first}–{last}</span> of{' '}
        <span className="font-semibold text-slate-300">{total}</span> {label}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-300 hover:border-slate-700 hover:text-ink transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </button>
        <span className="text-xs text-slate-400 whitespace-nowrap">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pageCount}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-slate-300 hover:border-slate-700 hover:text-ink transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/** Client-side pagination for already-filtered rows. */
export function usePagination<T>(items: T[], pageSize = 8) {
  const [requestedPage, setRequestedPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(requestedPage, pageCount)

  return {
    page,
    pageCount,
    pageItems: items.slice((page - 1) * pageSize, page * pageSize),
    setPage: (next: number) => setRequestedPage(Math.min(Math.max(1, next), pageCount)),
    resetPage: () => setRequestedPage(1),
  }
}
