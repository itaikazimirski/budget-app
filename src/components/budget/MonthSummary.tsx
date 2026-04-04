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
        {/* Income card — clickable */}
        <button
          onClick={() => setIncomeOpen(true)}
          className="bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800/50 shadow-sm text-right hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-emerald-100 dark:bg-emerald-900/60 rounded-lg p-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">הכנסות</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{formatILS(totalIncome)}</p>
          <p className="text-xs text-slate-400 mt-1">תוכנן: {formatILS(plannedIncome)}</p>
        </button>

        {/* Expenses card */}
        <div className="bg-violet-50 dark:bg-violet-950/40 rounded-2xl p-4 border border-violet-200 dark:border-violet-800/50 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-violet-100 dark:bg-violet-900/60 rounded-lg p-1.5">
              <TrendingDown className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-sm text-violet-700 dark:text-violet-400 font-medium">הוצאות</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{formatILS(totalExpenses)}</p>
          <p className="text-xs text-slate-400 mt-1">תוכנן: {formatILS(plannedExpenses)}</p>
        </div>

        {/* Balance card */}
        <div className="bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl p-4 border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/60 rounded-lg p-1.5">
              <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">תזרים</span>
          </div>
          <p className={`text-xl font-bold ${balance >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatILS(balance)}
          </p>
          <p className="text-xs text-slate-400 mt-1">תוכנן: {formatILS(plannedBalance)}</p>
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
