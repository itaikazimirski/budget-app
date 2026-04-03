'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CategoryWithStats } from '@/lib/types'

interface PDFDownloadButtonProps {
  accountId: string
  year: number
  month: number
  totalIncome: number
  totalExpenses: number
  balance: number
  expenseCategories: CategoryWithStats[]
}

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

export default function PDFDownloadButton({
  accountId, year, month, totalIncome, totalExpenses, balance, expenseCategories
}: PDFDownloadButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    setLoading(true)
    setError(null)
    try {
      // 1. Get AI report + prev month data (generates AI if not exists)
      const res = await fetch('/api/pdf-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, year, month }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'שגיאה בהכנת הדוח')

      const { aiContent, prevActuals, prevTotalExpenses } = json

      // 2. Dynamically import PDF renderer (browser only)
      const [{ pdf }, { default: BudgetPDFDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./BudgetPDFDocument'),
      ])

      // 3. Generate PDF blob
      const blob = await pdf(
        BudgetPDFDocument({
          data: {
            year,
            month,
            totalIncome,
            totalExpenses,
            balance,
            prevTotalExpenses,
            prevActuals,
            expenseCategories,
            aiContent,
          },
        })
      ).toBlob()

      // 4. Trigger download
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
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleDownload}
        disabled={loading}
        variant="outline"
        size="sm"
        className="gap-2 h-9 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            מכין דוח מקיף...
          </>
        ) : (
          <>
            <FileDown className="w-3.5 h-3.5" />
            הורד PDF
          </>
        )}
      </Button>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}
