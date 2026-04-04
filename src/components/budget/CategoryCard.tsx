'use client'

import { useState, useTransition } from 'react'
import type { CategoryWithStats } from '@/lib/types'
import { updateMonthBudget, updateTemplateBudget } from '@/app/actions/categories'
import { Edit2, Check, X, Settings2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatILS } from '@/lib/budget-utils'
import CategoryEditDialog from './CategoryEditDialog'

interface CategoryCardProps {
  category: CategoryWithStats
  accountId: string
  year: number
  month: number
}

export default function CategoryCard({ category, accountId, year, month }: CategoryCardProps) {
  const [editing, setEditing] = useState(false)
  const [budgetInput, setBudgetInput] = useState(String(category.budget_amount))
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showScopeModal, setShowScopeModal] = useState(false)
  const [pendingAmount, setPendingAmount] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const { actual_amount, budget_amount, percentage, type } = category
  const isOneTime = category.one_time_year !== null
  const isOver = actual_amount > budget_amount && budget_amount > 0
  const barColor = type === 'income'
    ? (percentage >= 100 ? 'bg-emerald-500' : 'bg-emerald-400')
    : isOver
      ? 'bg-rose-500'
      : percentage > 85
        ? 'bg-rose-400'
        : percentage > 60
          ? 'bg-amber-400'
          : 'bg-emerald-400'

  function handleSaveBudget() {
    const amount = parseFloat(budgetInput)
    if (isNaN(amount) || amount < 0) return
    if (isOneTime) {
      // One-time category: always save as month override only
      saveMonthOnly(amount)
    } else {
      setPendingAmount(amount)
      setShowScopeModal(true)
    }
  }

  function saveMonthOnly(amount: number) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('accountId', accountId)
      fd.set('categoryId', category.id)
      fd.set('year', String(year))
      fd.set('month', String(month))
      fd.set('monthlyAmount', String(amount))
      await updateMonthBudget(fd)
      setEditing(false)
      setShowScopeModal(false)
    })
  }

  function saveTemplate(amount: number) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('accountId', accountId)
      fd.set('categoryId', category.id)
      fd.set('year', String(year))
      fd.set('month', String(month))
      fd.set('monthlyAmount', String(amount))
      await updateTemplateBudget(fd)
      setEditing(false)
      setShowScopeModal(false)
    })
  }

  return (
    <>
      <div className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group rounded-xl ${isOver ? 'border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10' : ''}`}>

        {/* Top row: category name + amount ratio */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">{category.icon ?? '📦'}</span>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{category.name}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {budget_amount > 0 ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                <span className={`font-semibold ${isOver ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
                  {formatILS(actual_amount)}
                </span>
                {' / '}
                {formatILS(budget_amount)}
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{formatILS(actual_amount)}</span>
            )}

            <button
              onClick={() => setShowEditDialog(true)}
              className="p-1 text-slate-300 hover:text-slate-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity"
              title="ערוך קטגוריה"
            >
              <Settings2 className="w-3 h-3" />
            </button>

            {!editing ? (
              <button
                onClick={() => { setBudgetInput(String(budget_amount)); setEditing(true) }}
                className="p-1 text-slate-300 hover:text-slate-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity"
                title="ערוך תקציב לחודש זה"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-xs">₪</span>
                <input
                  type="number"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-20 text-xs border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-400"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBudget(); if (e.key === 'Escape') setEditing(false) }}
                />
                <button onClick={handleSaveBudget} disabled={isPending} className="p-1 text-emerald-500 hover:text-emerald-600">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditing(false)} className="p-1 text-slate-400 hover:text-slate-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {budget_amount > 0 ? (
          <div className="h-3 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-300">אין תקציב מוגדר — לחץ ✏️ להגדרה לחודש זה</p>
        )}
      </div>

      {showEditDialog && (
        <CategoryEditDialog
          category={category}
          accountId={accountId}
          onClose={() => setShowEditDialog(false)}
        />
      )}

      {showScopeModal && pendingAmount !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-card rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1 text-right">איך לשמור את השינוי?</h3>
            <p className="text-sm text-slate-500 mb-5 text-right">
              שינוי תקציב <span className="font-medium text-slate-700 dark:text-slate-300">{category.name}</span> ל-{new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(pendingAmount)}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => saveMonthOnly(pendingAmount)}
                disabled={isPending}
                className="w-full px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-sm font-medium text-right hover:bg-indigo-100 transition-colors"
              >
                <p className="font-semibold">החל על חודש זה בלבד</p>
                <p className="text-xs opacity-70 mt-0.5">מהחודש הבא התקציב יחזור לסכום הקבוע</p>
              </button>
              <button
                onClick={() => saveTemplate(pendingAmount)}
                disabled={isPending}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 text-sm font-medium text-right hover:bg-slate-100 transition-colors"
              >
                <p className="font-semibold">החל מעכשיו והלאה</p>
                <p className="text-xs opacity-70 mt-0.5">מעדכן את התקציב הקבוע לכל החודשים הבאים</p>
              </button>
              <button
                onClick={() => { setShowScopeModal(false); setPendingAmount(null) }}
                className="text-sm text-slate-400 hover:text-slate-600 py-2"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
