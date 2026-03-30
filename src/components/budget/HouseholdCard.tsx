'use client'

import { useState, useTransition } from 'react'
import { X, Edit2 } from 'lucide-react'
import type { CategoryWithStats, Transaction } from '@/lib/types'
import { updateMonthBudget } from '@/app/actions/categories'

interface HouseholdCardProps {
  category: CategoryWithStats
  accountId: string
  year: number
  month: number
  transactions?: Transaction[]
  compact?: boolean
}

function formatILS(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: 'short' })
}

export default function HouseholdCard({ category, accountId, year, month, transactions, compact = false }: HouseholdCardProps) {
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

  if (compact) {
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

          <div className="text-right">
            <span className={`text-sm font-bold ${isOver ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>
              {formatILS(actual_amount)}
            </span>
          </div>

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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowTxPopup(false)}>
            <div className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="text-right">
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">{category.icon} {category.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">סה"כ: {formatILS(actual_amount)}</p>
                </div>
                <button onClick={() => setShowTxPopup(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-3 space-y-2">
                {catTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between bg-slate-50 dark:bg-secondary rounded-xl px-4 py-3 gap-3">
                    <span className="text-xs text-slate-400 shrink-0">{formatDate(tx.date)}</span>
                    <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 text-right truncate">{tx.notes ?? '—'}</span>
                    <span className="font-semibold text-sm shrink-0 text-slate-800 dark:text-white">{formatILS(tx.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // Full size card
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
          onClick={(e) => { e.stopPropagation(); setBudgetInput(String(budget_amount)); setEditing(true) }}
          className="absolute top-2 left-2 p-1.5 text-slate-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-indigo-50"
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
            onClick={(e) => { e.stopPropagation(); setBudgetInput('0'); setEditing(true) }}
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
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBudget(); if (e.key === 'Escape') setEditing(false) }}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveBudget} disabled={isPending} className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700">
                {isPending ? '...' : 'שמור'}
              </button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-slate-400 hover:text-slate-600 text-sm">ביטול</button>
            </div>
          </div>
        )}
      </div>

      {showTxPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowTxPopup(false)}>
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-md max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="text-right">
                <h2 className="font-bold text-slate-900 dark:text-white text-base">{category.icon} {category.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">סה"כ: {formatILS(actual_amount)}</p>
              </div>
              <button onClick={() => setShowTxPopup(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 space-y-2">
              {catTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between bg-slate-50 dark:bg-secondary rounded-xl px-4 py-3 gap-3">
                  <span className="text-xs text-slate-400 shrink-0">{formatDate(tx.date)}</span>
                  <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 text-right truncate">{tx.notes ?? '—'}</span>
                  <span className="font-semibold text-sm shrink-0 text-slate-800 dark:text-white">{formatILS(tx.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
