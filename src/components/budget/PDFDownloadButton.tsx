'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import type { AIReportData } from '@/lib/types'

interface PDFDownloadButtonProps {
  accountId: string
  year: number
  month: number
}

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

export default function PDFDownloadButton({ accountId, year, month }: PDFDownloadButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month

  async function handleDownload() {
    setLoading(true)
    setError(null)
    try {
      const [budgetRes, aiRes, pdfRes] = await Promise.all([
        fetch(`/api/budget-data?accountId=${accountId}&year=${year}&month=${month}`),
        fetch('/api/ai-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId, year, month }),
        }),
        fetch('/api/pdf-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId, year, month }),
        }),
      ])
      const budgetJson = await budgetRes.json()
      const aiJson     = await aiRes.json()
      const pdfJson    = await pdfRes.json()
      if (!budgetRes.ok) throw new Error(budgetJson.error ?? 'שגיאה בטעינת נתונים')

      const { totalIncome, totalExpenses, balance, expenseCategories } = budgetJson
      const { prevActuals, prevTotalExpenses } = pdfJson

      let aiReportData: AIReportData | null = null
      if (aiJson.content) {
        try {
          aiReportData = typeof aiJson.content === 'string'
            ? JSON.parse(aiJson.content)
            : aiJson.content
        } catch {
          aiReportData = null
        }
      }

      const [{ pdf }, { default: BudgetPDFDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./BudgetPDFDocument'),
      ])

      const blob = await pdf(
        BudgetPDFDocument({
          data: { year, month, totalIncome, totalExpenses, balance, prevTotalExpenses, prevActuals, expenseCategories, aiReportData },
        })
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `תקציב-לי_${MONTHS[month - 1]}_${year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה לא ידועה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative group flex flex-col items-end">
      <button
        onClick={handleDownload}
        disabled={loading}
        title="הורד דוח PDF"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 transition-colors disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden sm:inline">מכין...</span>
          </>
        ) : (
          <>
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </>
        )}
      </button>

      {isCurrentMonth && !loading && (
        <div className="absolute top-1/2 -translate-y-1/2 right-full mr-2 w-52 px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-xl shadow-lg
          opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none text-right leading-relaxed">
          מומלץ לחכות לסיום החודש כדי לקבל דוח מלא
          <div className="absolute top-1/2 -translate-y-1/2 left-full border-4 border-transparent border-l-slate-800 dark:border-l-slate-700" />
        </div>
      )}

      {error && (
        <div className="absolute top-full mt-1 left-0 text-xs text-rose-500 bg-white border border-rose-200 rounded-lg px-2 py-1 shadow whitespace-nowrap z-50">
          {error}
        </div>
      )}
    </div>
  )
}
