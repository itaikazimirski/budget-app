'use client'

import { useState } from 'react'
import { Edit2 } from 'lucide-react'
import type { CategoryWithStats, Transaction } from '@/lib/types'
import { formatILS } from '@/lib/budget-utils'
import { useHouseholdBudget } from '@/hooks/useHouseholdBudget'
import TransactionPopup from './TransactionPopup'

interface HouseholdCardFullProps {
  category: CategoryWithStats
  accountId: string
  year: number
  month: number
  transactions?: Transaction[]
}

export default function HouseholdCardFull({ category, accountId, year, month, transactions }: HouseholdCardFullProps) {
  const [showTxPopup, setShowTxPopup] = useState(false)
  const { editing, budgetInput, setBudgetInput, isPending, startEditing, cancelEditing, handleSaveBudget } =
    useHouseholdBudget(category, accountId, year, month)

  const { actual_amount, budget_amount, percentage, remaining } = category
  const isOver = actual_amount > budget_amount && budget_amount > 0
  const catTransactions = (transactions ?? []).filter((tx) => tx.category_id === category.id)
  const barColor = isOver ? 'bg-rose-400' : percentage > 80 ? 'bg-amber-400' : 'bg-indigo-400'

  return (
    <>
      <div
        className={`relative bg-white dark:bg-card rounded-2xl border p-4 flex flex-col gap-3 transition-all group
          ${isOver ? 'border-rose-200 dark:border-rose-900/50' : 'border-slate-200 dark:border-white/[0.08]'}
          ${catTransactions.length > 0 ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}
        `}
        onClick={() => catTransactions.length > 0 && setShowTxPopup(true)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); startEditing(budget_amount) }}
          className="absolute top-2 left-2 p-1.5 text-slate-300 hover:text-indigo-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity rounded-lg hover:bg-indigo-50"
        >
          <Edit2 className="w-3 h-3" />
        </button>

        <div className="text-right">
          <span className="text-3xl">{category.icon ?? '📦'}</span>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1">{category.name}</p>
        </div>

        <div className="text-right">
          <p className={`text-xl font-bold ${isOver ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
            {formatILS(actual_amount)}
          </p>
          {budget_amount > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {isOver
                ? <span className="text-rose-500">{formatILS(Math.abs(remaining))} חריגה</span>
                : <span>{formatILS(remaining)} נותר</span>}
            </p>
          )}
        </div>

        {budget_amount > 0 ? (
          <div className="space-y-1">
            <div className="h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{Math.round(percentage)}%</span>
              <span>{formatILS(budget_amount)}</span>
            </div>
          </div>
        ) : (
          <div
            onClick={(e) => { e.stopPropagation(); startEditing(0) }}
            className="text-xs text-indigo-400 hover:text-indigo-600 cursor-pointer text-right"
          >
            + הגדר תקציב
          </div>
        )}

        {editing && (
          <div
            className="absolute inset-0 bg-white dark:bg-card rounded-2xl flex flex-col items-center justify-center gap-3 p-4 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{category.icon} {category.name}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-sm">₪</span>
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-24 text-center text-lg border border-indigo-300 rounded-xl px-2 py-1.5 focus:outline-none focus:border-indigo-500"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBudget(); if (e.key === 'Escape') cancelEditing() }}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveBudget} disabled={isPending} className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700">
                {isPending ? '...' : 'שמור'}
              </button>
              <button onClick={cancelEditing} className="px-3 py-1.5 text-slate-400 text-sm">ביטול</button>
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
