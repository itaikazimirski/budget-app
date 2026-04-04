'use client'

import { useState, useTransition } from 'react'
import type { CategoryWithStats } from '@/lib/types'
import { updateMonthBudget } from '@/app/actions/categories'
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
  const [isPending, startTransition] = useTransition()

  const { actual_amount, budget_amount, percentage, type } = category
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
    startTransition(async () => {
      const fd = new FormData()
      fd.set('accountId', accountId)
      fd.set('categoryId', category.id)
      fd.set('year', String(year))
      fd.set('month', String(month))
      fd.set('monthlyAmount', String(amount))
      await updateMonthBudget(fd)
      setEditing(false)
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
    </>
  )
}
