'use client'

import { useState } from 'react'
import { Sparkles, X, Loader2 } from 'lucide-react'
import { MONTH_NAMES } from '@/lib/types'

interface AIReportBannerProps {
  accountId: string
  prevYear: number
  prevMonth: number
  hasExisting: boolean
}

export default function AIReportBanner({ accountId, prevYear, prevMonth, hasExisting }: AIReportBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (dismissed) return null

  const monthName = MONTH_NAMES[prevMonth - 1]

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, year: prevYear, month: prevMonth }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setReport(data.content)
    } catch {
      setError('שגיאה בחיבור לשרת')
    } finally {
      setLoading(false)
    }
  }

  if (report) {
    return (
      <div className="bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950/40 dark:to-transparent rounded-2xl border border-indigo-200 dark:border-indigo-800/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-indigo-100 dark:border-indigo-800/30">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 dark:bg-indigo-900/60 rounded-lg p-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-200 text-sm">דוח סיכום {monthName} {prevYear}</h3>
              <p className="text-xs text-indigo-400 mt-0.5">ניתוח בינה מלאכותית</p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-indigo-300 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {report}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-l from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-100 dark:bg-indigo-900/60 rounded-xl p-2 shrink-0">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <p className="font-semibold text-indigo-900 dark:text-indigo-200 text-sm">
            {hasExisting ? `צפה בדוח ${monthName} ${prevYear}` : `הפק דוח סיכום ${monthName} ${prevYear}`}
          </p>
          <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
            ניתוח חכם של החודש שעבר — מגמות, חריגות, והמלצות
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 text-indigo-300 hover:text-indigo-500 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              מנתח...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              {hasExisting ? 'הצג דוח' : 'הפק דוח'}
            </>
          )}
        </button>
      </div>
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  )
}
