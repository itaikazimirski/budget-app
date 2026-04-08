'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { MONTH_NAMES } from '@/lib/types'

interface MonthNavProps {
  accountId: string
  year: number
  month: number
  compact?: boolean
}

export default function MonthNav({ accountId, year, month, compact = false }: MonthNavProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(year)
  const ref = useRef<HTMLDivElement>(null)

  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }

  const now = new Date()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month

  // Toggle picker — reset year only when opening
  function handleOpen() {
    if (!open) setPickerYear(year)
    setOpen((prev) => !prev)
  }

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function navigate(y: number, m: number) {
    setOpen(false)
    router.push(`/${accountId}/${y}/${m}`)
  }

  function goToToday() {
    navigate(now.getFullYear(), now.getMonth() + 1)
  }

  return (
    <div className="flex items-center justify-between">

      {/* Next month arrow (RTL: visually on the left) */}
      <Link
        href={`/${accountId}/${next.year}/${next.month}`}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </Link>

      {/* Dropdown trigger */}
      <div className="relative" ref={ref}>
        <button
          onClick={handleOpen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors group"
        >
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {MONTH_NAMES[month - 1]} {year}
            </h2>
            {isCurrentMonth && compact && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="החודש הנוכחי" />
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {isCurrentMonth && !compact && (
          <p className="text-xs text-indigo-500 font-medium text-center -mt-0.5">החודש הנוכחי</p>
        )}

        {/* Popover */}
        {open && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-72 bg-white dark:bg-card border border-slate-200 dark:border-white/[0.1] rounded-2xl shadow-xl overflow-hidden">

            {/* Year bar — forced LTR so arrows stay in natural positions */}
            <div dir="ltr" className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.06]">
              <button
                onClick={() => setPickerYear((y) => y - 1)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-800 dark:text-white text-base">{pickerYear}</span>
              <button
                onClick={() => setPickerYear((y) => y + 1)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-4 gap-1.5 p-3">
              {MONTH_NAMES.map((name, i) => {
                const m = i + 1
                const isSelected = m === month && pickerYear === year
                const isCurrent = m === now.getMonth() + 1 && pickerYear === now.getFullYear()
                return (
                  <button
                    key={m}
                    onClick={() => navigate(pickerYear, m)}
                    className={`py-2 rounded-xl text-sm font-medium transition-colors relative
                      ${isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07]'
                      }
                    `}
                  >
                    {name}
                    {isCurrent && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Today button */}
            <div className="px-3 pb-3">
              <button
                onClick={goToToday}
                className="w-full py-2 rounded-xl text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors border border-indigo-100 dark:border-indigo-900/50"
              >
                חזור לחודש הנוכחי
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Prev month arrow (RTL: visually on the right) */}
      <Link
        href={`/${accountId}/${prev.year}/${prev.month}`}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.07] transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </Link>
    </div>
  )
}
