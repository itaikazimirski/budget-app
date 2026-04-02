'use client'

import { useState, useTransition } from 'react'
import { Edit2 } from 'lucide-react'
import type { CategoryWithStats, Transaction } from '@/lib/types'
import { updateMonthBudget } from '@/app/actions/categories'
import { formatILS } from '@/lib/budget-utils'
import TransactionPopup from './TransactionPopup'

interface HouseholdCardCompactProps {
  category: CategoryWithStats
  accountId: string
  year: number
  month: number
  transactions?: Transaction[]
}

export default function HouseholdCardCompact({ category, accountId, year, month, transactions }: HouseholdCardCompactProps) {
  const [editing, setEditing] = useState(false)
  const [budgetInput, setBudgetInput] = useState(String(category.budget_amount))
  const [showTxPopup, setShowTxPopup] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { actual_amount, budget_amount, percentage, remaining } = category
  const isOver = actual_amount > budget_amount && budget_amount > 0
  const catTransactions = (transactions ?? []).filter((tx) => tx.category_id === category.id)

  const barColor = isOver ? 'bg-rose-400' : percentage > 80 ? 'bg-amber-400' : 'bg-indigo-400'

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
      <div
        className={`relative bg-slate-50 dark:bg-white/[0.04] rounded-xl border px-3 py-2.5 flex flex-col gap-1.5 transition-all group
          ${isOver ? 'border-rose-200 dark:border-rose-900/40' : 'border-slate-200 dark:border-white/[0.06]'}
          ${catTransactions.length > 0 ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.07]' : ''}
        `}
        onClick={() => catTransactions.length > 0 && setShowTxPopup(true)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setBudgetInput(String(budget_amount)); setEditing(true) }}
          className="absolute top-1.5 left-1.5 p-1 text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity rounded"
        >
          <Edit2 className="w-2.5 h-2.5" />
        </button>

        <div className="flex items-center gap-1.5 text-right">
          <span className="text-base">{category.icon ?? '📦'}</span>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">{category.name}</span>
        </div>

        <span className={`text-sm font-bold text-right ${isOver ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>
          {formatILS(actual_amount)}
        </span>

        {budget_amount > 0 ? (
          <div className="h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
          </div>
        ) : (
          <div
            onClick={(e) => { e.stopPropagation(); setBudgetInput('0'); setEditing(true) }}
            className="text-xs text-indigo-400 hover:text-indigo-600 cursor-pointer text-right leading-none"
          >
            + תקציב
          </div>
        )}

        {editing && (
          <div
            className="absolute inset-0 bg-white dark:bg-card rounded-xl flex flex-col items-center justify-center gap-2 p-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{category.icon} {category.name}</p>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-xs">₪</span>
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-16 text-center text-sm border border-indigo-300 rounded-lg px-1.5 py-1 focus:outline-none focus:border-indigo-500"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBudget(); if (e.key === 'Escape') setEditing(false) }}
              />
            </div>
            <div className="flex gap-1.5">
              <button onClick={handleSaveBudget} disabled={isPending} className="px-2.5 py-1 bg-indigo-600 text-white text-xs rounded-lg">
                {isPending ? '...' : 'שמור'}
              </button>
              <button onClick={() => setEditing(false)} className="px-2 py-1 text-slate-400 text-xs">ביטול</button>
            </div>
          </div>
        )}
      </div>

      {showTxPopup && (
        <TransactionPopup
          title={`${category.icon} ${category.name}`}
          totalAmount={actual_amount}
          transactions={catTransactions}
          onClose={() => setShowTxPopup(false)}
        />
      )}
    </>
  )
}
