'use client'

import { useState, useEffect } from 'react'
import { Loader2, FileDown, X } from 'lucide-react'
import { toast } from 'sonner'
import type { AIReportData } from '@/lib/types'
import { Dialog, DialogContent } from '@/components/ui/dialog'

interface MonthlyReportFlowProps {
  accountId: string
  /** Pre-resolved on the server when available — skips the client-side GET if provided */
  hasExistingReport?: boolean
  /** Compact mode for navbar usage */
  compact?: boolean
}

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

const SCORE_COLOR: Record<string, string> = {
  A: 'text-emerald-400',
  B: 'text-green-400',
  C: 'text-yellow-400',
  D: 'text-orange-400',
  F: 'text-red-400',
}

const IMPACT_STYLE: Record<string, string> = {
  high:   'bg-red-950/60 border-red-700/60 text-red-200',
  medium: 'bg-orange-950/60 border-orange-700/60 text-orange-200',
  low:    'bg-yellow-950/60 border-yellow-700/60 text-yellow-200',
}

const IMPACT_LABEL: Record<string, string> = {
  high: 'גבוה', medium: 'בינוני', low: 'נמוך',
}

const TOTAL_SLIDES = 4

/** Returns the previous calendar month relative to today as { year, month } (month is 1-indexed). */
function getPrevMonth(): { year: number; month: number } {
  const today = new Date()
  const month = today.getMonth() === 0 ? 12 : today.getMonth() // getMonth() is 0-indexed
  const year  = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()
  return { year, month }
}

