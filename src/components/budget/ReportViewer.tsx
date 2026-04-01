'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { MONTH_NAMES } from '@/lib/types'

interface ReportViewerProps {
  year: number
  month: number
  content: string
  createdAt: string
}

export default function ReportViewer({ year, month, content, createdAt }: ReportViewerProps) {
  const [open, setOpen] = useState(false)
  const monthName = MONTH_NAMES[month - 1]
  const date = new Date(createdAt).toLocaleDateString('he-IL', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="bg-white dark:bg-card rounded-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3 text-right">
          <div className="bg-indigo-100 dark:bg-indigo-900/50 rounded-lg p-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">דוח {monthName} {year}</p>
            <p className="text-xs text-slate-400 mt-0.5">הופק ב-{date}</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 dark:border-white/[0.06] pt-4">
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>
      )}
    </div>
  )
}
