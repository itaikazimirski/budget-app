'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTH_NAMES } from '@/lib/types'

interface MonthNavProps {
  accountId: string
  year: number
  month: number
}

export default function MonthNav({ accountId, year, month }: MonthNavProps) {
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  const isCurrentMonth = (() => {
    const now = new Date()
    return now.getFullYear() === year && now.getMonth() + 1 === month
  })()

  return (
    <div className="flex items-center justify-between">
      {/* In RTL: ChevronRight goes to previous month (visually on the right = start) */}
      <Link
        href={`/${accountId}/${next.year}/${next.month}`}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </Link>

      <div className="text-center">
        <h2 className="text-lg font-bold text-slate-900">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        {isCurrentMonth && (
          <span className="text-xs text-indigo-500 font-medium">החודש הנוכחי</span>
        )}
      </div>

      <Link
        href={`/${accountId}/${prev.year}/${prev.month}`}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </Link>
    </div>
  )
}
