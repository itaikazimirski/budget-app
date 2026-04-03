'use client'

import { useState, useTransition } from 'react'
import { Edit2 } from 'lucide-react'
import type { CategoryWithStats, Transaction } from '@/lib/types'
import { updateMonthBudget } from '@/app/actions/categories'
import { formatILS } from '@/lib/budget-utils'
import TransactionPopup from './TransactionPopup'

interface HouseholdRentCardProps {
  category: CategoryWithStats
  accountId: string
  year: number
  month: number
  transactions?: Transaction[]
}

export default function HouseholdRentCard({ category, accountId, year, month, transactions }: HouseholdRentCardProps) {
  const [editing, setEditing] = useState(false)
  const [budgetInput, setBudgetInput] = useState(String(category.budget_amount))
  const [showTxPopup, setShowTxPopup] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { actual_amount, budget_amount, percentage } = category
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
        className={`relative w-36 shrink-0 rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all group
          bg-indigo-50 dark:bg-indigo-950/30
          ${isOver ? 'border-rose-200 dark:border-rose-900/50' : 'border-indigo-200 dark:border-indigo-800/50'}
          ${catTransactions.length > 0 ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}
        `}
        onClick={() => catTransactions.length > 0 && !editing && setShowTxPopup(true)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setBudgetInput(String(budget_amount)); setEditing(true) }}
          className="absolute top-2 left-2 p-1 text-indigo-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
        >
          <Edit2 className="w-3 h-3" />
        </button>

        <div className="text-right">
          <span className="text-3xl">{category.icon ?? '🏠'}</span>
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mt-2 leading-tight">
            {category.name}
          </p>
        </div>

        <div className="text-right">
          <p className={`text-xl font-bold ${isOver ? 'text-rose-600' : 'text-indigo-900 dark:text-white'}`}>
            {formatILS(actual_amount)}
          </p>
          {budget_amount > 0 && (
            <p className="text-xs text-indigo-400 mt-0.5">{formatILS(budget_amount)}</p>
          )}
        </div>

        {budget_amount > 0 ? (
          <div className="space-y-1">
            <div className="h-1.5 bg-indigo-100 dark:bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
            </div>
            <p className="text-xs text-indigo-400 text-left">{Math.round(percentage)}%</p>
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
            className="absolute inset-0 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl flex flex-col items-center justify-center gap-2 p-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{category.icon} {category.name}</p>
            <div className="flex items-center gap-1">
              <span className="text-indigo-400 text-xs">₪</span>
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-16 text-center text-sm border border-indigo-300 rounded-lg px-1.5 py-1 focus:outline-none focus:border-indigo-500 bg-white dark:bg-indigo-900"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBudget(); if (e.key === 'Escape') setEditing(false) }}
              />
            </div>
            <div className="flex gap-1.5">
              <button onClick={handleSaveBudget} disabled={isPending} className="px-2.5 py-1 bg-indigo-600 text-white text-xs rounded-lg">
                {isPending ? '...' : 'שמור'}
              </button>
              <button onClick={() => setEditing(false)} className="px-2 py-1 text-indigo-400 text-xs">ביטול</button>
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
