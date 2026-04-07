'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Wallet, X, Plus } from 'lucide-react'
import type { MonthlyStats } from '@/lib/types'
import CategoryCard from './CategoryCard'
import AddCategoryDialog from './AddCategoryDialog'

function formatILS(amount: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

interface MonthSummaryProps {
  stats: MonthlyStats
  accountId: string
  year: number
  month: number
}

export default function MonthSummary({ stats, accountId, year, month }: MonthSummaryProps) {
  const { totalIncome, totalExpenses, balance, incomeCategories, expenseCategories } = stats
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const plannedIncome = incomeCategories.reduce((s, c) => s + c.budget_amount, 0)
  const plannedExpenses = expenseCategories.reduce((s, c) => s + c.budget_amount, 0)
  const plannedBalance = plannedIncome - plannedExpenses

  return (
    <>
      <div className="grid grid-cols-3 gap-3">

        {/* ── הכנסות ── */}
        <button
          onClick={() => setIncomeOpen(true)}
          className="bg-white dark:bg-card rounded-2xl border border-emerald-600/50 dark:border-emerald-500/50 border-t-4 border-t-emerald-500 shadow-sm overflow-hidden text-right hover:shadow-md transition-all"
        >
          {/* Header bar */}
          <div className="w-full py-3 px-4 flex justify-center items-center gap-2 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
            <TrendingUp className="w-4 h-4 text-slate-700 dark:text-white shrink-0" />
            <span className="text-base font-semibold text-slate-900 dark:text-white">הכנסות</span>
          </div>
          {/* Body */}
          <div className="flex flex-col gap-2 p-3 md:p-4 md:gap-3">
            <div className="flex flex-col items-center gap-0.5 md:flex-row md:justify-center md:items-baseline md:gap-x-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 md:text-sm">תכנון</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white md:text-2xl">{formatILS(plannedIncome)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 md:flex-row md:justify-center md:items-baseline md:gap-x-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 md:text-sm">בפועל</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 md:text-xl">{formatILS(totalIncome)}</span>
            </div>
          </div>
        </button>

        {/* ── הוצאות ── */}
        <div className="bg-white dark:bg-card rounded-2xl border border-rose-600/50 dark:border-rose-500/50 border-t-4 border-t-rose-500 shadow-sm overflow-hidden">
          {/* Header bar */}
          <div className="w-full py-3 px-4 flex justify-center items-center gap-2 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
            <TrendingDown className="w-4 h-4 text-slate-700 dark:text-white shrink-0" />
            <span className="text-base font-semibold text-slate-900 dark:text-white">הוצאות</span>
          </div>
          {/* Body */}
          <div className="flex flex-col gap-2 p-3 md:p-4 md:gap-3">
            <div className="flex flex-col items-center gap-0.5 md:flex-row md:justify-center md:items-baseline md:gap-x-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 md:text-sm">תכנון</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white md:text-2xl">{formatILS(plannedExpenses)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 md:flex-row md:justify-center md:items-baseline md:gap-x-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 md:text-sm">בפועל</span>
              <span className="text-base font-bold text-rose-600 dark:text-rose-400 md:text-xl">{formatILS(totalExpenses)}</span>
            </div>
          </div>
        </div>

        {/* ── תזרים ── */}
        <div className="bg-white dark:bg-card rounded-2xl border border-amber-600/60 dark:border-amber-500/60 border-t-4 border-t-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)] overflow-hidden">
          {/* Header bar */}
          <div className="w-full py-3 px-4 flex justify-center items-center gap-2 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
            <Wallet className="w-4 h-4 text-slate-700 dark:text-white shrink-0" />
            <span className="text-base font-semibold text-slate-900 dark:text-white">תזרים</span>
          </div>
          {/* Body */}
          <div className="flex flex-col gap-2 p-3 md:p-4 md:gap-3">
            <div className="flex flex-col items-center gap-0.5 md:flex-row md:justify-center md:items-baseline md:gap-x-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 md:text-sm">תכנון</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white md:text-2xl">{formatILS(plannedBalance)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 md:flex-row md:justify-center md:items-baseline md:gap-x-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 md:text-sm">בפועל</span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400 md:text-xl">{formatILS(balance)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Income popup */}
      {incomeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIncomeOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-base">הכנסות</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  בפועל: {formatILS(totalIncome)} · תוכנן: {formatILS(plannedIncome)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAdd(true)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="הוסף קטגוריית הכנסה"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => setIncomeOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {incomeCategories.length === 0 ? (
                <div className="px-5 py-10 text-center text-slate-400 text-sm">
                  <p>אין קטגוריות הכנסה עדיין.</p>
                  <button onClick={() => setShowAdd(true)} className="mt-2 text-indigo-500 hover:underline text-xs">
                    הוסף אחת ←
                  </button>
                </div>
              ) : (
                incomeCategories.map((cat) => (
                  <CategoryCard key={cat.id} category={cat} accountId={accountId} year={year} month={month} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <AddCategoryDialog type="income" accountId={accountId} year={year} month={month} onClose={() => setShowAdd(false)} />
      )}
    </>
  )
}
