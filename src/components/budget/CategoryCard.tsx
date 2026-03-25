'use client'

import { useState, useTransition } from 'react'
import type { CategoryWithStats } from '@/lib/types'
import { updateMonthBudget } from '@/app/actions/categories'
import { Edit2, Check, X } from 'lucide-react'

interface CategoryCardProps {
  category: CategoryWithStats
  accountId: string
  year: number
  month: number
}

function formatILS(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

export default function CategoryCard({ category, accountId, year, month }: CategoryCardProps) {
  const [editing, setEditing] = useState(false)
  const [budgetInput, setBudgetInput] = useState(String(category.budget_amount))
  const [isPending, startTransition] = useTransition()

  const { actual_amount, budget_amount, percentage, type } = category
  const isOver = actual_amount > budget_amount && budget_amount > 0
  const barColor = type === 'income'
    ? (percentage >= 100 ? 'bg-emerald-500' : 'bg-emerald-400')
    : (isOver ? 'bg-rose-500' : percentage > 80 ? 'bg-amber-400' : 'bg-indigo-400')

  function handleSave() {
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
    <div className="px-4 py-3 hover:bg-slate-50 transition-colors group">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
          <span className="text-sm font-medium text-slate-800 truncate">{category.name}</span>
          {isOver && (
            <span className="text-xs bg-rose-100 text-rose-600 rounded px-1.5 py-0.5 shrink-0">חריגה!</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-slate-800">{formatILS(actual_amount)}</span>
          {!editing ? (
            <button
              onClick={() => { setBudgetInput(String(budget_amount)); setEditing(true) }}
              className="p-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
              />
              <button onClick={handleSave} disabled={isPending} className="p-1 text-emerald-500 hover:text-emerald-600">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditing(false)} className="p-1 text-slate-400 hover:text-slate-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {budget_amount > 0 ? (
        <div className="space-y-1">
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>{Math.round(percentage)}%</span>
            <span className={isOver ? 'text-rose-500' : ''}>
              {isOver
                ? `${formatILS(Math.abs(category.remaining))} חריגה`
                : `${formatILS(category.remaining)} נותר`} מתוך {formatILS(budget_amount)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-300">אין תקציב מוגדר — לחץ ✏️ להגדרה לחודש זה</p>
      )}
    </div>
  )
}