export default function MonthlyReportFlow({
  accountId, hasExistingReport, compact = false,
}: MonthlyReportFlowProps) {
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [reportData, setReportData] = useState<AIReportData | null>(null)
  const [open, setOpen] = useState(false)
  const [slide, setSlide] = useState(0)

  // When hasExistingReport is not provided (e.g. AppNav), resolve via GET
  const [resolvedHasReport, setResolvedHasReport] = useState<boolean | null>(
    hasExistingReport !== undefined ? hasExistingReport : null
  )

  const { year: prevYear, month: prevMonth } = getPrevMonth()

  useEffect(() => {
    if (hasExistingReport !== undefined) return
    fetch(`/api/ai-report?accountId=${accountId}`)
      .then((r) => r.json())
      .then((data) => {
        const reports: { year: number; month: number }[] = data.reports ?? []
        setResolvedHasReport(reports.some((r) => r.year === prevYear && r.month === prevMonth))
      })
      .catch(() => setResolvedHasReport(false))
  }, [accountId, prevYear, prevMonth, hasExistingReport])

  // Still resolving — render nothing to avoid layout shift
  if (resolvedHasReport === null) return null

  const showGolden   = !resolvedHasReport
  const showStandard = resolvedHasReport

  // ── Fetch + open story ──────────────────────────────────────────────────
  async function handleGoldenClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, year: prevYear, month: prevMonth }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        toast.error('השרתים עמוסים כרגע בהפקת דוחות 🤖 אנא נסה שוב בעוד כמה דקות.')
        return
      }
      const parsed: AIReportData =
        typeof data.content === 'string' ? JSON.parse(data.content) : data.content
      setReportData(parsed)
      setSlide(0)
      setOpen(true)
    } catch {
      toast.error('השרתים עמוסים כרגע בהפקת דוחות 🤖 אנא נסה שוב בעוד כמה דקות.')
    } finally {
      setLoading(false)
    }
  }

  // ── PDF generation ──────────────────────────────────────────────────────
  async function downloadPDF(aiData?: AIReportData | null) {
    setPdfLoading(true)
    try {
      // If no AI data provided, fetch it (standard-state button path)
      let resolvedAiData = aiData ?? reportData
      if (!resolvedAiData) {
        const aiRes = await fetch('/api/ai-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId, year: prevYear, month: prevMonth }),
        })
        const aiJson = await aiRes.json()
        if (!aiRes.ok || aiJson.error) {
          toast.error('השרתים עמוסים כרגע בהפקת דוחות 🤖 אנא נסה שוב בעוד כמה דקות.')
          return
        }
        resolvedAiData =
          typeof aiJson.content === 'string' ? JSON.parse(aiJson.content) : aiJson.content
      }

      // Fetch budget data (current month totals) + prev month data in parallel
      const [budgetRes, pdfRes] = await Promise.all([
        fetch(`/api/budget-data?accountId=${accountId}&year=${prevYear}&month=${prevMonth}`),
        fetch('/api/pdf-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId, year: prevYear, month: prevMonth }),
        }),
      ])
      const budgetJson = await budgetRes.json()
      const pdfJson    = await pdfRes.json()
      if (!budgetRes.ok) throw new Error(budgetJson.error ?? 'שגיאה בטעינת נתוני תקציב')
      if (!pdfRes.ok)    throw new Error(pdfJson.error    ?? 'שגיאה בטעינת נתוני חודש קודם')

      const { totalIncome, totalExpenses, balance, expenseCategories } = budgetJson
      const { prevActuals, prevTotalExpenses } = pdfJson

      // Dynamically import renderer (browser-only)
      const [{ pdf }, { default: BudgetPDFDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./BudgetPDFDocument'),
      ])

      const blob = await pdf(
        BudgetPDFDocument({
          data: {
            year: prevYear,
            month: prevMonth,
            totalIncome,
            totalExpenses,
            balance,
            prevTotalExpenses,
            prevActuals,
            expenseCategories,
            aiReportData: resolvedAiData,
          },
        })
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `תקציב-לי_${MONTHS[prevMonth - 1]}_${prevYear}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('שגיאה ביצירת ה-PDF. אנא נסה שוב.')
    } finally {
      setPdfLoading(false)
    }
  }

  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const isLeftHalf = e.clientX - rect.left < rect.width / 2
    if (isLeftHalf) {
      setSlide((s) => Math.max(0, s - 1))
    } else {
      if (slide === TOTAL_SLIDES - 1) {
        setOpen(false)
      } else {
        setSlide((s) => s + 1)
      }
    }
  }

  // ── Golden button classes ──────────────────────────────────────────────
  const goldenBase = [
    'bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200',
    'dark:from-yellow-700 dark:via-amber-500 dark:to-yellow-700',
    'bg-[length:200%_100%] animate-shimmer',
    'text-yellow-900 dark:text-gray-900',
    'shadow-md shadow-amber-200/60 dark:shadow-[0_0_15px_rgba(217,119,6,0.35)]',
    'disabled:opacity-70 transition-opacity',
  ].join(' ')

  const goldenFull    = `relative overflow-hidden w-full rounded-2xl px-6 py-4 font-semibold text-base active:scale-[0.98] ${goldenBase}`
  const goldenCompact = `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold ${goldenBase}`

  // ── Standard (PDF) button classes ────────────────────────────────────
  const standardFull = [
    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium',
    'bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400',
    'border border-slate-200 dark:border-white/[0.08]',
    'hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors disabled:opacity-60',
  ].join(' ')
  const standardCompact = [
    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium',
    'border border-indigo-200 text-indigo-600',
    'hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-950/30 transition-colors disabled:opacity-60',
  ].join(' ')

  return (
    <>
      {/* ── Trigger button ── */}
      {showGolden ? (
        <div className={compact ? undefined : 'flex flex-col items-stretch gap-2'}>
          <button
            onClick={handleGoldenClick}
            disabled={loading}
            className={compact ? goldenCompact : goldenFull}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {!compact && 'טוען...'}
              </span>
            ) : compact ? (
              '✨ דוח'
            ) : (
              '✨ הסיכום החודשי מוכן'
            )}
          </button>
        </div>
      ) : showStandard ? (
        <button
          onClick={() => downloadPDF()}
          disabled={pdfLoading}
          className={compact ? standardCompact : standardFull}
        >
          {pdfLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {!compact && 'מכין...'}
            </>
          ) : (
            <>
              <FileDown className="w-3.5 h-3.5" />
              {compact ? <span className="hidden sm:inline">PDF</span> : 'הורד דוח PDF'}
            </>
          )}
        </button>
      ) : null}

      {/* ── Story dialog ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="p-0 max-w-sm overflow-hidden rounded-2xl border-0"
        >
          {reportData && (
            <div
              className="relative select-none cursor-pointer"
              style={{ minHeight: 480 }}
              onClick={handleTap}
            >
              {/* Segmented progress bar */}
              <div className="absolute top-0 inset-x-0 z-10 flex gap-1 p-2">
                {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-1 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.25)' }}
                  >
                    <div
                      className="h-full bg-white transition-all duration-500"
                      style={{ width: i <= slide ? '100%' : '0%' }}
                    />
                  </div>
                ))}
              </div>

              {/* Close */}
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false) }}
                className="absolute top-3 left-3 z-20 p-1.5 rounded-full transition-colors"
                style={{ background: 'rgba(0,0,0,0.25)' }}
              >
                <X className="w-4 h-4 text-white" />
              </button>

              {/* ── Slide 0: Score + TLDR ── */}
              {slide === 0 && (
                <div
                  className="flex flex-col items-center justify-center px-8 pt-16 pb-10 min-h-[480px]
                    bg-gradient-to-b from-slate-900 to-indigo-950"
                  key="slide-0"
                >
                  <div className="animate-fade-slide-in flex flex-col items-center gap-6 w-full">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-white/50 text-sm tracking-wide">ציון חודשי</span>
                      <span
                        className={`text-8xl font-black leading-none ${SCORE_COLOR[reportData.score] ?? 'text-white'}`}
                        style={{ textShadow: '0 0 40px currentColor' }}
                      >
                        {reportData.score}
                      </span>
                    </div>
                    <p className="text-white/85 text-base leading-relaxed text-center max-w-xs">
                      {reportData.tldr}
                    </p>
                    <p className="text-white/30 text-xs mt-2">הקש להמשך</p>
                  </div>
                </div>
              )}

              {/* ── Slide 1: Highlights ── */}
              {slide === 1 && (
                <div
                  className="flex flex-col px-5 pt-14 pb-8 min-h-[480px]
                    bg-gradient-to-b from-emerald-950 to-slate-900"
                  key="slide-1"
                >
                  <div className="animate-fade-slide-in flex flex-col gap-4 w-full">
                    <h2 className="text-white font-bold text-lg text-right">מה עבד טוב החודש ✨</h2>
                    <div className="flex flex-col gap-3">
                      {reportData.highlights.map((h, i) => (
                        <div
                          key={i}
                          className="rounded-xl p-4 border border-emerald-700/50 bg-emerald-950/60
                            text-right animate-fade-slide-in"
                          style={{ animationDelay: `${i * 80}ms` }}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl shrink-0 mt-0.5">{h.emoji}</span>
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-emerald-300 font-semibold text-sm">{h.title}</span>
                              <span className="text-white/75 text-sm leading-relaxed">{h.description}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Slide 2: Warnings ── */}
              {slide === 2 && (
                <div
                  className="flex flex-col px-5 pt-14 pb-8 min-h-[480px]
                    bg-gradient-to-b from-rose-950 to-slate-900"
                  key="slide-2"
                >
                  <div className="animate-fade-slide-in flex flex-col gap-4 w-full">
                    <h2 className="text-white font-bold text-lg text-right">נקודות לשיפור ⚠️</h2>
                    <div className="flex flex-col gap-3">
                      {reportData.warnings.map((w, i) => (
                        <div
                          key={i}
                          className={`rounded-xl p-4 border text-right animate-fade-slide-in ${IMPACT_STYLE[w.impact] ?? IMPACT_STYLE.low}`}
                          style={{ animationDelay: `${i * 80}ms` }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded-full border"
                              style={{ borderColor: 'currentColor', opacity: 0.7 }}
                            >
                              {IMPACT_LABEL[w.impact]}
                            </span>
                            <span className="font-semibold text-sm">{w.category}</span>
                          </div>
                          <p className="text-sm leading-relaxed opacity-80">{w.issue}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Slide 3: Action Item + PDF ── */}
              {slide === 3 && (
                <div
                  className="flex flex-col items-center justify-between px-6 pt-14 pb-8 min-h-[480px]
                    bg-gradient-to-b from-indigo-950 to-slate-900"
                  key="slide-3"
                >
                  <div className="animate-fade-slide-in flex flex-col items-center gap-6 w-full flex-1 justify-center">
                    <span className="text-4xl">🎯</span>
                    <div className="flex flex-col gap-3 text-center">
                      <h2 className="text-white font-bold text-lg">הצעד הבא</h2>
                      <p className="text-white/85 text-base leading-relaxed max-w-xs">
                        {reportData.actionItem}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadPDF(reportData) }}
                    disabled={pdfLoading}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold
                      bg-white/10 hover:bg-white/20 text-white border border-white/20
                      transition-colors w-full justify-center mt-6 disabled:opacity-60"
                  >
                    {pdfLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        מכין PDF...
                      </>
                    ) : (
                      <>
                        <FileDown className="w-4 h-4" />
                        הורד דוח מסכם (PDF)
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
